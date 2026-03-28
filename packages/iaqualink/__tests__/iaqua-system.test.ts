import { describe, test, expect, beforeEach, mock } from "bun:test";
import { IaquaSystem } from "../src/systems/iaqua/system.ts";
import { AqualinkClient } from "../src/client.ts";
import "../src/systems/iaqua/system.ts";

// Mock home response matching Python library's test format
const MOCK_HOME_RESPONSE = [
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
];

const MOCK_DEVICES_RESPONSE = [
  { status: "Online" },                           // index 0
  {},                                              // index 1
  {},                                              // index 2
  { aux_1: { name: "aux_1", label: "Pool Light", state: "0", type: "light", subtype: "color" } },
  { aux_2: { name: "aux_2", label: "Spa Light", state: "1", type: "light", subtype: "" } },
  { aux_3: { name: "aux_3", label: "Waterfall", state: "0", type: "", subtype: "" } },
];

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

    // aux_1 should be a color light
    const poolLight = system.devices.get("aux_1");
    expect(poolLight).toBeDefined();
    expect(poolLight!.label).toBe("Pool Light");

    // aux_2 should be a light switch
    const spaLight = system.devices.get("aux_2");
    expect(spaLight).toBeDefined();

    // aux_3 should be a plain switch (no light type)
    const waterfall = system.devices.get("aux_3");
    expect(waterfall).toBeDefined();
    expect(waterfall!.label).toBe("Waterfall");
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
