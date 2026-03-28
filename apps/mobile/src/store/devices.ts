import { create } from "zustand";
import {
  AqualinkSystem,
  AqualinkDevice,
  AqualinkSwitch,
} from "@quick-pool/iaqualink";
import { useAuthStore } from "./auth";

interface DevicesState {
  systems: Map<string, AqualinkSystem>;
  activeSystemSerial: string | null;
  isLoading: boolean;
  error: string | null;
  lastRefresh: number | null;

  loadSystems: () => Promise<void>;
  refreshDevices: () => Promise<void>;
  toggleDevice: (deviceName: string) => Promise<void>;
  setActiveSystem: (serial: string) => void;
}

export const useDevicesStore = create<DevicesState>((set, get) => ({
  systems: new Map(),
  activeSystemSerial: null,
  isLoading: false,
  error: null,
  lastRefresh: null,

  loadSystems: async () => {
    set({ isLoading: true, error: null });
    try {
      const { client } = useAuthStore.getState();
      const systems = await client.getSystems();
      const firstSerial = systems.keys().next().value ?? null;

      set({
        systems,
        activeSystemSerial: firstSerial,
        isLoading: false,
      });

      // Fetch devices for the active system
      if (firstSerial) {
        const system = systems.get(firstSerial)!;
        await system.update();
        set({ lastRefresh: Date.now() });
      }
    } catch (e) {
      set({
        isLoading: false,
        error: e instanceof Error ? e.message : "Failed to load systems",
      });
    }
  },

  refreshDevices: async () => {
    const { systems, activeSystemSerial } = get();
    if (!activeSystemSerial) return;

    const system = systems.get(activeSystemSerial);
    if (!system) return;

    set({ error: null });
    try {
      // Force refresh by resetting lastRefresh on the system
      system.lastRefresh = 0;
      await system.update();
      set({ lastRefresh: Date.now() });
    } catch (e) {
      set({
        error: e instanceof Error ? e.message : "Failed to refresh",
      });
    }
  },

  toggleDevice: async (deviceName: string) => {
    const { systems, activeSystemSerial } = get();
    if (!activeSystemSerial) return;

    const system = systems.get(activeSystemSerial);
    if (!system) return;

    const device = system.devices.get(deviceName);
    if (!device || !(device instanceof AqualinkSwitch)) return;

    try {
      if (device.isOn) {
        await device.turnOff();
      } else {
        await device.turnOn();
      }
      // Refresh to get confirmed state
      system.lastRefresh = 0;
      await system.update();
      set({ lastRefresh: Date.now() });
    } catch (e) {
      set({
        error: e instanceof Error ? e.message : "Failed to toggle device",
      });
    }
  },

  setActiveSystem: (serial: string) => {
    set({ activeSystemSerial: serial });
  },
}));
