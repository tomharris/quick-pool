import type { AqualinkClient } from "./client.ts";
import type { AqualinkDevice } from "./devices/base.ts";
import type { DeviceListEntry } from "./types.ts";
import { MIN_SECS_TO_REFRESH } from "./constants.ts";

export type SystemType = "iaqua" | "exo";

const systemRegistry = new Map<
  string,
  new (serial: string, data: DeviceListEntry, client: AqualinkClient) => AqualinkSystem
>();

export abstract class AqualinkSystem {
  readonly devices = new Map<string, AqualinkDevice>();
  online = true;
  lastRefresh: number = 0;
  abstract readonly type: SystemType;
  abstract readonly tempUnit: string;

  constructor(
    public readonly serial: string,
    protected readonly data: DeviceListEntry,
    protected readonly client: AqualinkClient,
  ) {}

  get name(): string {
    return String(this.data.name ?? this.serial);
  }

  static registerType(
    name: string,
    ctor: new (serial: string, data: DeviceListEntry, client: AqualinkClient) => AqualinkSystem,
  ): void {
    systemRegistry.set(name, ctor);
  }

  static fromData(
    data: DeviceListEntry,
    client: AqualinkClient,
  ): AqualinkSystem {
    // The device_type field distinguishes iAqua from eXO systems.
    // iAqua devices have device_type "iaqua", eXO have "exo".
    const typeName = data.device_type ?? "iaqua";
    const Ctor = systemRegistry.get(typeName);
    if (!Ctor) {
      throw new Error(`Unknown system type: ${typeName}`);
    }
    return new Ctor(data.serial_number, data, client);
  }

  /** Fetch latest device state from the API (rate-limited). */
  async update(): Promise<void> {
    const now = Date.now() / 1000;
    const delta = now - this.lastRefresh;
    if (delta < MIN_SECS_TO_REFRESH) {
      return;
    }
    await this.fetchDevices();
    this.lastRefresh = Date.now() / 1000;
  }

  protected abstract fetchDevices(): Promise<void>;
}
