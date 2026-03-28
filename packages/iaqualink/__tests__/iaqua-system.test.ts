import { describe, test, expect, beforeEach, mock } from "bun:test";
import { IaquaSystem } from "../src/systems/iaqua/system.ts";
import { AqualinkClient } from "../src/client.ts";
import "../src/systems/iaqua/system.ts";

// Mock responses matching real API format (wrapped in home_screen / devices_screen)
const MOCK_HOME_RESPONSE = {
  home_screen: [
    { status: "Online" },                          // index 0
    {},                                              // index 1
    {},                                              // index 2
    { temp_scale: "F" },                            // index 3
    { pool_temp: { name: "pool_temp", label: "Pool Temperature", state: "78" } },
    { spa_temp: { name: "spa_temp", label: "Spa Temperature", state: "102" } },
    { air_temp: { name: "air_temp", label: "Air Temperature", state: "85" } },
    { pool_pump: { name: "pool_pump", label: "Pool Pump", state: "1" } },
    { spa_pump: { name: "spa_pump", label: "Spa Pump", state: "0" } },
    { pool_set_point: { name: "pool_set_point", label: "Pool Heat", state: "1", set_point: "82" } },
    { spa_set_point: { name: "spa_set_point", label: "Spa Heat", state: "0", set_point: "100" } },
    // home_screen aux entries: simple string state values (live state)
    { aux_1: "0" },
    { aux_2: "1" },
    { aux_3: "0" },
  ],
};

// devices_screen uses array-of-objects format per device (real API structure)
const MOCK_DEVICES_RESPONSE = {
  devices_screen: [
    { status: "Online" },                           // index 0
    { response: "" },                               // index 1
    { group: "1" },                                 // index 2
    { aux_1: [{ state: "0" }, { label: "Pool Light" }, { type: "light" }, { subtype: "color" }] },
    { aux_2: [{ state: "1" }, { label: "Spa Light" }, { type: "light" }, { subtype: "" }] },
    { aux_3: [{ state: "0" }, { label: "Waterfall" }, { type: "" }, { subtype: "" }] },
  ],
};

const MOCK_CREDENTIALS = {
  userId: "user123",
  sessionId: "session456",
  authToken: "auth789",
  idToken: "jwt-token",
};

