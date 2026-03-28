import {
  AqualinkSensor,
  AqualinkSwitch,
} from "../../devices/base.js";
import { AqualinkThermostat } from "../../devices/thermostat.js";
import type { AqualinkSystem } from "../../system.js";
import type { ExoSystem } from "./system.js";
import type { ExoReportedState } from "../../types.js";

// --- eXO device implementations ---

export class ExoSensor extends AqualinkSensor {}

export class ExoAuxSwitch extends AqualinkSwitch {
  async turnOn(): Promise<void> {
    await (this.system as ExoSystem).setAux(this.name, 1);
  }

  async turnOff(): Promise<void> {
    await (this.system as ExoSystem).setAux(this.name, 0);
  }
}

export class ExoToggleSwitch extends AqualinkSwitch {
  async turnOn(): Promise<void> {
    await (this.system as ExoSystem).setToggle(this.name, 1);
  }

  async turnOff(): Promise<void> {
    await (this.system as ExoSystem).setToggle(this.name, 0);
  }
}

export class ExoThermostat extends AqualinkThermostat {
  async turnOn(): Promise<void> {
    await (this.system as ExoSystem).setHeating({ enabled: true });
  }

  async turnOff(): Promise<void> {
    await (this.system as ExoSystem).setHeating({ enabled: false });
  }

  async setTemperature(temp: number): Promise<void> {
    await (this.system as ExoSystem).setHeating({ sp: temp });
  }
}

// --- Known toggle names ---
const TOGGLES = new Set(["production", "boost", "low"]);

/**
 * Parse eXO shadow reported state into devices.
 */
export function parseExoDevices(
  reported: ExoReportedState,
  system: AqualinkSystem,
): void {
  // Parse sensors (sns_* keys)
  for (const [key, value] of Object.entries(reported)) {
    if (key.startsWith("sns_") && typeof value === "object" && value !== null) {
      const sensorData = value as Record<string, unknown>;
      const sensorType = String(sensorData["sensor_type"] ?? key);
      const existing = system.devices.get(key);
      if (existing) {
        existing.updateData(sensorData);
      } else {
        system.devices.set(
          key,
          new ExoSensor(key, sensorType, sensorData, system),
        );
      }
    }
  }

  // Parse heating
  if (reported.heating) {
    const heatingData = reported.heating as Record<string, unknown>;
    const existing = system.devices.get("heating");
    if (existing) {
      existing.updateData(heatingData);
    } else {
      system.devices.set(
        "heating",
        new ExoThermostat("heating", "Heating", heatingData, system),
      );
    }
  }

  // Parse equipment switches (equipment.swc_0.*)
  const swc = reported.equipment?.swc_0;
  if (swc && typeof swc === "object") {
    for (const [key, value] of Object.entries(swc)) {
      if (key.startsWith("aux_")) {
        const auxData =
          typeof value === "object" && value !== null
            ? (value as Record<string, unknown>)
            : { state: String(value) };
        const existing = system.devices.get(key);
        if (existing) {
          existing.updateData(auxData);
        } else {
          system.devices.set(
            key,
            new ExoAuxSwitch(key, key, auxData, system),
          );
        }
      } else if (TOGGLES.has(key)) {
        const toggleData = { state: String(value) };
        const existing = system.devices.get(key);
        if (existing) {
          existing.updateData(toggleData);
        } else {
          system.devices.set(
            key,
            new ExoToggleSwitch(key, key, toggleData, system),
          );
        }
      }
    }
  }
}
