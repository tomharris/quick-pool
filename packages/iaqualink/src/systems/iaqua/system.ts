import { AqualinkSystem, type SystemType } from "../../system.ts";
import { IAQUA_SESSION_URL, HTTP_HEADERS } from "../../constants.ts";
import {
  AqualinkServiceError,
  AqualinkSystemOfflineError,
  AqualinkUnauthorizedError,
} from "../../errors.ts";
import type {
  IaquaHomeWrappedResponse,
  IaquaDevicesWrappedResponse,
} from "../../types.ts";
import { parseIaquaDevices } from "./devices.ts";

export class IaquaSystem extends AqualinkSystem {
  readonly type: SystemType = "iaqua";
  tempUnit = "F";

  protected async fetchDevices(): Promise<void> {
    const homeRaw = (await this.sendCommand("get_home")) as IaquaHomeWrappedResponse;
    const devicesRaw = (await this.sendCommand("get_devices")) as IaquaDevicesWrappedResponse;

    // Parse devices_screen first (device config: labels, types, subtypes),
    // then home_screen (live state) so fresh state overwrites stale values.
    this.parseDevicesResponse(devicesRaw.devices_screen ?? []);
    this.parseHomeResponse(homeRaw.home_screen ?? []);
  }

  async sendCommand(
    command: string,
    extraParams?: Record<string, string>,
  ): Promise<unknown> {
    const response = await this.executeCommand(command, extraParams);

    if (response.status === 401) {
      await this.client.refreshLogin();
      const retry = await this.executeCommand(command, extraParams);
      if (!retry.ok) {
        throw new AqualinkUnauthorizedError("iAqua session expired and re-login failed");
      }
      return retry.json();
    }

    if (!response.ok) {
      throw new AqualinkServiceError(
        `iAqua command ${command} failed: ${response.status}`,
        response.status,
      );
    }

    return response.json();
  }

  private async executeCommand(
    command: string,
    extraParams?: Record<string, string>,
  ): Promise<Response> {
    const creds = this.client.getCredentials();
    const url = new URL(IAQUA_SESSION_URL);
    url.searchParams.set("actionID", "command");
    url.searchParams.set("command", command);
    url.searchParams.set("serial", this.serial);
    url.searchParams.set("sessionID", creds.sessionId);

    if (extraParams) {
      for (const [key, value] of Object.entries(extraParams)) {
        url.searchParams.set(key, value);
      }
    }

    return fetch(url, { headers: HTTP_HEADERS });
  }

  private parseHomeResponse(data: IaquaHomeResponse): void {
    if (!Array.isArray(data) || data.length === 0) return;

    // Index 0 is status, index 3 has temp_scale, devices from index 4+
    const statusEntry = data[0] as Record<string, unknown> | undefined;
    if (statusEntry?.["status"] === "Offline") {
      this.online = false;
      throw new AqualinkSystemOfflineError(this.serial);
    }
    this.online = true;

    // Temp scale is at index 3
    const tempScaleEntry = data[3] as Record<string, unknown> | undefined;
    if (tempScaleEntry?.["temp_scale"]) {
      this.tempUnit = String(tempScaleEntry["temp_scale"]);
    }

    // Device data from index 4 onwards
    for (let i = 4; i < data.length; i++) {
      const entry = data[i] as Record<string, unknown>;
      parseIaquaDevices(entry, this);
    }
  }

  private parseDevicesResponse(data: IaquaDevicesResponse): void {
    if (!Array.isArray(data) || data.length === 0) return;

    // Index 0 is status, devices from index 3+
    for (let i = 3; i < data.length; i++) {
      const entry = data[i] as Record<string, unknown>;
      parseIaquaDevices(entry, this);
    }
  }

  // --- Command helpers for device control ---

  async setSwitch(name: string): Promise<void> {
    if (name.startsWith("aux_")) {
      const auxNum = name.replace("aux_", "");
      await this.sendCommand(`set_aux_${auxNum}`);
    } else {
      await this.sendCommand(`set_${name}`);
    }
  }

  async setTemps(
    poolTemp: number,
    spaTemp: number,
  ): Promise<void> {
    await this.sendCommand("set_temps", {
      temp_pool: String(poolTemp),
      temp_spa: String(spaTemp),
    });
  }

  async setLight(
    name: string,
    params: Record<string, string>,
  ): Promise<void> {
    await this.sendCommand("set_light", {
      aux: name,
      ...params,
    });
  }

  async setHeater(heaterName: string): Promise<void> {
    await this.sendCommand(`set_${heaterName}`);
  }
}

AqualinkSystem.registerType("iaqua", IaquaSystem);
