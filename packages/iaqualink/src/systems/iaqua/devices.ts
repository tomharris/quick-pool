import {
  AqualinkSensor,
  AqualinkSwitch,
} from "../../devices/base.ts";
import { AqualinkThermostat } from "../../devices/thermostat.ts";
import { AqualinkLight, type Brightness } from "../../devices/light.ts";
import type { AqualinkSystem } from "../../system.ts";
import type { IaquaSystem } from "./system.ts";

// --- iAqua device implementations ---

export class IaquaSensor extends AqualinkSensor {}

export class IaquaSwitch extends AqualinkSwitch {
  async turnOn(): Promise<void> {
    await (this.system as IaquaSystem).setSwitch(this.name, "1");
  }

  async turnOff(): Promise<void> {
    await (this.system as IaquaSystem).setSwitch(this.name, "0");
  }
}

export class IaquaThermostat extends AqualinkThermostat {
  async turnOn(): Promise<void> {
    await (this.system as IaquaSystem).setHeater(this.name, "1");
  }

  async turnOff(): Promise<void> {
    await (this.system as IaquaSystem).setHeater(this.name, "0");
  }

  async setTemperature(temp: number): Promise<void> {
    // iAqua requires both pool and spa temps in a single request.
    // Read the other thermostat's current setpoint to send both.
    const isPool = this.name.includes("pool");
    const otherName = isPool ? "spa_set_point" : "pool_set_point";
    const otherDevice = this.system.devices.get(otherName) as IaquaThermostat | undefined;
    const otherTemp = otherDevice?.targetTemperature ?? temp;

    const poolTemp = isPool ? temp : otherTemp;
    const spaTemp = isPool ? otherTemp : temp;

    await (this.system as IaquaSystem).setTemps(poolTemp, spaTemp);
  }
}

export class IaquaLightSwitch extends AqualinkLight {
  async turnOn(): Promise<void> {
    await (this.system as IaquaSystem).setSwitch(this.name, "1");
  }

  async turnOff(): Promise<void> {
    await (this.system as IaquaSystem).setSwitch(this.name, "0");
  }

  async toggle(): Promise<void> {
    if (this.isOn) {
      await this.turnOff();
    } else {
      await this.turnOn();
    }
  }
}

export class IaquaDimmableLight extends IaquaLightSwitch {
  override get isDimmable(): boolean {
    return true;
  }

  async setBrightness(level: Brightness): Promise<void> {
    await (this.system as IaquaSystem).setLight(this.name, {
      brightness: String(level),
    });
  }
}

export class IaquaColorLight extends IaquaDimmableLight {
  override get isColor(): boolean {
    return true;
  }

  async setEffectByName(effectName: string): Promise<void> {
    await (this.system as IaquaSystem).setLight(this.name, {
      effect: effectName,
    });
  }

  async setEffectById(effectId: number): Promise<void> {
    await (this.system as IaquaSystem).setLight(this.name, {
      effect_id: String(effectId),
    });
  }
}

/** Convert "aux_1" → "Aux 1", "pool_temp" → "Pool Temp" */
function humanizeName(name: string): string {
  return name
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

// --- Device name patterns for factory ---

const TEMP_SENSORS = new Set(["pool_temp", "spa_temp", "air_temp"]);
const THERMOSTATS = new Set(["pool_set_point", "spa_set_point"]);
const PUMPS_AND_HEATERS = new Set([
  "pool_pump",
  "spa_pump",
  "pool_heater",
  "spa_heater",
  "solar_heater",
]);

/**
 * Flatten an array of single-key objects into one object.
 * devices_screen returns attributes like: [{"state":"0"},{"label":"Pool Light"},...]
 * This merges them into: {"state":"0","label":"Pool Light",...}
 */
function flattenAttrs(arr: unknown[]): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const item of arr) {
    if (typeof item === "object" && item !== null) {
      Object.assign(result, item);
    }
  }
  return result;
}

/**
 * Parse a single entry from an iAqua API response and add/update
 * the corresponding device in the system's device map.
 */
export function parseIaquaDevices(
  entry: Record<string, unknown>,
  system: AqualinkSystem,
): void {
  // Each entry in the response is an object with a single key (the device name)
  // whose value is either a flat object (home_screen) or an array of
  // single-key objects (devices_screen).
  for (const [name, rawValue] of Object.entries(entry)) {
    // home_screen returns simple string state values like { "pool_temp": "78" }
    if (typeof rawValue === "string") {
      const existing = system.devices.get(name);
      if (existing) {
        existing.updateData({ state: rawValue });
      } else if (TEMP_SENSORS.has(name)) {
        system.devices.set(
          name,
          new IaquaSensor(name, humanizeName(name), { state: rawValue }, system, false),
        );
      }
      continue;
    }
    if (typeof rawValue !== "object" || rawValue === null) continue;
    const deviceData = Array.isArray(rawValue)
      ? flattenAttrs(rawValue)
      : (rawValue as Record<string, unknown>);
    const hasCustomLabel = Boolean(deviceData["label"]);
    const label = String(deviceData["label"] ?? humanizeName(name));

    // Update existing device or create new one
    const existing = system.devices.get(name);
    if (existing) {
      existing.updateData(deviceData);
      continue;
    }

    // Create device based on name pattern
    if (TEMP_SENSORS.has(name)) {
      system.devices.set(
        name,
        new IaquaSensor(name, label, deviceData, system, hasCustomLabel),
      );
    } else if (THERMOSTATS.has(name)) {
      system.devices.set(
        name,
        new IaquaThermostat(name, label, deviceData, system, hasCustomLabel),
      );
    } else if (PUMPS_AND_HEATERS.has(name)) {
      system.devices.set(
        name,
        new IaquaSwitch(name, label, deviceData, system, hasCustomLabel),
      );
    } else if (name.startsWith("aux_")) {
      // Determine if this aux is a light based on device data
      const subtype = String(deviceData["subtype"] ?? "");
      const type = String(deviceData["type"] ?? "");

      if (subtype.includes("color") || type.includes("color")) {
        system.devices.set(
          name,
          new IaquaColorLight(name, label, deviceData, system, hasCustomLabel),
        );
      } else if (subtype.includes("dimmer") || type.includes("dimmer")) {
        system.devices.set(
          name,
          new IaquaDimmableLight(name, label, deviceData, system, hasCustomLabel),
        );
      } else if (subtype.includes("light") || type.includes("light")) {
        system.devices.set(
          name,
          new IaquaLightSwitch(name, label, deviceData, system, hasCustomLabel),
        );
      } else {
        system.devices.set(
          name,
          new IaquaSwitch(name, label, deviceData, system, hasCustomLabel),
        );
      }
    }
    // Skip unknown device types silently (matches Python library behavior)
  }
}
