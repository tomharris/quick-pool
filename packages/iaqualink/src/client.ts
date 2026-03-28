import {
  AQUALINK_API_KEY,
  AQUALINK_DEVICES_URL,
  AQUALINK_LOGIN_URL,
  HTTP_HEADERS,
} from "./constants.ts";
import {
  AqualinkServiceError,
  AqualinkUnauthorizedError,
} from "./errors.ts";
import type {
  AqualinkCredentials,
  DeviceListEntry,
  LoginResponse,
} from "./types.ts";
import { AqualinkSystem } from "./system.ts";

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

    const body = await response.text();
    console.warn(`[iaqualink] login response ${response.status}: ${body.slice(0, 500)}`);

    if (response.status === 401) {
      throw new AqualinkUnauthorizedError(
        body ? `Login rejected: ${body}` : "Unauthorized",
      );
    }

    if (!response.ok) {
      throw new AqualinkServiceError(
        `Login failed: ${response.status} ${response.statusText}`,
        response.status,
      );
    }

    let data: LoginResponse;
    try {
      data = JSON.parse(body) as LoginResponse;
    } catch {
      throw new AqualinkServiceError(
        `Login returned invalid JSON: ${body.slice(0, 200)}`,
      );
    }

    if (!data.userPoolOAuth?.IdToken) {
      throw new AqualinkServiceError(
        `Login response missing expected fields: ${body.slice(0, 200)}`,
      );
    }

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
    url.searchParams.set("api_key", AQUALINK_API_KEY);
    url.searchParams.set(
      "authentication_token",
      this.credentials!.authToken,
    );
    url.searchParams.set("user_id", this.credentials!.userId);

    const response = await fetch(url, {
      headers: HTTP_HEADERS,
    });

    const devicesBody = await response.text();
    console.warn(`[iaqualink] getSystems response ${response.status}: ${devicesBody.slice(0, 500)}`);

    if (response.status === 401) {
      this.credentials = null;
      throw new AqualinkUnauthorizedError(
        `Session rejected: ${devicesBody.slice(0, 200)}`,
      );
    }

    if (!response.ok) {
      throw new AqualinkServiceError(
        `Failed to fetch devices: ${response.status} ${devicesBody.slice(0, 200)}`,
        response.status,
      );
    }

    let devices: DeviceListEntry[];
    try {
      devices = JSON.parse(devicesBody) as DeviceListEntry[];
    } catch {
      throw new AqualinkServiceError(
        `Devices returned invalid JSON: ${devicesBody.slice(0, 200)}`,
      );
    }
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
