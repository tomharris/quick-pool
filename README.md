# Quick Pool

A custom mobile app for controlling Jandy iAqualink pool equipment, built with React Native and TypeScript.

## Why

The official iAqualink app has a poor user experience. Quick Pool provides a faster, cleaner interface for monitoring and controlling your pool equipment — with plans for widgets, automation, and scheduling.

## Project Structure

```
quick-pool/
├── packages/
│   └── iaqualink/       # TypeScript API client library
└── apps/
    └── mobile/          # React Native (Expo) mobile app
```

**`@quick-pool/iaqualink`** is a standalone TypeScript library that wraps the iAqualink REST API. It supports both iAqua and eXO system types, handles authentication, device discovery, and control commands. It has no React Native dependencies and can be used in any TypeScript/JavaScript environment.

**`apps/mobile`** is an Expo React Native app that uses the iaqualink library to provide a dark-themed dashboard with temperature monitoring, device control (pumps, heaters, lights, aux switches), and pull-to-refresh polling.

## Getting Started

### Prerequisites

- [Bun](https://bun.sh) (package manager and test runner)
- [Expo Go](https://expo.dev/go) on your iOS or Android device (for running the mobile app)
- A Jandy iAqualink account with connected pool equipment

### Install

```bash
git clone <repo-url> quick-pool
cd quick-pool
bun install
```

### Run Tests

```bash
bun test
```

### Run the Mobile App

```bash
cd apps/mobile
npx expo start
```

Scan the QR code with Expo Go on your phone to connect.

## Supported Equipment

| Device Type | Capabilities |
|-------------|-------------|
| Temperature sensors | Pool, spa, air temp (read-only) |
| Pumps | Pool pump, spa pump (on/off) |
| Heaters | Pool, spa, solar heater (on/off) |
| Thermostats | Pool/spa setpoints (set temperature) |
| Lights | Toggle, brightness (25% steps), color effects |
| Aux switches | On/off toggle |

Both **iAqua** (traditional iAqualink controllers) and **eXO** (Zodiac eXO controllers) systems are supported.

## Roadmap

- **Phase 1**: TypeScript API client -- done
- **Phase 2**: Core mobile app (dashboard, device control, settings) -- done
- **Phase 3**: iOS/Android widgets, scenes, UI polish
- **Phase 4**: Backend service for automation and scheduling

## Acknowledgments

API implementation based on [iaqualink-py](https://github.com/flz/iaqualink-py) by flz.
