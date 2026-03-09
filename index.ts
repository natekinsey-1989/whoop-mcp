import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import express from "express";
import { createWhoopMcpServer } from "./src/server";


const app = express();
app.use(express.json());

let storedAccessToken: string | null = process.env.WHOOP_ACCESS_TOKEN || null;
let storedRefreshToken: string | null = process.env.WHOOP_REFRESH_TOKEN || null;
let tokenExpiresAt: number = 0;

export function getStoredToken(): { accessToken: string; expiresAt: number } | null {
  if (!storedAccessToken) return null;
  return { accessToken: storedAccessToken, expiresAt: tokenExpiresAt };
}

export async function refreshAccessToken(): Promise<string | null> {
  if (!storedRefreshToken) return null;
  const clientId = process.env.WHOOP_CLIENT_ID!;
  const clientSecret = process.env.WHOOP_CLIENT_SECRET!;

  const response = await fetch("https://api.prod.whoop.com/oauth/oauth2/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: storedRefreshToken,
      client_id: clientId,
      client_secret: clientSecret,
    }),
  });

  if (!response.ok) return null;
  const data = await response.json();
  storedAccessToken = data.access_token;
  storedRefreshToken = data.refresh_token;
  tokenExpiresAt = Date.now() + data.expires_in * 1000;
  return storedAccessToken;
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
      <p><strong>Error:</strong> ${error}</p>
      <p><strong>Description:</strong> ${req.query.error_description || "Unknown error"}</p>
      <p><a href="/auth">Try again</a></p>
    `);
  }

  if (!code) {
    return res.status(400).send(`
      <h1>Missing Authorization Code</h1>
      <p>No authorization code was received from Whoop.</p>
      <p><a href="/auth">Try again</a></p>
    `);
  }

  const clientId = process.env.WHOOP_CLIENT_ID!;
  const clientSecret = process.env.WHOOP_CLIENT_SECRET!;
  const redirectUri = `https://whoop-mcp-production-04c1.up.railway.app/callback`;

  try {
    const response = await fetch("https://api.prod.whoop.com/oauth/oauth2/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
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
    storedRefreshToken = data.refresh_token;
    tokenExpiresAt = Date.now() + data.expires_in * 1000;

    res.send(`
      <h1>Whoop Connected Successfully!</h1>
      <p>Your access token is stored and the MCP server is ready.</p>
      <hr/>
      <p><strong>Save this to Railway as WHOOP_REFRESH_TOKEN:</strong></p>
      <code style="word-break:break-all;background:#f0f0f0;padding:10px;display:block;margin:10px 0;">${storedRefreshToken}</code>
      <hr/>
      <p>You can now close this window and use Claude to pull your Whoop data.</p>
    `);
  } catch (err) {
    res.status(500).send(`
      <h1>Server Error</h1>
      <p>${err}</p>
      <p><a href="/auth">Try again</a></p>
    `);
  }
});

app.post("/mcp", async (req, res) => {
  const mcpAuthToken =
    (req.query.mcpAuthToken as string) || process.env.MCP_AUTH_TOKEN;

  if (mcpAuthToken) {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: "Unauthorized", message: "Authorization header is required" });
    }
    const [scheme, token] = authHeader.split(" ");
    if (scheme !== "Bearer" || !token) {
      return res.status(401).json({ error: "Unauthorized", message: "Invalid authorization format" });
    }
    if (token !== mcpAuthToken) {
      return res.status(401).json({ error: "Unauthorized", message: "Invalid authentication token" });
    }
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
  console.log(`\nConfiguration: OAuth via environment variables`);
  console.log(`  - WHOOP_CLIENT_ID: Required`);
  console.log(`  - WHOOP_CLIENT_SECRET: Required`);
  console.log(`  - WHOOP_REFRESH_TOKEN: Optional (set after first auth)`);
  console.log(`  - MCP_AUTH_TOKEN: Optional`);
  console.log(`\nTo authorize: visit https://whoop-mcp-production-04c1.up.railway.app/auth`);
}).on("error", (error) => {
  console.error("Server error:", error);
  process.exit(1);
});
