# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build & Test Commands

```bash
# Install all dependencies (monorepo root)
bun install

# API client package
cd packages/iaqualink
bun test              # Run all tests (bun:test)
bun test --filter "client"  # Run tests matching pattern
bunx tsc --noEmit     # Type-check without emitting

# Mobile app
cd apps/mobile
bunx tsc --noEmit     # Type-check
npx expo start        # Dev server (use Expo Go on phone to connect)
```

## Architecture

Bun-managed monorepo with two workspaces:

- **`packages/iaqualink`** — Standalone TypeScript API client for Jandy iAqualink pool equipment. No React Native dependencies; uses only `fetch`. Supports two system types:
  - **iAqua**: REST via `p-api.iaqualink.net` (GET with query params for auth)
  - **eXO**: AWS IoT Shadow via `prod.zodiac-io.com` (JWT Authorization header)

  Both share a login endpoint (`prod.zodiac-io.com/users/v1/login`) but use different credentials from the response.

- **`apps/mobile`** — Expo React Native app consuming the iaqualink package via `workspace:*`. Uses Zustand for state, expo-secure-store for credentials, React Navigation for routing.

## Key Patterns

**System registry**: `AqualinkSystem.registerType()` registers iAqua/eXO constructors. `fromData()` factory dispatches based on `device_type`. Side-effect imports in `index.ts` trigger registration.

**Device factory**: iAqua devices are identified by name pattern (`pool_temp` → sensor, `aux_*` → switch/light based on subtype). eXO devices are parsed from shadow state structure (`sns_*` → sensor, `equipment.swc_0.*` → switches).

**Rate limiting**: `system.update()` skips API calls if < 5 seconds since last refresh. Mobile app polls every 30 seconds and supports pull-to-refresh.

**Mobile state flow**: Auth store holds `AqualinkClient` instance → devices store calls `client.getSystems()` → systems own their device maps → components subscribe to `lastRefresh` timestamp to trigger re-renders.

## Workspace Linking

The mobile app resolves `@quick-pool/iaqualink` via a tsconfig paths alias pointing to the package's source (`../../packages/iaqualink/src/index.ts`), not the built `dist/`. This means changes to the API client are immediately reflected without a build step.

## Reference

Design spec with full API details (endpoints, auth flows, device types): `docs/superpowers/specs/2026-03-28-quick-pool-design.md`

Reference Python implementation: https://github.com/flz/iaqualink-py
