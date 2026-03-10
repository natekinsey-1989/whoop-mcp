import type { WhoopHeaders, TokenData } from "./types";
import { readFileSync, writeFileSync } from "fs";

const TOKEN_FILE = "/tmp/whoop_token.json";
const BASE_URL = "https://api.prod.whoop.com/developer";

export function saveTokenToFile(accessToken: string, expiresAt: number): void {
  try {
    writeFileSync(TOKEN_FILE, JSON.stringify({ accessToken, expiresAt }), "utf8");
  } catch (e) {
    console.error("Failed to save token to file:", e);
  }
}

export class WhoopClient {
  private tokenData: TokenData | null = null;

  constructor() {}

  async login(): Promise<void> {
    const accessToken = process.env.WHOOP_ACCESS_TOKEN;
    if (accessToken) {
      this.tokenData = { accessToken, expiresAt: Date.now() + 3600 * 1000 };
      saveTokenToFile(accessToken, this.tokenData.expiresAt);
      return;
    }
    try {
      const raw = readFileSync(TOKEN_FILE, "utf8");
      const parsed = JSON.parse(raw);
      if (parsed.accessToken && parsed.expiresAt > Date.now()) {
        this.tokenData = parsed;
        return;
      }
    } catch (_) {}
    throw new Error("No valid token. Visit https://whoop-mcp-production-04c1.up.railway.app/auth to authorize.");
  }

  private async ensureValidToken(): Promise<void> {
    if (!this.tokenData || this.tokenData.expiresAt < Date.now() + 5 * 60 * 1000) {
      this.tokenData = null;
      await this.login();
    }
  }

  private async get(path: string): Promise<any> {
    await this.ensureValidToken();
    const response = await fetch(`${BASE_URL}${path}`, {
      headers: {
        Authorization: `Bearer ${this.tokenData!.accessToken}`,
        "Content-Type": "application/json",
      },
    });
    if (!response.ok) {
      if (response.status === 401) {
        this.tokenData = null;
        await this.login();
        const retry = await fetch(`${BASE_URL}${path}`, {
          headers: {
            Authorization: `Bearer ${this.tokenData!.accessToken}`,
            "Content-Type": "application/json",
          },
        });
        if (!retry.ok) throw new Error(`Whoop API error: ${retry.status} ${retry.statusText}`);
        return retry.json();
      }
      throw new Error(`Whoop API error: ${response.status} ${response.statusText}`);
    }
    return response.json();
  }

  async getLatestCycle(): Promise<any> {
    return this.get("/v2/cycle?limit=1");
  }

  async getLatestRecovery(): Promise<any> {
    return this.get("/v2/recovery?limit=1");
  }

  async getLatestSleep(): Promise<any> {
    return this.get("/v2/activity/sleep?limit=1");
  }

  async getLatestWorkouts(): Promise<any> {
    return this.get("/v2/activity/workout?limit=5");
  }

  async getUserProfile(): Promise<any> {
    return this.get("/v2/user/profile/basic");
  }

  async getUserBodyMeasurements(): Promise<any> {
    return this.get("/v2/user/measurement/body");
  }

  async getRecoveryForCycle(cycleId: number): Promise<any> {
    return this.get(`/v2/cycle/${cycleId}/recovery`);
  }

  async getSleepForCycle(cycleId: number): Promise<any> {
    return this.get(`/v2/cycle/${cycleId}/sleep`);
  }
}
