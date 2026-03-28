// Client
export { AqualinkClient } from "./client.js";

// System
export { AqualinkSystem, type SystemType } from "./system.js";

// Register system types (side-effect imports)
import "./systems/iaqua/system.js";
import "./systems/exo/system.js";

// Device base classes
export {
  AqualinkDevice,
  AqualinkSensor,
  AqualinkBinarySensor,
  AqualinkSwitch,
} from "./devices/base.js";
export { AqualinkThermostat } from "./devices/thermostat.js";
export { AqualinkLight, type Brightness } from "./devices/light.js";

// iAqua devices
export {
  IaquaSensor,
  IaquaSwitch,
  IaquaThermostat,
  IaquaLightSwitch,
  IaquaDimmableLight,
  IaquaColorLight,
} from "./systems/iaqua/devices.js";
export { IaquaSystem } from "./systems/iaqua/system.js";

// eXO devices
export {
  ExoSensor,
  ExoAuxSwitch,
  ExoToggleSwitch,
  ExoThermostat,
} from "./systems/exo/devices.js";
export { ExoSystem } from "./systems/exo/system.js";

// Types
export type {
  LoginResponse,
  AqualinkCredentials,
  DeviceListEntry,
  IaquaDeviceData,
  ExoShadowState,
  ExoReportedState,
} from "./types.js";

// Errors
export {
  AqualinkError,
  AqualinkServiceError,
  AqualinkUnauthorizedError,
  AqualinkSystemOfflineError,
  AqualinkInvalidParameterError,
} from "./errors.js";

// Constants
export {
  AQUALINK_LOGIN_URL,
  AQUALINK_DEVICES_URL,
  IAQUA_SESSION_URL,
  EXO_SHADOW_URL,
  MIN_SECS_TO_REFRESH,
} from "./constants.js";
