import { AqualinkSwitch } from "./base.js";

export type Brightness = 0 | 25 | 50 | 75 | 100;

export abstract class AqualinkLight extends AqualinkSwitch {
  get brightness(): Brightness | null {
    const b = this.data["brightness"];
    return b != null ? (Number(b) as Brightness) : null;
  }

  get isDimmable(): boolean {
    return false;
  }

  get isColor(): boolean {
    return false;
  }

  abstract toggle(): Promise<void>;
}
