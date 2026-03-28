# Quick Pool — iAqualink Mobile App Design Spec

## Context

The official Jandy iAqualink app has a poor UX. This project builds a custom iOS (and later Android) app to control iAqualink pool equipment with a better interface, widget support, and eventually automation/scheduling.

The iAqualink REST API is undocumented but well-understood via the [iaqualink-py](https://github.com/flz/iaqualink-py) Python library, which serves as the reference implementation.

## Goals

- Full control of iAqualink pool equipment (temps, pumps, heaters, lights, aux switches)
- Support both iAqua and eXO system types
- Better UX than the official app — status-first dashboard, fast toggles
- Cross-platform (iOS first, Android later) via React Native + TypeScript
- Built incrementally in logical phases

## Non-Goals (for now)

- Automation and scheduling (Phase 4)
- iOS widgets (Phase 3)
- Backend service (Phase 4)
- HomeKit / Home Assistant integration

---

## Architecture

### Monorepo Structure

```
quick-pool/
├── packages/
│   └── iaqualink/              # TypeScript API client library
│       ├── src/
│       │   ├── client.ts       # Auth, HTTP, system discovery
│       │   ├── system.ts       # Base system + factory
│       │   ├── systems/
│       │   │   ├── iaqua/
│       │   │   │   ├── system.ts
│       │   │   │   └── devices.ts
│       │   │   └── exo/
│       │   │       ├── system.ts
│       │   │       └── devices.ts
│       │   ├── devices/
│       │   │   ├── base.ts     # AqualinkDevice, Switch, Sensor
│       │   │   ├── thermostat.ts
│       │   │   └── light.ts
│       │   ├── constants.ts
│       │   └── types.ts
│       ├── __tests__/
│       ├── package.json
│       └── tsconfig.json
├── apps/
│   └── mobile/                 # React Native app
│       ├── src/
│       │   ├── screens/
│       │   │   ├── DashboardScreen.tsx
│       │   │   ├── DeviceDetailScreen.tsx
│       │   │   └── SettingsScreen.tsx
│       │   ├── components/
│       │   │   ├── TemperatureDisplay.tsx
│       │   │   ├── DeviceTile.tsx
│       │   │   ├── ThermostatControl.tsx
│       │   │   └── LightControl.tsx
│       │   ├── hooks/
│       │   │   ├── useAuth.ts
│       │   │   ├── useSystem.ts
│       │   │   └── useDevices.ts
│       │   └── store/          # Zustand or React Context
│       ├── app.json
│       └── package.json
├── package.json                # Workspace root
└── tsconfig.base.json
```

---

## Phase 1: TypeScript API Client (`packages/iaqualink`)

A standalone, framework-agnostic TypeScript package that wraps the iAqualink REST API.

### Authentication

Both system types share a single login endpoint:

- Login: `POST https://prod.zodiac-io.com/users/v1/login`
  - Body: `{ api_key: "EOOEMOW4YR6QNB07", email, password }`
  - Response contains credentials used by both systems:
    - `session_id` — used by iAqua
    - `authentication_token` — used by iAqua
    - `id` (user_id) — used by iAqua
    - `userPoolOAuth.IdToken` — JWT used by eXO

**iAqua auth flow:**
- Device discovery: `GET https://r-api.iaqualink.net/devices.json?authentication_token={token}&user_id={id}`
- Session commands: `GET https://p-api.iaqualink.net/v1/mobile/session.json?actionID=command&command={cmd}&serial={serial}&sessionID={session_id}`
- All auth is via query parameters, no auth headers

**eXO auth flow:**
- Shadow state: `GET/POST https://prod.zodiac-io.com/devices/v1/{serial}/shadow`
- Auth via `Authorization: {IdToken}` header
- Auto-refresh: on 401, call `login()` again to get a fresh IdToken

### System Discovery

- `client.getSystems()` returns a map of serial -> system
- Factory pattern auto-detects iAqua vs eXO from device data
- Each system tracks its devices and last refresh time

### Device Model

| Base Type | Capabilities | Examples |
|-----------|-------------|----------|
| `AqualinkSensor` | Read-only value | `pool_temp`, `spa_temp`, `air_temp` |
| `AqualinkSwitch` | On/off toggle | `pool_pump`, `spa_pump`, `freeze_protection` |
| `AqualinkThermostat` | Set temperature + on/off | `pool_set_point`, `spa_set_point` |
| `AqualinkLight` | Toggle, brightness, color | `aux_1` (when light type) |

### iAqua API Specifics

- Polling: two GET calls per update (`get_home` + `get_devices`) to `p-api.iaqualink.net`
- Commands: GET with `command=set_aux|set_temps|set_light|set_pool_heater|...`
- Rate limit: 5-second minimum between refreshes (cached responses within window)
- User-Agent: `okhttp/3.14.7`

#### iAqua Response Formats

The two endpoints use different data shapes — this is a common source of bugs.

**`get_home` → `home_screen`**: Array where index 0 is status, index 3 is `temp_scale`, and index 4+ are device entries. Each entry is a single-key object with a **plain string value** — even for sensors and thermostats:
```json
[
  {"status": "Online"},
  {}, {},
  {"temp_scale": "F"},
  {"pool_temp": "78"},
  {"spa_temp": "102"},
  {"air_temp": "85"},
  {"pool_set_point": "82"},
  {"aux_1": "0"}
]
```

**`get_devices` → `devices_screen`**: Array where index 0 is status and index 3+ are device entries. Each entry is a single-key object whose value is an **array of single-key objects** (attribute bags). Only contains configurable devices (aux, not temp sensors):
```json
[
  {"status": "Online"},
  {"response": ""},
  {"group": "1"},
  {"aux_1": [{"state": "0"}, {"label": "Pool Light"}, {"type": "light"}, {"subtype": "color"}]}
]
```

**Key implication**: Temperature sensors (`pool_temp`, `spa_temp`, `air_temp`) only appear in `home_screen` as flat strings. They are **not** present in `devices_screen`. The device factory must handle creating sensors from string values, not just updating existing ones.

### eXO API Specifics

- Single shadow endpoint: `GET/POST https://prod.zodiac-io.com/devices/v1/{serial}/shadow`
- AWS IoT Shadow pattern: `{ state: { reported: {...}, desired: {...} } }`
- Auto-refresh JWT on 401 responses
- Temperature unit hardcoded to Celsius

### Error Handling

- 401 -> re-authenticate automatically
- Offline systems -> `AqualinkSystemOfflineError`
- Invalid params -> `AqualinkInvalidParameterError`
- Network errors -> propagate with context

### Testing Strategy

- Unit tests with mocked HTTP responses (matching Python library's test patterns)
- Integration test script that can run against real API (optional, not in CI)

---

## Phase 2: React Native Mobile App (`apps/mobile`)

### Dashboard Screen (Status Dashboard layout)

- **Temperature section** (top): Pool, Spa, Air temps displayed prominently
- **Device grid** (below): 2-column grid of device tiles
  - Each tile shows: device name, current state (on/off/value), status color
  - Tap to toggle (switches) or navigate to detail (thermostats, lights)
- **Pull-to-refresh**: triggers `system.update()`
- **Auto-poll**: every 30 seconds (respects 5s rate limit)

### Device Detail Screen

- **Thermostat**: temperature slider with min/max bounds, current temp display, on/off toggle
- **Light**: on/off toggle, brightness slider (0/25/50/75/100 for dimmable), color effect picker for color lights
- **Switch**: simple on/off with confirmation

### Settings Screen

- Login form (email/password) -> credentials stored in iOS Keychain / Android Keystore
- Temperature unit preference (°F/°C)
- System selector (if account has multiple systems)
- About / version info

### Data Flow

1. App launch -> check secure storage for credentials
2. Authenticated -> `getSystems()` -> `getDevices()` -> render dashboard
3. Pull-to-refresh or 30s timer -> `system.update()`
4. Device control -> optimistic UI update + API call -> re-fetch to confirm state
5. Auth failure -> redirect to login

### State Management

- Zustand store (lightweight, works well with React Native)
- Slices: auth, system, devices
- Optimistic updates with rollback on API failure

---

## Phase 3: Polish & Widgets (future)

- iOS widgets: at-a-glance temps, one-tap quick toggles
- Scenes/quick actions: "Swim Mode", "Spa Night" (activate multiple devices)
- Improved thermostat UI (circular dial)
- Haptic feedback on toggles

## Phase 4: Automation & Backend (future)

- Lightweight Go or Node backend service
- Scheduling engine (cron-style rules)
- Push notifications (device state changes, alerts)
- The app becomes a client to both backend and iAqualink API

---

## Verification Plan

### Phase 1 (API Client)
1. Run unit tests: `cd packages/iaqualink && npm test`
2. Manual integration test: create a test script that logs in, lists systems, lists devices, and toggles a safe device (e.g., a light)
3. Verify both iAqua and eXO code paths compile and type-check

### Phase 2 (Mobile App)
1. Run on iOS Simulator: `cd apps/mobile && npx react-native run-ios`
2. Login with real iAqualink credentials
3. Verify dashboard shows correct temperatures and device states
4. Toggle a device (light recommended) and verify state change
5. Pull-to-refresh and verify updated data
