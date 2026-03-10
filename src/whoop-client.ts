import type { WhoopHeaders, HomeResponse, TokenData } from "./types";
import { readFileSync, writeFileSync } from "fs";

const TOKEN_FILE = "/tmp/whoop_token.json";

export function saveTokenToFile(accessToken: string, expiresAt: number): void {
  try {
    writeFileSync(TOKEN_FILE, JSON.stringify({ accessToken, expiresAt }), "utf8");
  } catch (e) {
    console.error("Failed to save token to file:", e);
  }
}

function loadTokenFromFile(): TokenData | null {
  try {
    const raw = readFileSync(TOKEN_FILE, "utf8");
    const parsed = JSON.parse(raw);
    if (parsed.accessToken && parsed.expiresAt > Date.now()) {
      return parsed;
    }
  } catch (_) {}
  return null;
}

export class WhoopClient {
  private baseUrl: string;
  private tokenData: TokenData | null = null;

  constructor() {
    this.baseUrl = "https://api.prod.whoop.com";
  }

  async login(): Promise<void> {
    const fileToken = loadTokenFromFile();
    if (fileToken) {
      this.tokenData = fileToken;
      return;
    }

    const accessToken = process.env.WHOOP_ACCESS_TOKEN;
    if (accessToken) {
      this.tokenData = {
        accessToken,
        expiresAt: Date.now() + 3600 * 1000,
      };
      saveTokenToFile(accessToken, this.tokenData.expiresAt);
      return;
    }

    throw new Error(
      "No valid token. Visit https://whoop-mcp-production-04c1.up.railway.app/auth to authorize."
    );
  }

  private async ensureValidToken(): Promise<void> {
    if (!this.tokenData || this.tokenData.expiresAt < Date.now() + 5 * 60 * 1000) {
      this.tokenData = null;
      await this.login();
    }
  }

  private async getHeaders(): Promise<WhoopHeaders> {
    await this.ensureValidToken();
    if (!this.tokenData) throw new Error("No valid authentication token available");
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
    return
