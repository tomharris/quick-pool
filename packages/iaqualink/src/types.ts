/** Response from POST /users/v1/login */
export interface LoginResponse {
  id: string;
  session_id: string;
  authentication_token: string;
  email: string;
  first_name: string;
  last_name: string;
  userPoolOAuth: {
    IdToken: string;
    AccessToken: string;
    RefreshToken: string;
  };
}

/** Credentials extracted from login, used for subsequent API calls */
export interface AqualinkCredentials {
  userId: string;
  sessionId: string;
  authToken: string;
  idToken: string;
}

/** A device entry from GET /devices.json */
export interface DeviceListEntry {
  serial_number: string;
  device_type: string;
  name: string;
  [key: string]: unknown;
}

// --- iAqua types ---

/** Individual device data from iAqua home/devices responses */
export interface IaquaDeviceData {
  name: string;
  label: string;
  state: string;
  status: string;
  [key: string]: unknown;
}

/** Raw response from iAqua session.json?command=get_home */
export type IaquaHomeResponse = Record<string, unknown>[];

/** Raw response from iAqua session.json?command=get_devices */
export type IaquaDevicesResponse = Record<string, unknown>[];

// --- eXO types ---

/** eXO shadow state from GET /devices/v1/{serial}/shadow */
export interface ExoShadowState {
  state: {
    reported: ExoReportedState;
    desired?: Record<string, unknown>;
  };
}

export interface ExoReportedState {
  equipment?: {
    swc_0?: Record<string, unknown>;
  };
  heating?: {
    state?: string;
    sp?: number;
    enabled?: boolean;
    sp_min?: number;
    sp_max?: number;
  };
  [key: string]: unknown;
}
