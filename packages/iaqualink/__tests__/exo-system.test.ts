import { describe, test, expect, beforeEach, mock } from "bun:test";
import { ExoSystem } from "../src/systems/exo/system.js";
import { AqualinkClient } from "../src/client.js";
import "../src/systems/exo/system.js";

const MOCK_SHADOW_RESPONSE = {
  state: {
    reported: {
      sns_3: {
        sensor_type: "Water Temperature",
        state: "24",
      },
      heating: {
        state: "off",
        sp: 28,
        enabled: false,
        sp_min: 15,
        sp_max: 40,
      },
      equipment: {
        swc_0: {
          aux_1: { state: "1" },
          aux_2: { state: "0" },
          production: 50,
          boost: 0,
        },
      },
    },
  },
};

const MOCK_CREDENTIALS = {
  userId: "user123",
  sessionId: "session456",
  authToken: "auth789",
  idToken: "jwt-id-token",
};

describe("ExoSystem", () => {
  let system: ExoSystem;
  let fetchMock: ReturnType<typeof mock>;

  beforeEach(() => {
    const mockClient = {
      getCredentials: () => MOCK_CREDENTIALS,
    } as unknown as AqualinkClient;

    system = new ExoSystem("EXO001", {
      serial_number: "EXO001",
      device_type: "exo",
      name: "My eXO",
    }, mockClient);

    fetchMock = mock();
    globalThis.fetch = fetchMock as unknown as typeof fetch;
  });

  test("fetches and parses shadow state", async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify(MOCK_SHADOW_RESPONSE), { status: 200 }),
    );

    await system.update();

    expect(system.online).toBe(true);
    expect(system.tempUnit).toBe("C");
  });

  test("parses sensors", async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify(MOCK_SHADOW_RESPONSE), { status: 200 }),
    );

    await system.update();

    const waterTemp = system.devices.get("sns_3");
    expect(waterTemp).toBeDefined();
    expect(waterTemp!.state).toBe("24");
    expect(waterTemp!.label).toBe("Water Temperature");
  });

  test("parses heating thermostat", async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify(MOCK_SHADOW_RESPONSE), { status: 200 }),
    );

    await system.update();

    const heating = system.devices.get("heating");
    expect(heating).toBeDefined();
    expect(heating!.label).toBe("Heating");
  });

  test("parses aux switches", async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify(MOCK_SHADOW_RESPONSE), { status: 200 }),
    );

    await system.update();

    const aux1 = system.devices.get("aux_1");
    expect(aux1).toBeDefined();
    expect(aux1!.state).toBe("1");

    const aux2 = system.devices.get("aux_2");
    expect(aux2).toBeDefined();
    expect(aux2!.state).toBe("0");
  });

  test("parses toggle switches", async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify(MOCK_SHADOW_RESPONSE), { status: 200 }),
    );

    await system.update();

    const production = system.devices.get("production");
    expect(production).toBeDefined();
    expect(production!.state).toBe("50");

    const boost = system.devices.get("boost");
    expect(boost).toBeDefined();
    expect(boost!.state).toBe("0");
  });

  test("sends shadow GET with correct auth header", async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify(MOCK_SHADOW_RESPONSE), { status: 200 }),
    );

    await system.update();

    const [url, options] = fetchMock.mock.calls[0];
    expect(url).toBe("https://prod.zodiac-io.com/devices/v1/EXO001/shadow");
    expect(options.headers.Authorization).toBe("jwt-id-token");
  });

  test("sends desired state via POST", async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({}), { status: 200 }),
    );

    await system.setHeating({ sp: 30, enabled: true });

    const [url, options] = fetchMock.mock.calls[0];
    expect(url).toBe("https://prod.zodiac-io.com/devices/v1/EXO001/shadow");
    expect(options.method).toBe("POST");

    const body = JSON.parse(options.body);
    expect(body).toEqual({
      state: {
        desired: {
          heating: { sp: 30, enabled: true },
        },
      },
    });
  });

  test("respects rate limiting", async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify(MOCK_SHADOW_RESPONSE), { status: 200 }),
    );

    await system.update();
    const callCount = fetchMock.mock.calls.length;

    await system.update();
    expect(fetchMock.mock.calls.length).toBe(callCount);
  });
});
