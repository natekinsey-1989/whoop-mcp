import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { WhoopClient } from "../whoop-client";

export function registerHomeTools(server: McpServer, whoopClient: WhoopClient) {
  server.registerTool(
    "whoop_get_overview",
    {
      title: "Get Whoop Overview",
      description: "Get today's Whoop overview: cycle strain, recovery score, HRV, RHR, sleep performance, and recent workouts",
      inputSchema: {},
      outputSchema: {
        cycle: z.object({
          id: z.number(),
          start: z.string(),
          strain: z.number().nullable(),
          kilojoule: z.number().nullable(),
          average_heart_rate: z.number().nullable(),
          score_state: z.string(),
        }),
        recovery: z.object({
          recovery_score: z.number().nullable(),
          resting_heart_rate: z.number().nullable(),
          hrv_rmssd_milli: z.number().nullable(),
          spo2_percentage: z.number().nullable(),
          skin_temp_celsius: z.number().nullable(),
          score_state: z.string(),
        }),
        sleep: z.object({
          sleep_performance_percentage: z.number().nullable(),
          total_sleep_hours: z.number().nullable(),
          respiratory_rate: z.number().nullable(),
          score_state: z.string(),
        }),
      },
    },
    async () => {
      try {
        const [cycleData, recoveryData, sleepData] = await Promise.all([
          whoopClient.getLatestCycle(),
          whoopClient.getLatestRecovery(),
          whoopClient.getLatestSleep(),
        ]);

        const cycle = cycleData.records?.[0];
        const recovery = recoveryData.records?.[0];
        const sleep = sleepData.records?.[0];

        const output = {
          cycle: {
            id: cycle?.id ?? 0,
            start: cycle?.start ?? "",
            strain: cycle?.score?.strain ?? null,
            kilojoule: cycle?.score?.kilojoule ?? null,
            average_heart_rate: cycle?.score?.average_heart_rate ?? null,
            score_state: cycle?.score_state ?? "UNKNOWN",
          },
          recovery: {
            recovery_score: recovery?.score?.recovery_score ?? null,
            resting_heart_rate: recovery?.score?.resting_heart_rate ?? null,
            hrv_rmssd_milli: recovery?.score?.hrv_rmssd_milli ?? null,
            spo2_percentage: recovery?.score?.spo2_percentage ?? null,
            skin_temp_celsius: recovery?.score?.skin_temp_celsius ?? null,
            score_state: recovery?.score_state ?? "UNKNOWN",
          },
          sleep: {
            sleep_performance_percentage: sleep?.score?.sleep_performance_percentage ?? null,
            total_sleep_hours: sleep?.score?.stage_summary?.total_in_bed_time_milli
              ? (sleep.score.stage_summary.total_in_bed_time_milli - sleep.score.stage_summary.total_awake_time_milli) / 3600000
              : null,
            respiratory_rate: sleep?.score?.respiratory_rate ?? null,
            score_state: sleep?.score_state ?? "UNKNOWN",
          },
        };

        const lines = [
          "🏠 WHOOP OVERVIEW",
          "═════════════════",
          "",
          `📅 Cycle: ${cycle?.start?.split("T")[0] ?? "N/A"} (${output.cycle.score_state})`,
          `💪 Day Strain: ${output.cycle.strain?.toFixed(1) ?? "N/A"}`,
          `🔥 Kilojoules: ${output.cycle.kilojoule?.toFixed(0) ?? "N/A"} kJ`,
          `❤️  Avg HR: ${output.cycle.average_heart_rate ?? "N/A"} bpm`,
          "",
          "🟢 RECOVERY",
          "───────────",
          `  Score: ${output.recovery.recovery_score ?? "N/A"}%`,
          `  HRV: ${output.recovery.hrv_rmssd_milli?.toFixed(1) ?? "N/A"} ms`,
          `  RHR: ${output.recovery.resting_heart_rate ?? "N/A"} bpm`,
          `  SpO2: ${output.recovery.spo2_percentage?.toFixed(1) ?? "N/A"}%`,
          `  Skin Temp: ${output.recovery.skin_temp_celsius?.toFixed(1) ?? "N/A"}°C`,
          "",
          "😴 SLEEP",
          "─────────",
          `  Performance: ${output.sleep.sleep_performance_percentage ?? "N/A"}%`,
          `  Total Sleep: ${output.sleep.total_sleep_hours?.toFixed(1) ?? "N/A"} hrs`,
          `  Respiratory Rate: ${output.sleep.respiratory_rate?.toFixed(1) ?? "N/A"} rpm`,
        ];

        return {
          content: [{ type: "text", text: lines.join("\n") }],
          structuredContent: output,
        };
      } catch (error) {
        const msg = error instanceof Error ? error.message : "Unknown error";
        return { content: [{ type: "text", text: `Error fetching Whoop overview data: ${msg}` }], isError: true };
      }
    }
  );
}
