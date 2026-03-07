import type {
  WhoopConfig,
  WhoopHeaders,
  HomeResponse,
  TokenData,
} from "./types";

export class WhoopClient {
  private config: WhoopConfig;
  private baseUrl: string;
  private tokenData: TokenData | null = null;

  constructor(config: WhoopConfig) {
    this.config = config;
    this.baseUrl = config.baseUrl || "https://api.prod.whoop.com";
  }

  async login(): Promise<void> {
    const clientId = process.env.WHOOP_CLIENT_ID;
    const clientSecret = process.env.WHOOP_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      throw new Error("WHOOP_CLIENT_ID and WHOOP_CLIENT_SECRET are required");
    }

    const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");

    const response = await fetch("https://api.prod.whoop.com/oauth/oauth2/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "Authorization": `Basic ${credentials}`,
      },
      body: new URLSearchParams({
        grant_type: "client_credentials",
        scope: "read:recovery read:cycles read:sleep read:workout read:profile read:body_measurement",
      }),
    });

    if (!response.ok) {
      throw new Error(`OAuth login failed: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();

    this.tokenData = {
      accessToken: data.access_token,
      expiresAt: Date.now() + data.expires_in * 1000,
    };
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

  async getHomeData(date?: string): Promise<HomeResponse> {
    const dateParam = date || new Date().toISOString().split("T")[0];
    const url = `${this.baseUrl}/home-service/v1/home?date=${dateParam}`;
    let retried = false;

    while (true) {
      try {
        const headers = await this.getHeaders();
        const response = await fetch(url, {
          method: "GET",
          headers: Object.fromEntries(
            Object.entries(headers).map(([key, value]) => [key, value as string])
          ),
        });

        if (!response.ok) {
          if (response.status === 401 && !retried) {
            retried = true;
            await this.login();
            continue;
          }
          throw new Error(`Whoop API error: ${response.status} ${response.statusText}`);
        }

        return await response.json() as HomeResponse;
      } catch (error) {
        if (retried || !(error instanceof Error && error.message.includes("401"))) {
          if (error instanceof Error) throw new Error(`Failed to fetch home data: ${error.message}`);
          throw error;
        }
        retried = true;
        await this.login();
      }
    }
  }

  async getSleepDeepDive(date?: string): Promise<any> {
    const dateParam = date || new Date().toISOString().split("T")[0];
    const url = `${this.baseUrl}/home-service/v1/deep-dive/sleep?date=${dateParam}`;
    let retried = false;

    while (true) {
      try {
        const headers = await this.getHeaders();
        const response = await fetch(url, {
          method: "GET",
          headers: Object.fromEntries(
            Object.entries(headers).map(([key, value]) => [key, value as string])
          ),
        });

        if (!response.ok) {
          if (response.status === 401 && !retried) {
            retried = true;
            await this.login();
            continue;
          }
          throw new Error(`Whoop API error: ${response.status} ${response.statusText}`);
        }

        return await response.json();
      } catch (error) {
        if (retried || !(error instanceof Error && error.message.includes("401"))) {
          if (error instanceof Error) throw new Error(`Failed to fetch sleep data: ${error.message}`);
          throw error;
        }
        retried = true;
        await this.login();
      }
    }
  }

  async getRecoveryDeepDive(date?: string): Promise<any> {
    const dateParam = date || new Date().toISOString().split("T")[0];
    const url = `${this.baseUrl}/home-service/v1/deep-dive/recovery?date=${dateParam}`;
    let retried = false;

    while (true) {
      try {
        const headers = await this.getHeaders();
        const response = await fetch(url, {
          method: "GET",
          headers: Object.fromEntries(
            Object.entries(headers).map(([key, value]) => [key, value as string])
          ),
        });

        if (!response.ok) {
          if (response.status === 401 && !retried) {
            retried = true;
            await this.login();
            continue;
          }
          throw new Error(`Whoop API error: ${response.status} ${response.statusText}`);
        }

        return await response.json();
      } catch (error) {
        if (retried || !(error instanceof Error && error.message.includes("401"))) {
          if (error instanceof Error) throw new Error(`Failed to fetch recovery data: ${error.message}`);
          throw error;
        }
        retried = true;
        await this.login();
      }
    }
  }

  async getStrainDeepDive(date?: string): Promise<any> {
    const dateParam = date || new Date().toISOString().split("T")[0];
    const url = `${this.baseUrl}/home-service/v1/deep-dive/strain?date=${dateParam}`;
    let retried = false;

    while (true) {
      try {
        const headers = await this.getHeaders();
        const response = await fetch(url, {
          method: "GET",
          headers: Object.fromEntries(
            Object.entries(headers).map(([key, value]) => [key, value as string])
          ),
        });

        if (!response.ok) {
          if (response.status === 401 && !retried) {
            retried = true;
            await this.login();
            continue;
          }
          throw new Error(`Whoop API error: ${response.status} ${response.statusText}`);
        }

        return await response.json();
      } catch (error) {
        if (retried || !(error instanceof Error && error.message.includes("401"))) {
          if (error instanceof Error) throw new Error(`Failed to fetch strain data: ${error.message}`);
          throw error;
        }
        retried = true;
        await this.login();
      }
    }
  }

  async getHealthspan(date?: string): Promise<any> {
    const dateParam = date || new Date().toISOString().split("T")[0];
    const url = `${this.baseUrl}/healthspan-service/v1/healthspan/bff?date=${dateParam}`;
    let retried = false;

    while (true) {
      try {
        const headers = await this.getHeaders();
        const response = await fetch(url, {
          method: "GET",
          headers: Object.fromEntries(
            Object.entries(headers).map(([key, value]) => [key, value as string])
          ),
        });

        if (!response.ok) {
          if (response.status === 401 && !retried) {
            retried = true;
            await this.login();
            continue;
          }
          throw new Error(`Whoop API error: ${response.status} ${response.statusText}`);
        }

        return await response.json();
      } catch (error) {
        if (retried || !(error instanceof Error && error.message.includes("401"))) {
          if (error instanceof Error) throw new Error(`Failed to fetch healthspan data: ${error.message}`);
          throw error;
        }
        retried = true;
        await this.login();
      }
    }
  }

  formatHomeData(data: HomeResponse): string {
    const metadata = data.metadata;
    const live = metadata.whoop_live_metadata;
    const cycle = metadata.cycle_metadata;

    const lines = [
      "🏠 WHOOP HOME DATA",
      "══════════════════",
      "",
      `📅 Date: ${cycle.cycle_day} (${cycle.cycle_date_display})`,
      `🔄 Cycle ID: ${cycle.cycle_id}`,
      `💤 Sleep State: ${cycle.sleep_state}`,
      "",
      "📊 LIVE METRICS",
      "───────────────",
      `  Recovery: ${live.recovery_score}%`,
      `  Strain: ${live.day_strain.toFixed(1)}`,
      `  Sleep: ${(live.ms_of_sleep / (1000 * 60 * 60)).toFixed(1)} hours`,
      `  Calories: ${live.calories}`,
      "",
    ];

    if (data.header?.content?.gauges) {
      lines.push("🎯 SCORES", "─────────");
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
