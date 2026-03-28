import { AqualinkSystem, type SystemType } from "../../system.ts";
import { IAQUA_SESSION_URL, HTTP_HEADERS } from "../../constants.ts";
import {
  AqualinkServiceError,
  AqualinkSystemOfflineError,
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
    this.parseHomeResponse(homeRaw.home_screen ?? []);

    const devicesRaw = (await this.sendCommand("get_devices")) as IaquaDevicesWrappedResponse;
    this.parseDevicesResponse(devicesRaw.devices_screen ?? []);
  }

  async sendCommand(
    command: string,
    extraParams?: Record<string, string>,
  ): Promise<unknown> {
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

    const response = await fetch(url, { headers: HTTP_HEADERS });

    if (!response.ok) {
      if (response.status === 401) {
        throw new AqualinkServiceError("Session expired", 401);
      }
      throw new AqualinkServiceError(
        `iAqua command ${command} failed: ${response.status}`,
        response.status,
      );
    }

    return response.json();
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

  async setSwitch(name: string, state: "1" | "0"): Promise<void> {
    const command = name.startsWith("aux_") ? "set_aux" : `set_${name}`;
    await this.sendCommand(command, {
      [`${name}`]: state,
    });
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

  async setHeater(
    heaterName: string,
    state: "1" | "0",
  ): Promise<void> {
    await this.sendCommand(`set_${heaterName}`, {
      [heaterName]: state,
    });
  }
}

AqualinkSystem.registerType("iaqua", IaquaSystem);
