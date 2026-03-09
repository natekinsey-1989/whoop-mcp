import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import express from "express";
import { createWhoopMcpServer } from "./src/server";

const app = express();
app.use(express.json());

app.post("/mcp", async (req, res) => {
  const mcpAuthToken =
    (req.query.mcpAuthToken as string) || process.env.MCP_AUTH_TOKEN;

  // Optional authentication check
  if (mcpAuthToken) {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({
        error: "Unauthorized",
        message: "Authorization header is required",
      });
    }
    const [scheme, token] = authHeader.split(" ");
    if (scheme !== "Bearer" || !token) {
      return res.status(401).json({
        error: "Unauthorized",
        message: "Invalid authorization format. Use 'Bearer <token>'",
      });
    }
    if (token !== mcpAuthToken) {
      return res.status(401).json({
        error: "Unauthorized",
        message: "Invalid authentication token",
      });
    }
  }

  const server = createWhoopMcpServer({});
  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
    enableJsonResponse: true,
  });

  res.on("close", () => {
    transport.close();
  });

  await server.connect(transport);
  await transport.handleRequest(req, res, req.body);
});

const port = parseInt(process.env.PORT || "8080");
app
  .listen(port, () => {
    console.log(`Whoop MCP Server running on http://localhost:${port}/mcp`);
    console.log(`\nConfiguration: OAuth via environment variables`);
    console.log(`  - WHOOP_CLIENT_ID: Required`);
    console.log(`  - WHOOP_CLIENT_SECRET: Required`);
    console.log(`  - MCP_AUTH_TOKEN: Optional`);
    console.log(`\nAvailable tools:`);
    console.log(`  - whoop_get_overview`);
    console.log(`  - whoop_get_sleep`);
    console.log(`  - whoop_get_recovery`);
    console.log(`  - whoop_get_strain`);
    console.log(`  - whoop_get_healthspan`);
  })
  .on("error", (error) => {
    console.error("Server error:", error);
    process.exit(1);
  });
