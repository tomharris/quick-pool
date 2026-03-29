# One-Touch Scenes on Dashboard

## Overview

Add iAqualink one-touch scenes to the mobile dashboard as toggleable buttons in a new "Scenes" section, using the existing device model infrastructure.

## Background

Jandy AquaLink controllers support up to 6 one-touch scenes (pre-configured on the physical controller). Each scene activates a set of device states simultaneously (e.g., "Spa Night" = spa pump on, heater to 102, spa light on). The iAqualink API exposes them via dedicated `get_onetouch` / `set_onetouch_{n}` commands, separate from the `get_home` and `get_devices` endpoints.

- Scene 1 is always "All Off" (state always 0, acts as master shutoff)
- Scenes 2-6 are user-configured and toggleable (on/off state)

## Device Model

New `IaquaOneTouch` class extending `AqualinkSwitch`:

- Stored in `system.devices` under keys `onetouch_1` through `onetouch_6`
- `turnOn()` / `turnOff()` call `IaquaSystem.setOneTouch(name)` which sends `set_onetouch_{n}`
- Scene 1 ("All Off") included as a normal tile — tapping activates it, but it always reads as state 0

## API Integration

### Fetching

`IaquaSystem.fetchDevices()` gains a third API call:

```
command=get_onetouch&serial={serial}&sessionID={sessionID}
```

Response follows the same iAqua pattern as `devices_screen`: array of single-key objects with attribute arrays containing `state`, `label`, etc.

### Parsing

`parseIaquaDevices` gets a new branch: `name.startsWith("onetouch_")` creates `IaquaOneTouch` instances. Unconfigured scenes (no label or empty label) are skipped via the existing `hasCustomLabel` filtering in the `useGroupedDevices` hook — but one-touch scenes from the controller typically always have labels, so we include all of them (set `hasCustomLabel = true`).

### Commands

New `IaquaSystem.setOneTouch(name: string)` method:

```typescript
async setOneTouch(name: string): Promise<void> {
  const num = name.replace("onetouch_", "");
  await this.sendCommand(`set_onetouch_${num}`);
}
```

## Dashboard Integration

### Layout order

1. TemperatureDisplay (existing)
2. EquipmentToggles (existing)
3. **SceneToggles (new)** — "Scenes" section title + 2-column grid of scene tiles
4. Error container (existing)
5. "Devices" section title + FlatList (existing)

### Hook changes

`useGroupedDevices` returns a new `scenes` array filtered by `instanceof IaquaOneTouch`.

### New component: SceneToggles

Mirrors the `EquipmentToggles` pattern: receives an array of devices and an `onToggle` callback, renders them in a 2-column layout using `DeviceTile`.

### Dashboard handler

`handleDevicePress` treats `IaquaOneTouch` same as `AqualinkSwitch` — calls `toggleDevice`.

## Scope exclusions

- No eXO support (eXO systems don't have one-touch scenes)
- No scene editing/configuration (done on the physical pool controller)
- No special UI treatment for "All Off" beyond the standard toggle tile
