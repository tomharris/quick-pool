// Client
export { AqualinkClient } from "./client.ts";

// System
export { AqualinkSystem, type SystemType } from "./system.ts";

// Register system types (side-effect imports)
import "./systems/iaqua/system.ts";
import "./systems/exo/system.ts";

// Device base classes
export {
  AqualinkDevice,
  AqualinkSensor,
  AqualinkBinarySensor,
  AqualinkSwitch,
} from "./devices/base.ts";
export { AqualinkThermostat } from "./devices/thermostat.ts";
export { AqualinkLight, type Brightness } from "./devices/light.ts";

// iAqua devices
export {
  IaquaSensor,
  IaquaSwitch,
  IaquaThermostat,
  IaquaLightSwitch,
  IaquaDimmableLight,
  IaquaColorLight,
  IaquaOneTouch,
} from "./systems/iaqua/devices.ts";
export { IaquaSystem } from "./systems/iaqua/system.ts";

// eXO devices
export {
  ExoSensor,
  ExoAuxSwitch,
  ExoToggleSwitch,
  ExoThermostat,
} from "./systems/exo/devices.ts";
export { ExoSystem } from "./systems/exo/system.ts";

// Types
export type {
  LoginResponse,
  AqualinkCredentials,
  DeviceListEntry,
  IaquaDeviceData,
  ExoShadowState,
  ExoReportedState,
} from "./types.ts";

// Errors
export {
  AqualinkError,
  AqualinkServiceError,
  AqualinkUnauthorizedError,
  AqualinkSystemOfflineError,
  AqualinkInvalidParameterError,
} from "./errors.ts";

// Constants
export {
  AQUALINK_LOGIN_URL,
  AQUALINK_DEVICES_URL,
  IAQUA_SESSION_URL,
  EXO_SHADOW_URL,
  MIN_SECS_TO_REFRESH,
} from "./constants.ts";
