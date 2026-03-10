import type {
  WhoopHeaders,
  HomeResponse,
  TokenData,
} from "./types";

export class WhoopClient {
  private baseUrl: string;
  private tokenData: TokenData | null = null;

  constructor() {
    this.baseUrl = "https://api.prod.whoop.com";
  }

  async login(): Promise<void> {
    const clientId = process.env.WHOOP_CLIENT_ID;
    const clientSecret = process.env.WHOOP_CLIENT_SECRET;
    const accessToken = process.env.WHOOP_ACCESS_TOKEN;

    if (!clientId || !clientSecret) {
      throw new Error("WHOOP_CLIENT_ID and WHOOP_CLIENT_SECRET are required");
    }

    if (accessToken) {
      this.tokenData = {
        accessToken,
        expiresAt: Date.now() + 3600 * 1000,
      };
      return;
    }

    throw new Error(
      "No valid token. Visit https://whoop-mcp-production-04c1.up.railway.app/auth to authorize, then save the access token as WHOOP_ACCESS_TOKEN in Railway."
    );
  }

  private async ensureValidToken(): Promise<void> {
    if (!this.tokenData) {
      await this.login();
      return;
    }
    const expiresInMs = this.tokenData.expiresAt - Date.now();
    if (expiresInMs < 5 * 60 * 1000) {
      await this.login();
    }
  }

  private async getHeaders(): Promise<WhoopHeaders> {
    await this.ensureValidToken();
    if (!this.tokenData) {
      throw new Error("No valid authentication token available");
    }
    return {
      Host: "api.prod.whoop.com",
      Authorization: `Bearer ${this.tokenData.accessToken}`,
      Accept: "*/*",
      "User-Agent": "iOS",
      "Content-Type": "application/json",
      "X-WHOOP-Device-Platform": "iOS",
      "X-WHOOP-Time-Zone": Intl.DateTimeFormat().resolvedOptions().timeZone,
      Locale: "en_US",
      Currency: "USD",
    };
  }

  private async fetchWithRetry(url: string): Promise<any> {
    let retried = false;
    while (true) {
      try {
        const headers = await this.getHeaders();
        const response = await fetch(url, {
          method: "GET",
          headers: Object.fromEntries(
            Object.entries(headers).map(([k, v]) => [k, v as string])
          ),
        });
        if (!response.ok) {
          if (response.status === 401 && !retried) {
            retried = true;
            this.tokenData = null;
            await this.login();
            continue;
          }
          throw new Error(`Whoop API error: ${response.status} ${response.statusText}`);
        }
        return await response.json();
      } catch (error) {
        if (retried || !(error instanceof Error && error.message.includes("401"))) {
          if (error instanceof Error) throw error;
          throw new Error("Unknown error fetching Whoop data");
        }
        retried = true;
        this.tokenData = null;
        await this.login();
      }
    }
  }

  async getHomeData(date?: string): Promise<HomeResponse> {
    const dateParam = date || new Date().toISOString().split("T")[0];
    return this.fetchWithRetry(`${this.baseUrl}/home-service/v1/home?date=${dateParam}`);
  }

  async getSleepDeepDive(date?: string): Promise<any> {
    const dateParam = date || new Date().toISOString().split("T")[0];
    return this.fetchWithRetry(`${this.baseUrl}/home-service/v1/deep-dive/sleep?date=${dateParam}`);
  }

  async getRecoveryDeepDive(date?: string): Promise<any> {
    const dateParam = date || new Date().toISOString().split("T")[0];
    return this.fetchWithRetry(`${this.baseUrl}/home-service/v1/deep-dive/recovery?date=${dateParam}`);
  }

  async getStrainDeepDive(date?: string): Promise<any> {
    const dateParam = date || new Date().toISOString().split("T")[0];
    return this.fetchWithRetry(`${this.baseUrl}/home-service/v1/deep-dive/strain?date=${dateParam}`);
  }

  async getHealthspan(date?: string): Promise<any> {
    const dateParam = date || new Date().toISOString().split("T")[0];
    return this.fetchWithRetry(`${this.baseUrl}/healthspan-service/v1/healthspan/bff?date=${dateParam}`);
  }

  formatHomeData(data: HomeResponse): string {
    const metadata = data.metadata;
    const live = metadata.whoop_live_metadata;
    const cycle = metadata.cycle_metadata;

    const lines = [
      "WHOOP HOME DATA",
      "══════════════════",
      "",
      `Date: ${cycle.cycle_day} (${cycle.cycle_date_display})`,
      `Cycle ID: ${cycle.cycle_id}`,
      `Sleep State: ${cycle.sleep_state}`,
      "",
      "LIVE METRICS",
      "───────────────",
      `  Recovery: ${live.recovery_score}%`,
      `  Strain: ${live.day_strain.toFixed(1)}`,
      `  Sleep: ${(live.ms_of_sleep / (1000 * 60 * 60)).toFixed(1)} hours`,
      `  Calories: ${live.calories}`,
      "",
    ];

    if (data.header?.content?.gauges) {
      lines.push("SCORES", "─────────");
      data.header.content.gauges.forEach((gauge) => {
        lines.push(
          `  ${gauge.title}: ${gauge.score_display}${gauge.score_display_suffix || ""} (${Math.round(gauge.gauge_fill_percentage * 100)}%)`
        );
      });
      lines.push("");
    }

    return lines.join("\n");
  }
}
