import { AqualinkSwitch } from "./base.ts";

export abstract class AqualinkThermostat extends AqualinkSwitch {
  get currentTemperature(): number | null {
    const temp = this.data["temp"];
    return temp != null ? Number(temp) : null;
  }

  get targetTemperature(): number | null {
    const sp = this.data["sp"] ?? this.data["set_point"];
    return sp != null ? Number(sp) : null;
  }

  get minTemperature(): number | null {
    const min = this.data["sp_min"];
    return min != null ? Number(min) : null;
  }

  get maxTemperature(): number | null {
    const max = this.data["sp_max"];
    return max != null ? Number(max) : null;
  }

  abstract setTemperature(temp: number): Promise<void>;
}
