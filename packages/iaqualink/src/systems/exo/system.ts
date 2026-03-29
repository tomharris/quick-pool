import { AqualinkSystem, type SystemType } from "../../system.ts";
import { EXO_SHADOW_URL, HTTP_HEADERS } from "../../constants.ts";
import {
  AqualinkServiceError,
  AqualinkSystemOfflineError,
  AqualinkUnauthorizedError,
} from "../../errors.ts";
import type { ExoShadowState } from "../../types.ts";
import { parseExoDevices } from "./devices.ts";

export class ExoSystem extends AqualinkSystem {
  readonly type: SystemType = "exo";
  readonly tempUnit = "C";

  protected async fetchDevices(): Promise<void> {
    const shadow = await this.getShadow();
    const reported = shadow.state.reported;

    if (!reported) {
      this.online = false;
      throw new AqualinkSystemOfflineError(this.serial);
    }

    this.online = true;
    parseExoDevices(reported, this);
  }

  async getShadow(): Promise<ExoShadowState> {
    const response = await this.shadowRequestWithRetry("GET");

    if (!response.ok) {
      throw new AqualinkServiceError(
        `eXO shadow GET failed: ${response.status}`,
        response.status,
      );
    }

    return (await response.json()) as ExoShadowState;
  }

  async setDesiredState(desired: Record<string, unknown>): Promise<void> {
    const body = { state: { desired } };
    const response = await this.shadowRequestWithRetry("POST", body);

    if (!response.ok) {
      throw new AqualinkServiceError(
        `eXO shadow POST failed: ${response.status}`,
        response.status,
      );
    }
  }

  private async shadowRequestWithRetry(
    method: "GET" | "POST",
    body?: unknown,
  ): Promise<Response> {
    const response = await this.shadowRequest(method, body);

    if (response.status === 401) {
      await this.client.refreshLogin();
      const retry = await this.shadowRequest(method, body);
      if (retry.status === 401) {
        throw new AqualinkUnauthorizedError("eXO token expired and re-login failed");
      }
      return retry;
    }

    return response;
  }

  private async shadowRequest(
    method: "GET" | "POST",
    body?: unknown,
  ): Promise<Response> {
    const creds = this.client.getCredentials();
    const url = `${EXO_SHADOW_URL}/${this.serial}/shadow`;

    return fetch(url, {
      method,
      headers: {
        ...HTTP_HEADERS,
        Authorization: creds.idToken,
      },
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  // --- Command helpers ---

  async setHeating(params: {
    enabled?: boolean;
    sp?: number;
  }): Promise<void> {
    await this.setDesiredState({ heating: params });
  }

  async setAux(name: string, state: number): Promise<void> {
    await this.setDesiredState({
      equipment: { swc_0: { [name]: state } },
    });
  }

  async setToggle(name: string, value: number): Promise<void> {
    await this.setDesiredState({
      equipment: { swc_0: { [name]: value } },
    });
  }
}

AqualinkSystem.registerType("exo", ExoSystem);
