# One-Touch Scenes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add iAqualink one-touch scenes to the mobile dashboard as toggleable buttons in a "Scenes" section between equipment and devices.

**Architecture:** New `IaquaOneTouch` device class extending `AqualinkSwitch`, fetched via `get_onetouch` API command alongside existing `get_home`/`get_devices`. Dashboard gets a `SceneToggles` component (mirroring `EquipmentToggles`) rendered between the equipment section and the devices grid.

**Tech Stack:** TypeScript, bun:test, React Native (Expo), Zustand

---

## File Map

| Action | File | Responsibility |
|--------|------|----------------|
| Modify | `packages/iaqualink/src/systems/iaqua/devices.ts` | Add `IaquaOneTouch` class + parse `onetouch_*` in factory |
| Modify | `packages/iaqualink/src/systems/iaqua/system.ts` | Add `get_onetouch` fetch + `setOneTouch()` command |
| Modify | `packages/iaqualink/src/types.ts` | Add `IaquaOneTouchWrappedResponse` type |
| Modify | `packages/iaqualink/src/index.ts` | Export `IaquaOneTouch` |
| Modify | `packages/iaqualink/__tests__/iaqua-system.test.ts` | Tests for onetouch parsing and commands |
| Create | `apps/mobile/src/components/SceneToggles.tsx` | 2-column scene button grid (mirrors `EquipmentToggles`) |
| Modify | `apps/mobile/src/hooks/useDevices.ts` | Add `scenes` group filtered by `instanceof IaquaOneTouch` |
| Modify | `apps/mobile/src/screens/DashboardScreen.tsx` | Render `SceneToggles` between equipment and devices |

---

### Task 1: Add `IaquaOneTouch` device class

**Files:**
- Modify: `packages/iaqualink/src/systems/iaqua/devices.ts`
- Modify: `packages/iaqualink/src/index.ts`
- Test: `packages/iaqualink/__tests__/iaqua-system.test.ts`

- [ ] **Step 1: Write failing test for onetouch device parsing**

Add to `packages/iaqualink/__tests__/iaqua-system.test.ts`. This test adds a `get_onetouch` mock response and verifies onetouch devices appear in `system.devices`.

```typescript
import { IaquaOneTouch } from "../src/systems/iaqua/devices.ts";

// Add this constant at the top with the other mocks:
const MOCK_ONETOUCH_RESPONSE = {
  onetouch_screen: [
    { status: "Online" },
    { response: "" },
    { group: "1" },
    { onetouch_1: [{ state: "0" }, { label: "All Off" }, { status: "0" }] },
    { onetouch_2: [{ state: "1" }, { label: "Spa Mode" }, { status: "1" }] },
    { onetouch_3: [{ state: "0" }, { label: "Party" }, { status: "0" }] },
  ],
};
```

Add this test inside the `describe("IaquaSystem")` block:

```typescript
  test("parses onetouch scenes", async () => {
    fetchMock
      .mockResolvedValueOnce(
        new Response(JSON.stringify(MOCK_HOME_RESPONSE), { status: 200 }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify(MOCK_DEVICES_RESPONSE), { status: 200 }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify(MOCK_ONETOUCH_RESPONSE), { status: 200 }),
      );

    await system.update();

    const allOff = system.devices.get("onetouch_1");
    expect(allOff).toBeDefined();
    expect(allOff).toBeInstanceOf(IaquaOneTouch);
    expect(allOff!.label).toBe("All Off");
    expect(allOff!.state).toBe("0");

    const spaMode = system.devices.get("onetouch_2");
    expect(spaMode).toBeDefined();
    expect(spaMode).toBeInstanceOf(IaquaOneTouch);
    expect(spaMode!.label).toBe("Spa Mode");
    expect(spaMode!.state).toBe("1");

    const party = system.devices.get("onetouch_3");
    expect(party).toBeDefined();
    expect(party!.label).toBe("Party");
  });
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd packages/iaqualink && bun test --filter "parses onetouch"`

Expected: FAIL — `IaquaOneTouch` is not exported, and `get_onetouch` is not called during `update()`.

- [ ] **Step 3: Add `IaquaOneTouch` class and factory branch**

In `packages/iaqualink/src/systems/iaqua/devices.ts`, add the class after the existing `IaquaColorLight` class (before `humanizeName`):

```typescript
export class IaquaOneTouch extends IaquaSwitch {
  async turnOn(): Promise<void> {
    await (this.system as IaquaSystem).setOneTouch(this.name);
  }

  async turnOff(): Promise<void> {
    await (this.system as IaquaSystem).setOneTouch(this.name);
  }
}
```

In the `parseIaquaDevices` function, add a new branch before the final comment `// Skip unknown device types silently`. Place it after the `else if (name.startsWith("aux_"))` block's closing brace:

```typescript
    } else if (name.startsWith("onetouch_")) {
      system.devices.set(
        name,
        new IaquaOneTouch(name, label, deviceData, system, true),
      );
    }
```

