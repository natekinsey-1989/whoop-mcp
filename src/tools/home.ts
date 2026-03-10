import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { WhoopClient } from "../whoop-client";

export function registerHomeTools(server: McpServer, whoopClient: WhoopClient) {
    server.registerTool(
          "whoop_get_overview",
      {
              title: "Get Whoop Overview",
              description: "Get today's Whoop overview: cycle strain, recovery score, HRV, RHR, sleep performance",
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
                                        "WHOOP OVERVIEW", "=================", "",
                                        `Cycle: ${cycle?.start?.split("T")[0] ?? "N/A"} (${output.cycle.score_state})`,
                                        `Day Strain: ${output.cycle.strain?.toFixed(1) ?? "N/A"}`,
                                        `Kilojoules: ${output.cycle.kilojoule?.toFixed(0) ?? "N/A"} kJ`,
                                        `Avg HR: ${output.cycle.average_heart_rate ?? "N/A"} bpm`,
                                        "", "RECOVERY", "-------i-m-p-o-r"t, 
                              {   z   }   f r o m  `" z oSdc"o;r
                              ei:m p$o{rotu ttpyupte. r{e cMocvpeSreyr.vreerc o}v efrryo_ms c"o@rmeo d?e?l c"oNn/tAe"x}t%p`r,o
                    t o c o l / s d k / s`e r vHeRrV/:m c$p{.ojust"p;u
                    ti.mrpeocrotv e{r yW.hhorovp_Crlmisesndt_ m}i lflrio?m. t"o.F.i/xwehdo(o1p)- c?l?i e"nNt/"A;"
                    }
                     emxsp`o,r
                    t   f u n c t i o n  `r e gRiHsRt:e r$H{oomuetTpouotl.sr(esceorvveerry:. rMecsptSienrgv_ehre,a rwth_oroaptCel i?e?n t":N /WAh"o}o pbCplmi`e,n
                    t )   { 
                         s e r v`e r .SrpeOg2i:s t$e{roTuotoplu(t
                         . r e c o"vwehroyo.ps_pgoe2t__poevrecrevniteawg"e,?
                         . t o F i{x
                         e d ( 1 )   ?t?i t"lNe/:A ""}G%e`t, 
                           W h o o p   O v e r v`i e wS"k,i
                           n   T e m p :d e$s{coruitpptuito.nr:e c"oGveetr yt.osdkaiyn'_st eWmhpo_ocpe losvieursv?i.etwo:F icxyecdl(e1 )s t?r?a i"nN,/ Ar"e}c oCv`e,r
                      y   s c o r e ,   H R"V",,  R"HSRL,E EsPl"e,e p" -p-e-r-f-o-r-m-a-n"c,e
                      " , 
                                     i n`p u tPSecrhfeomram:a n{c}e,:
                                       $ { o u t pouutt.psulteSecph.esmlae:e p{_
                                       p e r f o r m a nccyec_lpee:r cze.notbajgeec t?(?{ 
                                       " N / A " } % ` , 
                          i d :   z . n u m b`e r (T)o,t
                          a l   S l e e p :   $s{toaurttp:u tz..ssltereipn.gt(o)t,a
                          l _ s l e e p _ h o usrtsr?a.itno:F izx.endu(m1b)e r?(?) ."nNu/lAl"a}b lher(s)`,,

                                            k`i l oRjeosuplier:a tzo.rnyu mRbaetre(:) .$n{uolultapbulte.(s)l,e
                                            e p . r e s p i r a taovreyr_argaet_eh?e.atrotF_irxaetde(:1 )z .?n?u m"bNe/rA(")}. nruplml`a,b
                      l e ( ) , 
                              ] ; 
                              s c o rree_tsutrant e{:
                                z . s t r i n g ( )c,o
                      n t e n t :   [ {} )t,y
                                     p e :   " t e x tr"e,c otveexrty::  lzi.noebsj.ejcoti(n{(
                        " \ n " )   } ] , 
                        r e c o v e r y _ ssctorruec:t uzr.enduCmobnetre(n)t.:n uolultapbulte,(
                      ) , 
                      } ; 
          r e s t i}n gc_ahtecahr t(_errartoer:)  z{.
      n u m b e r ( ) .cnounlslta bmlseg( )=, 
      e r r o r   i n s t ahnrcve_orfm sEsrdr_omri l?l ie:r rzo.rn.ummebsesra(g)e. n:u l"lUanbklneo(w)n, 
      e r r o r " ; 
            s p o 2 _ preertcuernnt a{g ec:o nzt.ennutm:b e[r{( )t.ynpuel:l a"btleex(t)",,
        t e x t :   ` E r rsokri nf_ettecmhpi_ncge lWshiouosp:  ozv.enruvmibeewr (d)a.tnau:l l$a{bmlseg(})`, 
      } ] ,   i s E r r o rs:c otrreu_es t}a;t
  e :   z . s t}r
i n g ( )},

    ) ; 
}   }),
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
                                            "WHOOP OVERVIEW", "=================", "",
                                            `Cycle: ${cycle?.start?.split("T")[0] ?? "N/A"} (${output.cycle.score_state})`,
                                            `Day Strain: ${output.cycle.strain?.toFixed(1) ?? "N/A"}`,
                                            `Kilojoules: ${output.cycle.kilojoule?.toFixed(0) ?? "N/A"} kJ`,
                                            `Avg HR: ${output.cycle.average_heart_rate ?? "N/A"} bpm`,
                                            "", "RECOVERY", "-----------",
                                            `  Score: ${output.recovery.recovery_score ?? "N/A"}%`,
                                            `  HRV: ${output.recovery.hrv_rmssd_milli?.toFixed(1) ?? "N/A"} ms`,
                                            `  RHR: ${output.recovery.resting_heart_rate ?? "N/A"} bpm`,
                                            `  SpO2: ${output.recovery.spo2_percentage?.toFixed(1) ?? "N/A"}%`,
                                            `  Skin Temp: ${output.recovery.skin_temp_celsius?.toFixed(1) ?? "N/A"} C`,
                                            "", "SLEEP", "---------",
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
