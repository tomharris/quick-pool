import {
  AqualinkSensor,
  AqualinkSwitch,
} from "../../devices/base.js";
import { AqualinkThermostat } from "../../devices/thermostat.js";
import { AqualinkLight, type Brightness } from "../../devices/light.js";
import type { AqualinkSystem } from "../../system.js";
import type { IaquaSystem } from "./system.js";

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
 * Parse a single entry from an iAqua API response and add/update
 * the corresponding device in the system's device map.
 */
export function parseIaquaDevices(
  entry: Record<string, unknown>,
  system: AqualinkSystem,
): void {
  // Each entry in the response is an object with a single key (the device name)
  // whose value is the device data.
  for (const [name, rawValue] of Object.entries(entry)) {
    if (typeof rawValue !== "object" || rawValue === null) continue;
    const deviceData = rawValue as Record<string, unknown>;
    const label = String(deviceData["label"] ?? name);

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
        new IaquaSensor(name, label, deviceData, system),
      );
    } else if (THERMOSTATS.has(name)) {
      system.devices.set(
        name,
        new IaquaThermostat(name, label, deviceData, system),
      );
    } else if (PUMPS_AND_HEATERS.has(name)) {
      system.devices.set(
        name,
        new IaquaSwitch(name, label, deviceData, system),
      );
    } else if (name.startsWith("aux_")) {
      // Determine if this aux is a light based on device data
      const subtype = String(deviceData["subtype"] ?? "");
      const type = String(deviceData["type"] ?? "");

      if (subtype.includes("color") || type.includes("color")) {
        system.devices.set(
          name,
          new IaquaColorLight(name, label, deviceData, system),
        );
      } else if (subtype.includes("dimmer") || type.includes("dimmer")) {
        system.devices.set(
          name,
          new IaquaDimmableLight(name, label, deviceData, system),
        );
      } else if (subtype.includes("light") || type.includes("light")) {
        system.devices.set(
          name,
          new IaquaLightSwitch(name, label, deviceData, system),
        );
      } else {
        system.devices.set(
          name,
          new IaquaSwitch(name, label, deviceData, system),
        );
      }
    }
    // Skip unknown device types silently (matches Python library behavior)
  }
}
