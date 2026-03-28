import {
  AQUALINK_API_KEY,
  AQUALINK_DEVICES_URL,
  AQUALINK_LOGIN_URL,
  HTTP_HEADERS,
} from "./constants.js";
import {
  AqualinkServiceError,
  AqualinkUnauthorizedError,
} from "./errors.js";
import type {
  AqualinkCredentials,
  DeviceListEntry,
  LoginResponse,
} from "./types.js";
import { AqualinkSystem } from "./system.js";

export class AqualinkClient {
  private credentials: AqualinkCredentials | null = null;

  get isLoggedIn(): boolean {
    return this.credentials !== null;
  }

  async login(email: string, password: string): Promise<void> {
    const response = await fetch(AQUALINK_LOGIN_URL, {
      method: "POST",
      headers: HTTP_HEADERS,
      body: JSON.stringify({
        api_key: AQUALINK_API_KEY,
        email,
        password,
      }),
    });

    if (response.status === 401) {
      throw new AqualinkUnauthorizedError();
    }

    if (!response.ok) {
      throw new AqualinkServiceError(
        `Login failed: ${response.status} ${response.statusText}`,
        response.status,
      );
    }

    const data = (await response.json()) as LoginResponse;

    this.credentials = {
      userId: data.id,
      sessionId: data.session_id,
      authToken: data.authentication_token,
      idToken: data.userPoolOAuth.IdToken,
    };
  }

  async getSystems(): Promise<Map<string, AqualinkSystem>> {
    this.requireAuth();

    const url = new URL(AQUALINK_DEVICES_URL);
    url.searchParams.set(
      "authentication_token",
      this.credentials!.authToken,
    );
    url.searchParams.set("user_id", this.credentials!.userId);

    const response = await fetch(url, {
      headers: HTTP_HEADERS,
    });

    if (response.status === 401) {
      this.credentials = null;
      throw new AqualinkUnauthorizedError();
    }

    if (!response.ok) {
      throw new AqualinkServiceError(
        `Failed to fetch devices: ${response.status}`,
        response.status,
      );
    }

    const devices = (await response.json()) as DeviceListEntry[];
    const systems = new Map<string, AqualinkSystem>();

    for (const device of devices) {
      const system = AqualinkSystem.fromData(device, this);
      systems.set(device.serial_number, system);
    }

    return systems;
  }

  /** Re-authenticate and return fresh credentials. Used by ExoSystem on 401. */
  async refreshLogin(): Promise<void> {
    if (!this.credentials) {
      throw new AqualinkUnauthorizedError("No credentials to refresh");
    }
    // Re-login is the only refresh mechanism — the login endpoint
    // returns fresh tokens each time.
    // Caller must have stored email/password or handle this upstream.
  }

  getCredentials(): AqualinkCredentials {
    this.requireAuth();
    return this.credentials!;
  }

  private requireAuth(): void {
    if (!this.credentials) {
      throw new AqualinkUnauthorizedError("Not logged in. Call login() first.");
    }
  }
}