Note: `hasCustomLabel` is always `true` for onetouch scenes because they're always user-configured on the controller.

- [ ] **Step 4: Add wrapped response type**

In `packages/iaqualink/src/types.ts`, add after the `IaquaDevicesWrappedResponse` interface:

```typescript
/** Raw wrapped response from iAqua session.json?command=get_onetouch */
export interface IaquaOneTouchWrappedResponse {
  onetouch_screen?: IaquaDevicesResponse;
}
```

- [ ] **Step 5: Add `get_onetouch` fetch and `setOneTouch` command to `IaquaSystem`**

In `packages/iaqualink/src/systems/iaqua/system.ts`:

Add import for the new type. Change line 3 from:

```typescript
import type {
  IaquaHomeWrappedResponse,
  IaquaDevicesWrappedResponse,
} from "../../types.ts";
```

to:

```typescript
import type {
  IaquaHomeWrappedResponse,
  IaquaDevicesWrappedResponse,
  IaquaOneTouchWrappedResponse,
} from "../../types.ts";
```

Update `fetchDevices()` to also call `get_onetouch`. Replace the existing `fetchDevices` method:

```typescript
  protected async fetchDevices(): Promise<void> {
    const homeRaw = (await this.sendCommand("get_home")) as IaquaHomeWrappedResponse;
    const devicesRaw = (await this.sendCommand("get_devices")) as IaquaDevicesWrappedResponse;
    const oneTouchRaw = (await this.sendCommand("get_onetouch")) as IaquaOneTouchWrappedResponse;

    // Parse devices_screen first (device config: labels, types, subtypes),
    // then home_screen (live state) so fresh state overwrites stale values.
    this.parseDevicesResponse(devicesRaw.devices_screen ?? []);
    this.parseHomeResponse(homeRaw.home_screen ?? []);
    this.parseOneTouchResponse(oneTouchRaw.onetouch_screen ?? []);
  }
```

Add the new parse method after `parseDevicesResponse`:

```typescript
  private parseOneTouchResponse(data: IaquaDevicesResponse): void {
    if (!Array.isArray(data) || data.length === 0) return;

    // Same structure as devices_screen: index 0 is status, scenes from index 3+
    for (let i = 3; i < data.length; i++) {
      const entry = data[i] as Record<string, unknown>;
      parseIaquaDevices(entry, this);
    }
  }
```

Add `setOneTouch` command helper after the existing `setHeater` method:

```typescript
  async setOneTouch(name: string): Promise<void> {
    const num = name.replace("onetouch_", "");
    await this.sendCommand(`set_onetouch_${num}`);
  }
```

- [ ] **Step 6: Export `IaquaOneTouch` from package index**

In `packages/iaqualink/src/index.ts`, update the iAqua devices export:

```typescript
export {
  IaquaSensor,
  IaquaSwitch,
  IaquaThermostat,
  IaquaLightSwitch,
  IaquaDimmableLight,
  IaquaColorLight,
  IaquaOneTouch,
} from "./systems/iaqua/devices.ts";
```

- [ ] **Step 7: Run tests to verify parsing works**

Run: `cd packages/iaqualink && bun test`

Expected: ALL tests pass. The existing tests that mock only 2 fetch calls (home + devices) will now fail because `fetchDevices` makes 3 calls. We need to fix them first — see next step.

- [ ] **Step 8: Update existing tests to mock the third fetch call**

Every existing test that calls `system.update()` now needs a third `mockResolvedValueOnce` for the `get_onetouch` response. Add an empty response for tests that don't care about onetouch.

Add this constant at the top with the other mocks:

```typescript
const MOCK_EMPTY_ONETOUCH = {
  onetouch_screen: [],
};
```

For every existing `fetchMock` chain that has two `.mockResolvedValueOnce(...)` calls (home + devices), append a third:

```typescript
      .mockResolvedValueOnce(
        new Response(JSON.stringify(MOCK_EMPTY_ONETOUCH), { status: 200 }),
      );
```

This applies to these tests:
- "fetches and parses home + devices responses"
- "parses temperature sensors"
- "parses switches (pumps)"
- "parses thermostats"
- "parses aux devices with correct types"
- "home_screen live state overrides devices_screen stale state"
- "updates aux label when get_devices provides label after get_home"
- "humanizes aux name when no label is provided"
- "respects rate limiting" (only the first `update()` call fetches — the second is rate-limited — so only the first chain needs a third mock)

- [ ] **Step 9: Run all tests**

Run: `cd packages/iaqualink && bun test`

Expected: ALL tests pass, including the new onetouch test.

- [ ] **Step 10: Commit**

```bash
git add packages/iaqualink/src/systems/iaqua/devices.ts \
       packages/iaqualink/src/systems/iaqua/system.ts \
       packages/iaqualink/src/types.ts \
       packages/iaqualink/src/index.ts \
       packages/iaqualink/__tests__/iaqua-system.test.ts
git commit -m "feat: add IaquaOneTouch device class and get_onetouch API support"
```

