import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { WhoopClient } from "../whoop-client";

export function registerRecoveryTools(server: McpServer, whoopClient: WhoopClient) {
    server.registerTool(
          "whoop_get_recovery",
      {
              title: "Get Whoop Recovery",
              description: "Get detailed recovery data: score, HRV, RHR, SpO2, skin temperature",
              inputSchema: {},
              outputSchema: {
                        records: z.array(z.object({
                                    cycle_id: z.number(),
                                    recovery_score: z.number().nullable(),
                                    resting_heart_rate: z.number().nullable(),
                                    hrv_rmssd_milli: z.number().nullable(),
                                    spo2_percentage: z.number().nullable(),
                                    skin_temp_celsius: z.number().nullable(),
                                    score_state: z.string(),
                                    created_at: z.string(),
                        })),
              },
      },
          async () => {
                  try {
                            const data = await whoopClient.getLatestRecovery();
                            const records = (data.records ?? []).map((r: any) => ({
                                        cycle_id: r.cycle_id,
                                        recovery_score: r.score?.recovery_score ?? null,
                                        resting_heart_rate: r.score?.resting_heart_rate ?? null,
                                        hrv_rmssd_milli: r.score?.hrv_rmssd_milli ?? null,
                                        spo2_percentage: r.score?.spo2_percentage ?? null,
                                        skin_temp_celsius: r.score?.skin_temp_celsius ?? null,
                                        score_state: r.score_state,
                                        created_at: r.created_at,
                            }));
                            const r = records[0];
                            const lines = [
                                        "WHOOP RECOVERY", "==================", "",
                                        r ? [
                                                      `Date: ${r.created_at?.split("T")[0]}`,
                                                      `  Recovery Score: ${r.recovery_score ?? "N/A"}%`,
                                                      `  HRV (RMSSD): ${r.hrv_rmssd_milli?.toFixed(1) ?? "N/A"} ms`,
                                                      `  Resting HR: ${r.resting_heart_rate ?? "N/A"} bpm`,
                                                      `  SpO2: ${r.spo2_percentage?.toFixed(1) ?? "N/A"}%`,
                                                      `  Skin Temp: ${r.skin_temp_celsius?.toFixed(1) ?? "N/A"} C`,
                                                      `  Status: ${r.score_state}`,
                                                    ].join("\n") : "No recovery data available",
                                      ];
                            return {
                                        content: [{ type: "text", text: lines.join("\n") }],
                                        structuredContent: { records },
                            };
                  } catch (error) {
                            const msg = error instanceof Error ? error.message : "Unknown error";
                            return { content: [{ type: "text", text: `Error fetching recovery data: ${msg}` }], isError: true };
                  }
          }
        );
}
