import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { WhoopClient } from "../whoop-client";

export function registerSleepTools(server: McpServer, whoopClient: WhoopClient) {
  server.registerTool(
    "whoop_get_sleep",
    {
      title: "Get Whoop Sleep",
      description: "Get detailed sleep data: performance, stages, efficiency, consistency, respiratory rate",
      inputSchema: {},
      outputSchema: {
        records: z.array(z.object({
          id: z.string(),
          start: z.string(),
          end: z.string(),
          nap: z.boolean(),
          sleep_performance_percentage: z.number().nullable(),
          sleep_efficiency_percentage: z.number().nullable(),
          sleep_consistency_percentage: z.number().nullable(),
          respiratory_rate: z.number().nullable(),
          total_sleep_hours: z.number().nullable(),
          rem_hours: z.number().nullable(),
          sws_hours: z.number().nullable(),
          light_hours: z.number().nullable(),
          awake_hours: z.number().nullable(),
          score_state: z.string(),
        })),
      },
    },
    async () => {
      try {
        const data = await whoopClient.getLatestSleep();
        const records = (data.records ?? []).map((s: any) => {
          const stages = s.score?.stage_summary ?? {};
          return {
            id: s.id,
            start: s.start,
            end: s.end,
            nap: s.nap,
            sleep_performance_percentage: s.score?.sleep_performance_percentage ?? null,
            sleep_efficiency_percentage: s.score?.sleep_efficiency_percentage ?? null,
            sleep_consistency_percentage: s.score?.sleep_consistency_percentage ?? null,
            respiratory_rate: s.score?.respiratory_rate ?? null,
            total_sleep_hours: stages.total_in_bed_time_milli
              ? (stages.total_in_bed_time_milli - (stages.total_awake_time_milli ?? 0)) / 3600000
              : null,
            rem_hours: stages.total_rem_sleep_time_milli ? stages.total_rem_sleep_time_milli / 3600000 : null,
            sws_hours: stages.total_slow_wave_sleep_time_milli ? stages.total_slow_wave_sleep_time_milli / 3600000 : null,
            light_hours: stages.total_light_sleep_time_milli ? stages.total_light_sleep_time_milli / 3600000 : null,
            awake_hours: stages.total_awake_time_milli ? stages.total_awake_time_milli / 3600000 : null,
            score_state: s.score_state,
          };
        });

        const s = records[0];
        const lines = s ? [
          "😴 WHOOP SLEEP",
          "═══════════════",
          "",
          `📅 ${s.start?.split("T")[0]} → ${s.end?.split("T")[0]}${s.nap ? " (Nap)" : ""}`,
          `  Performance: ${s.sleep_performance_percentage ?? "N/A"}%`,
          `  Efficiency: ${s.sleep_efficiency_percentage?.toFixed(1) ?? "N/A"}%`,
          `  Consistency: ${s.sleep_consistency_percentage ?? "N/A"}%`,
          `  Respiratory Rate: ${s.respiratory_rate?.toFixed(1) ?? "N/A"} rpm`,
          "",
          "Sleep Stages:",
          `  Total Sleep: ${s.total_sleep_hours?.toFixed(1) ?? "N/A"} hrs`,
          `  REM: ${s.rem_hours?.toFixed(1) ?? "N/A"} hrs`,
          `  SWS (Deep): ${s.sws_hours?.toFixed(1) ?? "N/A"} hrs`,
          `  Light: ${s.light_hours?.toFixed(1) ?? "N/A"} hrs`,
          `  Awake: ${s.awake_hours?.toFixed(1) ?? "N/A"} hrs`,
        ].join("\n") : "No sleep data available";

        return {
          content: [{ type: "text", text: lines }],
          structuredContent: { records },
        };
      } catch (error) {
        const msg = error instanceof Error ? error.message : "Unknown error";
        return { content: [{ type: "text", text: `Error fetching sleep data: ${msg}` }], isError: true };
      }
    }
  );
}
