import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import express from "express";
import { createWhoopMcpServer } from "./src/server";
import { saveTokenToFile } from "./src/whoop-client";

const app = express();
app.use(express.json());

let storedAccessToken: string | null = process.env.WHOOP_ACCESS_TOKEN || null;
let tokenExpiresAt: number = Date.now() + 3600 * 1000;

if (storedAccessToken) {
  saveTokenToFile(storedAccessToken, tokenExpiresAt);
}

async function saveTokenToRailway(accessToken: string): Promise<void> {
  const railwayToken = process.env.RAILWAY_TOKEN;
  const serviceId = process.env.RAILWAY_SERVICE_ID;
  const environmentId = process.env.RAILWAY_ENVIRONMENT_ID;

  if (!railwayToken || !serviceId || !environmentId) return;

  const mutation = `
    mutation VariableUpsert($input: VariableUpsertInput!) {
      variableUpsert(input: $input)
    }
  `;

  try {
    const response = await fetch("https://backboard.railway.app/graphql/v2", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${railwayToken}`,
      },
      body: JSON.stringify({
        query: mutation,
        variables: {
          input: {
            serviceId,
            environmentId,
            name: "WHOOP_ACCESS_TOKEN",
            value: accessToken,
          },
        },
      }),
    });
    const data = await response.json();
    if (data.errors) {
      console.error("Railway API error:", JSON.stringify(data.errors));
    } else {
      console.log("WHOOP_ACCESS_TOKEN saved to Railway successfully");
    }
  } catch (err) {
    console.error("Failed to save token to Railway:", err);
  }
}

app.get("/auth", (req, res) => {
  const clientId = process.env.WHOOP_CLIENT_ID!;
  const redirectUri = `https://whoop-mcp-production-04c1.up.railway.app/callback`;
  const scope = "read:recovery read:cycles read:sleep read:workout read:profile read:body_measurement";
  const state = Math.random().toString(36).substring(2, 12);
  const authUrl = `https://api.prod.whoop.com/oauth/oauth2/auth?response_type=code&client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent(scope)}&state=${state}`;
  res.redirect(authUrl);
});

app.get("/callback", async (req, res) => {
  const code = req.query.code as string;
  const error = req.query.error as string;

  if (error) {
    return res.status(400).send(`
      <h1>Authorization Error</h1>
      <p>${error}: ${req.query.error_description || "Unknown error"}</p>
      <p><a href="/auth">Try again</a></p>
    `);
  }

  if (!code) {
    return res.status(400).send(`
      <h1>Missing Authorization Code</h1>
      <p><a href="/auth">Try again</a></p>
    `);
  }

  const clientId = process.env.WHOOP_CLIENT_ID!;
  const clientSecret = process.env.WHOOP_CLIENT_SECRET!;
  const redirectUri = `https://whoop-mcp-production-04c1.up.railway.app/callback`;

  try {
    const response = await fetch("https://api.prod.whoop.com/oauth/oauth2/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        redirect_uri: redirectUri,
        client_id: clientId,
        client_secret: clientSecret,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return res.status(400).send(`
        <h1>Token Exchange Failed</h1>
        <p>${response.status}: ${errorText}</p>
        <p><a href="/auth">Try again</a></p>
      `);
    }

    const data = await response.json();
    storedAccessToken = data.access_token;
    tokenExpiresAt = Date.now() + data.expires_in * 1000;

    saveTokenToFile(storedAccessToken!, tokenExpiresAt);
    await saveTokenToRailway(storedAccessToken!);

    res.send(`
      <h1>Whoop Connected Successfully!</h1>
      <p>Token saved to file and Railway. Claude can now pull your Whoop data.</p>
      <p>Token expires in 1 hour. Visit <a href="/auth">/auth</a> to refresh.</p>
    `);
  } catch (err) {
    res.status(500).send(`<h1>Server Error</h1><p>${err}</p><p><a href="/auth">Try again</a></p>`);
  }
});

app.post("/mcp", async (req, res) => {
  const mcpAuthToken = (req.query.mcpAuthToken as string) || process.env.MCP_AUTH_TOKEN;

  if (mcpAuthToken) {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: "Unauthorized", message: "Authorization header is required" });
    const [scheme, token] = authHeader.split(" ");
    if (scheme !== "Bearer" || !token) return res.status(401).json({ error: "Unauthorized", message: "Invalid authorization format" });
    if (token !== mcpAuthToken) return res.status(401).json({ error: "Unauthorized", message: "Invalid authentication token" });
  }

  const server = createWhoopMcpServer({});
  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
    enableJsonResponse: true,
  });

  res.on("close", () => { transport.close(); });
  await server.connect(transport);
  await transport.handleRequest(req, res, req.body);
});

const port = parseInt(process.env.PORT || "8080");
app.listen(port, () => {
  console.log(`Whoop MCP Server running on http://localhost:${port}/mcp`);
  console.log(`\nTo authorize: visit https://whoop-mcp-production-04c1.up.railway.app/auth`);
}).on("error", (error) => {
  console.error("Server error:", error);
  process.exit(1);
});
