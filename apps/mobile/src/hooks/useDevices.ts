import { useEffect, useRef } from "react";
import { useDevicesStore } from "../store/devices";
import {
  AqualinkDevice,
  AqualinkSensor,
  AqualinkSwitch,
  AqualinkThermostat,
  AqualinkLight,
} from "@quick-pool/iaqualink";

const POLL_INTERVAL_MS = 30_000;

/** Load systems on mount and poll for device updates. */
export function useDevicePolling() {
  const loadSystems = useDevicesStore((s) => s.loadSystems);
  const refreshDevices = useDevicesStore((s) => s.refreshDevices);
  const intervalRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined);

  useEffect(() => {
    loadSystems();

    intervalRef.current = setInterval(() => {
      refreshDevices();
    }, POLL_INTERVAL_MS);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [loadSystems, refreshDevices]);
}

/** Get the active system's devices as a sorted array. */
export function useDeviceList() {
  const systems = useDevicesStore((s) => s.systems);
  const activeSerial = useDevicesStore((s) => s.activeSystemSerial);
  // Subscribe to lastRefresh so we re-render when devices update
  useDevicesStore((s) => s.lastRefresh);

  if (!activeSerial) return [];

  const system = systems.get(activeSerial);
  if (!system) return [];

  return Array.from(system.devices.values());
}

const PUMP_AND_HEATER_NAMES = new Set([
  "pool_pump",
  "spa_pump",
  "pool_heater",
  "spa_heater",
  "solar_heater",
]);

/** Get devices grouped by type for the dashboard. */
export function useGroupedDevices() {
  const devices = useDeviceList();

  const sensors: AqualinkDevice[] = [];
  const pumpsAndHeaters: AqualinkDevice[] = [];
  const switches: AqualinkDevice[] = [];
  const thermostats: AqualinkDevice[] = [];
  const lights: AqualinkDevice[] = [];

  for (const device of devices) {
    // Hide unconfigured aux devices (no label set in iAqualink controller)
    if (device.name.startsWith("aux_") && !device.hasCustomLabel) continue;

    if (device instanceof AqualinkThermostat) {
      thermostats.push(device);
    } else if (device instanceof AqualinkLight) {
      lights.push(device);
    } else if (device instanceof AqualinkSwitch && PUMP_AND_HEATER_NAMES.has(device.name)) {
      pumpsAndHeaters.push(device);
    } else if (device instanceof AqualinkSwitch) {
      switches.push(device);
    } else if (device instanceof AqualinkSensor) {
      sensors.push(device);
    }
  }

  return { sensors, pumpsAndHeaters, switches, thermostats, lights };
}
