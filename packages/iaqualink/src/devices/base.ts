import type { AqualinkSystem } from "../system.js";

export abstract class AqualinkDevice {
  constructor(
    public readonly name: string,
    public readonly label: string,
    protected data: Record<string, unknown>,
    protected readonly system: AqualinkSystem,
  ) {}

  get state(): string {
    return String(this.data["state"] ?? "unknown");
  }

  /** Merge new data from an API response into this device. */
  updateData(newData: Record<string, unknown>): void {
    this.data = { ...this.data, ...newData };
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
