import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { WhoopClient } from "../whoop-client";

export function registerStrainTools(server: McpServer, whoopClient: WhoopClient) {
  server.registerTool(
    "whoop_get_strain",
    {
      title: "Get Whoop Strain",
      description: "Get strain data: day strain, recent workouts with HR zones, kilojoules, sport names",
      inputSchema: {},
      outputSchema: {
        cycle_strain: z.number().nullable(),
        cycle_kilojoule: z.number().nullable(),
        workouts: z.array(z.object({
          id: z.string(),
          sport_name: z.string(),
          start: z.string(),
          strain: z.number().nullable(),
          average_heart_rate: z.number().nullable(),
          max_heart_rate: z.number().nullable(),
          kilojoule: z.number().nullable(),
          distance_meter: z.number().nullable(),
          score_state: z.string(),
        })),
      },
    },
    async () => {
      try {
        const [cycleData, workoutData] = await Promise.all([
          whoopClient.getLatestCycle(),
          whoopClient.getLatestWorkouts(),
        ]);

        const cycle = cycleData.records?.[0];
        const workouts = (workoutData.records ?? []).map((w: any) => ({
          id: w.id,
          sport_name: w.sport_name ?? "Unknown",
          start: w.start,
          strain: w.score?.strain ?? null,
          average_heart_rate: w.score?.average_heart_rate ?? null,
          max_heart_rate: w.score?.max_heart_rate ?? null,
          kilojoule: w.score?.kilojoule ?? null,
          distance_meter: w.score?.distance_meter ?? null,
          score_state: w.score_state,
        }));

        const lines = [
          "💪 WHOOP STRAIN",
          "════════════════",
          "",
          `📅 Cycle: ${cycle?.start?.split("T")[0] ?? "N/A"}`,
          `  Day Strain: ${cycle?.score?.strain?.toFixed(1) ?? "N/A"}`,
          `  Kilojoules: ${cycle?.score?.kilojoule?.toFixed(0) ?? "N/A"} kJ`,
          `  Avg HR: ${cycle?.score?.average_heart_rate ?? "N/A"} bpm`,
          "",
          workouts.length > 0 ? [
            "🏃 RECENT WORKOUTS",
            "──────────────────",
            ...workouts.map((w: any, i: number) => [
              `${i + 1}. ${w.sport_name} — ${w.start?.split("T")[0]}`,
              `   Strain: ${w.strain?.toFixed(1) ?? "N/A"} | Avg HR: ${w.average_heart_rate ?? "N/A"} bpm | Max HR: ${w.max_heart_rate ?? "N/A"} bpm`,
              `   Energy: ${w.kilojoule?.toFixed(0) ?? "N/A"} kJ${w.distance_meter ? ` | Distance: ${(w.distance_meter / 1000).toFixed(2)} km` : ""}`,
            ].join("\n")),
          ].join("\n") : "No recent workouts",
        ];

        return {
          content: [{ type: "text", text: lines.join("\n") }],
          structuredContent: { cycle_strain: cycle?.score?.strain ?? null, cycle_kilojoule: cycle?.score?.kilojoule ?? null, workouts },
        };
      } catch (error) {
        const msg = error instanceof Error ? error.message : "Unknown error";
        return { content: [{ type: "text", text: `Error fetching strain data: ${msg}` }], isError: true };
      }
    }
  );
}
