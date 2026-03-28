import type { AqualinkSystem } from "../system.ts";

export abstract class AqualinkDevice {
  /** True when the API provided an explicit label (i.e. device is configured). */
  hasCustomLabel: boolean;

  constructor(
    public readonly name: string,
    public label: string,
    protected data: Record<string, unknown>,
    protected readonly system: AqualinkSystem,
    hasCustomLabel = false,
  ) {
    this.hasCustomLabel = hasCustomLabel;
  }

  get state(): string {
    return String(this.data["state"] ?? "unknown");
  }

  /** Merge new data from an API response into this device. */
  updateData(newData: Record<string, unknown>): void {
    this.data = { ...this.data, ...newData };
    if (newData["label"]) {
      this.label = String(newData["label"]);
      this.hasCustomLabel = true;
    }
  }
}

export class AqualinkSensor extends AqualinkDevice {
  get value(): string {
    return this.state;
  }
}

export class AqualinkBinarySensor extends AqualinkDevice {
  get isOn(): boolean {
    return this.state === "1" || this.state === "on";
  }
}

export abstract class AqualinkSwitch extends AqualinkBinarySensor {
  abstract turnOn(): Promise<void>;
  abstract turnOff(): Promise<void>;
}
