import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { WhoopClient } from "../whoop-client";

export function registerHealthspanTools(server: McpServer, whoopClient: WhoopClient) {
  server.registerTool(
    "whoop_get_healthspan",
    {
      title: "Get Whoop Profile & Body Metrics",
      description: "Get user profile (name, email) and body measurements (height, weight, max heart rate)",
      inputSchema: {},
      outputSchema: {
        user_id: z.number(),
        first_name: z.string(),
        last_name: z.string(),
        email: z.string(),
        height_meter: z.number().nullable(),
        weight_kilogram: z.number().nullable(),
        max_heart_rate: z.number().nullable(),
      },
    },
    async () => {
      try {
        const [profile, body] = await Promise.all([
          whoopClient.getUserProfile(),
          whoopClient.getUserBodyMeasurements(),
        ]);

        const output = {
          user_id: profile.user_id,
          first_name: profile.first_name,
          last_name: profile.last_name,
          email: profile.email,
          height_meter: body.height_meter ?? null,
          weight_kilogram: body.weight_kilogram ?? null,
          max_heart_rate: body.max_heart_rate ?? null,
        };

        const lines = [
          "👤 WHOOP PROFILE",
          "═════════════════",
          "",
          `  Name: ${output.first_name} ${output.last_name}`,
          `  Email: ${output.email}`,
          `  User ID: ${output.user_id}`,
          "",
          "📏 BODY MEASUREMENTS",
          "─────────────────────",
          `  Height: ${output.height_meter ? (output.height_meter * 100).toFixed(0) + " cm" : "N/A"}`,
          `  Weight: ${output.weight_kilogram ? output.weight_kilogram.toFixed(1) + " kg" : "N/A"}`,
          `  Max HR: ${output.max_heart_rate ?? "N/A"} bpm`,
        ];

        return {
          content: [{ type: "text", text: lines.join("\n") }],
          structuredContent: output,
        };
      } catch (error) {
        const msg = error instanceof Error ? error.message : "Unknown error";
        return { content: [{ type: "text", text: `Error fetching profile data: ${msg}` }], isError: true };
      }
    }
  );
}
