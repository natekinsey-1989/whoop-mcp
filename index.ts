import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import express from "express";
import { createWhoopMcpServer } from "./src/server";

const app = express();
app.use(express.json());

// In-memory token storage (persists as long as the server is running)
let storedAccessToken: string | null = process.env.WHOOP_ACCESS_TOKEN || null;
let storedRefreshToken: string | null = process.env.WHOOP_REFRESH_TOKEN || null;
let tokenExpiresAt: number = 0;

// Export token getter for whoop-client to use
export function getStoredToken(): { accessToken: string; expiresAt: number } | null {
  if (!storedAccessToken) return null;
  return { accessToken: storedAccessToken, expiresAt: tokenExpiresAt };
}

export async function refreshAccessToken(): Promise<string | null> {
  if (!storedRefreshToken) return null;
  const clientId = process.env.WHOOP_CLIENT_ID!;
  const clientSecret = process.env.WHOOP_CLIENT_SECRET!;
  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");

  const response = await fetch("https://api.prod.whoop.com/oauth/oauth2/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "Authorization": `Basic ${credentials}`,
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: storedRefreshToken,
    }),
  });

  if (!response.ok) return null;
  const data = await response.json();
  storedAccessToken = data.access_token;
  storedRefreshToken = data.refresh_token;
  tokenExpiresAt = Date.now() + data.expires_in * 1000;
  return storedAccessToken;
}

// OAuth callback endpoint
app.get("/callback", async (req, res) => {
  const code = req.query.code as string;
  if (!code) {
    return res.status(400).send("Missing authorization code");
  }

  const clientId = process.env.WHOOP_CLIENT_ID!;
  const clientSecret = process.env.WHOOP_CLIENT_SECRET!;
  const redirectUri = `https://whoop-mcp-production-04c1.up.railway.app/callback`;
  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");

  const response = await fetch("https://api.prod.whoop.com/oauth/oauth2/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "Authorization": `Basic ${credentials}`,
    },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    return res.status(400).send(`Token exchange failed: ${error}`);
  }

  const data = await response.json();
  storedAccessToken = data.access_token;
  storedRefreshToken = data.refresh_token;
  tokenExpiresAt = Date.now() + data.expires_in * 1000;

  res.send(`
    <h1>✅ Whoop Connected Successfully!</h1>
    <p>Your access token has been stored. You can now close this window.</p>
    <p><strong>Refresh Token (save this to Railway as WHOOP_REFRESH_TOKEN):</strong></p>
    <code>${storedRefreshToken}</code>
  `);
});

// Auth URL helper
app.get("/auth", (req, res) => {
  const clientId = process.env.WHOOP_CLIENT_ID!;
  const redirectUri = `https://whoop-mcp-production-04c1.up.railway.app/callback`;
  const scope = "read:recovery read:cycles read:sleep read:workout read:profile read:body_measurement";
  const authUrl = `https://api.prod.whoop.com/oauth/oauth2/auth?response_type=code&client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent(scope)}`;
  res.redirect(authUrl);
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