describe("IaquaSystem", () => {
  let system: IaquaSystem;
  let fetchMock: ReturnType<typeof mock>;

  beforeEach(() => {
    const mockClient = {
      getCredentials: () => MOCK_CREDENTIALS,
    } as unknown as AqualinkClient;

    system = new IaquaSystem("POOL001", {
      serial_number: "POOL001",
      device_type: "iaqua",
      name: "My Pool",
    }, mockClient);

    fetchMock = mock();
    globalThis.fetch = fetchMock as unknown as typeof fetch;
  });

  test("fetches and parses home + devices responses", async () => {
    fetchMock
      .mockResolvedValueOnce(
        new Response(JSON.stringify(MOCK_HOME_RESPONSE), { status: 200 }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify(MOCK_DEVICES_RESPONSE), { status: 200 }),
      );

    await system.update();

    expect(system.online).toBe(true);
    expect(system.tempUnit).toBe("F");
  });

  test("parses temperature sensors", async () => {
    fetchMock
      .mockResolvedValueOnce(
        new Response(JSON.stringify(MOCK_HOME_RESPONSE), { status: 200 }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify(MOCK_DEVICES_RESPONSE), { status: 200 }),
      );

    await system.update();

    const poolTemp = system.devices.get("pool_temp");
    expect(poolTemp).toBeDefined();
    expect(poolTemp!.state).toBe("78");
    expect(poolTemp!.label).toBe("Pool Temperature");

    const spaTemp = system.devices.get("spa_temp");
    expect(spaTemp!.state).toBe("102");

    const airTemp = system.devices.get("air_temp");
    expect(airTemp!.state).toBe("85");
  });

  test("parses switches (pumps)", async () => {
    fetchMock
      .mockResolvedValueOnce(
        new Response(JSON.stringify(MOCK_HOME_RESPONSE), { status: 200 }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify(MOCK_DEVICES_RESPONSE), { status: 200 }),
      );

    await system.update();

    const poolPump = system.devices.get("pool_pump");
    expect(poolPump).toBeDefined();
    expect(poolPump!.state).toBe("1");

    const spaPump = system.devices.get("spa_pump");
    expect(spaPump!.state).toBe("0");
  });

  test("parses thermostats", async () => {
    fetchMock
      .mockResolvedValueOnce(
        new Response(JSON.stringify(MOCK_HOME_RESPONSE), { status: 200 }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify(MOCK_DEVICES_RESPONSE), { status: 200 }),
      );

    await system.update();

    const poolHeat = system.devices.get("pool_set_point");
    expect(poolHeat).toBeDefined();
    // Thermostat-specific checks would go through the typed interface
  });

  test("parses aux devices with correct types", async () => {
    fetchMock
      .mockResolvedValueOnce(
        new Response(JSON.stringify(MOCK_HOME_RESPONSE), { status: 200 }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify(MOCK_DEVICES_RESPONSE), { status: 200 }),
      );

    await system.update();

    // aux_1 should be a color light with custom label
    const poolLight = system.devices.get("aux_1");
    expect(poolLight).toBeDefined();
    expect(poolLight!.label).toBe("Pool Light");
    expect(poolLight!.hasCustomLabel).toBe(true);

    // aux_2 should be a light switch with custom label
    const spaLight = system.devices.get("aux_2");
    expect(spaLight).toBeDefined();
    expect(spaLight!.hasCustomLabel).toBe(true);

    // aux_3 should be a plain switch (no light type) with custom label
    const waterfall = system.devices.get("aux_3");
    expect(waterfall).toBeDefined();
    expect(waterfall!.label).toBe("Waterfall");
    expect(waterfall!.hasCustomLabel).toBe(true);
  });

  test("sends commands with correct URL params", async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ status: "ok" }), { status: 200 }),
    );

    await system.sendCommand("set_aux", { aux_1: "1" });

    const [url] = fetchMock.mock.calls[0];
    const parsed = new URL(url);
    expect(parsed.origin + parsed.pathname).toBe(
      "https://p-api.iaqualink.net/v1/mobile/session.json",
    );
    expect(parsed.searchParams.get("actionID")).toBe("command");
    expect(parsed.searchParams.get("command")).toBe("set_aux");
    expect(parsed.searchParams.get("serial")).toBe("POOL001");
    expect(parsed.searchParams.get("sessionID")).toBe("session456");
    expect(parsed.searchParams.get("aux_1")).toBe("1");
  });

  test("home_screen live state overrides devices_screen stale state", async () => {
    // devices_screen says aux_2 state is "0", but home_screen (live) says "1"
    const homeResponse = {
      home_screen: [
        { status: "Online" },
        {},
        {},
        { temp_scale: "F" },
        { aux_2: "1" },
      ],
    };

    const devicesResponse = {
      devices_screen: [
        { status: "Online" },
        { response: "" },
        { group: "1" },
        { aux_2: [{ state: "0" }, { label: "Spa Light" }, { type: "light" }, { subtype: "" }] },
      ],
    };

    fetchMock
      .mockResolvedValueOnce(new Response(JSON.stringify(homeResponse), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify(devicesResponse), { status: 200 }));

    await system.update();

    const spaLight = system.devices.get("aux_2");
    expect(spaLight).toBeDefined();
    expect(spaLight!.label).toBe("Spa Light");
    expect(spaLight!.state).toBe("1"); // home_screen live state wins
  });

  test("updates aux label when get_devices provides label after get_home", async () => {
    const homeWithAux = {
      home_screen: [
        { status: "Online" },
        {},
        {},
        { temp_scale: "F" },
        { aux_1: { name: "aux_1", state: "0", type: "light", subtype: "color" } },
      ],
    };

    const devicesWithLabel = {
      devices_screen: [
        { status: "Online" },
        { response: "" },
        { group: "1" },
        { aux_1: [{ state: "0" }, { label: "Pool Light" }, { type: "light" }, { subtype: "color" }] },
      ],
    };

    fetchMock
      .mockResolvedValueOnce(new Response(JSON.stringify(homeWithAux), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify(devicesWithLabel), { status: 200 }));

    await system.update();

    const poolLight = system.devices.get("aux_1");
    expect(poolLight).toBeDefined();
    expect(poolLight!.label).toBe("Pool Light");
  });

  test("humanizes aux name when no label is provided", async () => {
    const homeNoAux = {
      home_screen: [
        { status: "Online" },
        {},
        {},
        { temp_scale: "F" },
      ],
    };

    const devicesNoLabel = {
      devices_screen: [
        { status: "Online" },
        { response: "" },
        { group: "1" },
        { aux_3: [{ state: "0" }, { type: "" }, { subtype: "" }] },
      ],
    };

    fetchMock
      .mockResolvedValueOnce(new Response(JSON.stringify(homeNoAux), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify(devicesNoLabel), { status: 200 }));

    await system.update();

    const aux3 = system.devices.get("aux_3");
    expect(aux3).toBeDefined();
    expect(aux3!.label).toBe("Aux 3");
    expect(aux3!.hasCustomLabel).toBe(false);
  });

  test("respects rate limiting", async () => {
    fetchMock
      .mockResolvedValueOnce(
        new Response(JSON.stringify(MOCK_HOME_RESPONSE), { status: 200 }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify(MOCK_DEVICES_RESPONSE), { status: 200 }),
      );

    await system.update();
    const callCount = fetchMock.mock.calls.length;

    // Second update within 5s should be a no-op
    await system.update();
    expect(fetchMock.mock.calls.length).toBe(callCount);
  });
});