---

### Task 2: Add test for `setOneTouch` command URL

**Files:**
- Test: `packages/iaqualink/__tests__/iaqua-system.test.ts`

- [ ] **Step 1: Write failing test for setOneTouch command**

Add inside the `describe("IaquaSystem")` block:

```typescript
  test("sends set_onetouch command with correct URL", async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ status: "ok" }), { status: 200 }),
    );

    await system.setOneTouch("onetouch_3");

    const [url] = fetchMock.mock.calls[0];
    const parsed = new URL(url);
    expect(parsed.searchParams.get("command")).toBe("set_onetouch_3");
    expect(parsed.searchParams.get("serial")).toBe("POOL001");
    expect(parsed.searchParams.get("sessionID")).toBe("session456");
  });
```

- [ ] **Step 2: Run test to verify it passes**

Run: `cd packages/iaqualink && bun test --filter "set_onetouch"`

Expected: PASS (the implementation was already added in Task 1).

- [ ] **Step 3: Commit**

```bash
git add packages/iaqualink/__tests__/iaqua-system.test.ts
git commit -m "test: add setOneTouch command URL verification"
```

---

### Task 3: Add `SceneToggles` component and dashboard integration

**Files:**
- Create: `apps/mobile/src/components/SceneToggles.tsx`
- Modify: `apps/mobile/src/hooks/useDevices.ts`
- Modify: `apps/mobile/src/screens/DashboardScreen.tsx`

- [ ] **Step 1: Create `SceneToggles` component**

Create `apps/mobile/src/components/SceneToggles.tsx`:

```typescript
import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { AqualinkDevice } from "@quick-pool/iaqualink";
import { DeviceTile } from "./DeviceTile";

interface Props {
  devices: AqualinkDevice[];
  onToggle: (device: AqualinkDevice) => void;
}

export function SceneToggles({ devices, onToggle }: Props) {
  if (devices.length === 0) return null;

  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>Scenes</Text>
      <View style={styles.grid}>
        {devices.map((device) => (
          <View key={device.name} style={styles.cell}>
            <DeviceTile device={device} onPress={onToggle} />
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 16,
  },
  sectionTitle: {
    color: "#888",
    fontSize: 13,
    fontWeight: "600",
    textTransform: "uppercase",
    marginHorizontal: 20,
    marginBottom: 4,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  cell: {
    width: "50%",
  },
});
```

- [ ] **Step 2: Add `scenes` group to `useGroupedDevices` hook**

In `apps/mobile/src/hooks/useDevices.ts`:

Update the import to include `IaquaOneTouch`:

```typescript
import {
  AqualinkDevice,
  AqualinkSensor,
  AqualinkSwitch,
  AqualinkThermostat,
  AqualinkLight,
  IaquaOneTouch,
} from "@quick-pool/iaqualink";
```

In `useGroupedDevices`, add `scenes` to the arrays:

```typescript
  const scenes: AqualinkDevice[] = [];
```

Add a branch for onetouch scenes at the top of the `for` loop (before the thermostat check), so they don't fall through to the `AqualinkSwitch` branch:

```typescript
    if (device instanceof IaquaOneTouch) {
      scenes.push(device);
    } else if (device instanceof AqualinkThermostat) {
```

Update the return:

```typescript
  return { sensors, pumpsAndHeaters, scenes, switches, thermostats, lights };
```

- [ ] **Step 3: Integrate `SceneToggles` into `DashboardScreen`**

In `apps/mobile/src/screens/DashboardScreen.tsx`:

Add the import:

```typescript
import { SceneToggles } from "../components/SceneToggles";
```

Update the destructuring of `useGroupedDevices()`:

```typescript
  const { sensors, pumpsAndHeaters, scenes, switches, thermostats, lights } =
    useGroupedDevices();
```

In the JSX `ListHeaderComponent`, add `SceneToggles` after `EquipmentToggles` and before the error container:

```typescript
            <EquipmentToggles
              devices={pumpsAndHeaters}
              onToggle={handleDevicePress}
            />
            <SceneToggles
              devices={scenes}
              onToggle={handleDevicePress}
            />
            {error && (
```

- [ ] **Step 4: Type-check both packages**

Run: `cd packages/iaqualink && bunx tsc --noEmit && cd ../../apps/mobile && bunx tsc --noEmit`

Expected: No type errors.

- [ ] **Step 5: Run API client tests**

Run: `cd packages/iaqualink && bun test`

Expected: ALL tests pass.

- [ ] **Step 6: Commit**

```bash
git add apps/mobile/src/components/SceneToggles.tsx \
       apps/mobile/src/hooks/useDevices.ts \
       apps/mobile/src/screens/DashboardScreen.tsx
git commit -m "feat: add Scenes section to dashboard for one-touch controls"
```
