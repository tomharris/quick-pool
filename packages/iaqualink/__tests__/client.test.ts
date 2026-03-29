import { describe, test, expect, beforeEach, mock } from "bun:test";
import { AqualinkClient } from "../src/client.ts";
import { AqualinkUnauthorizedError, AqualinkServiceError } from "../src/errors.ts";

// Import system registrations
import "../src/systems/iaqua/system.ts";
import "../src/systems/exo/system.ts";

const MOCK_LOGIN_RESPONSE = {
  id: "user123",
  session_id: "session456",
  authentication_token: "auth789",
  email: "test@example.com",
  first_name: "Test",
  last_name: "User",
  userPoolOAuth: {
    IdToken: "jwt-id-token",
    AccessToken: "jwt-access-token",
    RefreshToken: "jwt-refresh-token",
  },
};

const MOCK_DEVICES_RESPONSE = [
  {
    serial_number: "POOL001",
    device_type: "iaqua",
    name: "My Pool",
  },
];

describe("AqualinkClient", () => {
  let client: AqualinkClient;
  let fetchMock: ReturnType<typeof mock>;

  beforeEach(() => {
    client = new AqualinkClient();
    fetchMock = mock();
    globalThis.fetch = fetchMock as unknown as typeof fetch;
  });

  describe("login", () => {
    test("stores credentials on successful login", async () => {
      fetchMock.mockResolvedValueOnce(
        new Response(JSON.stringify(MOCK_LOGIN_RESPONSE), { status: 200 }),
      );

      await client.login("test@example.com", "password");

      expect(client.isLoggedIn).toBe(true);

      const creds = client.getCredentials();
      expect(creds.userId).toBe("user123");
      expect(creds.sessionId).toBe("session456");
      expect(creds.authToken).toBe("auth789");
      expect(creds.idToken).toBe("jwt-id-token");
    });

    test("sends correct request body", async () => {
      fetchMock.mockResolvedValueOnce(
        new Response(JSON.stringify(MOCK_LOGIN_RESPONSE), { status: 200 }),
      );

      await client.login("test@example.com", "password");

      expect(fetchMock).toHaveBeenCalledTimes(1);
      const [url, options] = fetchMock.mock.calls[0];
      expect(url).toBe("https://prod.zodiac-io.com/users/v1/login");
      expect(options.method).toBe("POST");

      const body = JSON.parse(options.body);
      expect(body.api_key).toBe("EOOEMOW4YR6QNB07");
      expect(body.email).toBe("test@example.com");
      expect(body.password).toBe("password");
    });

    test("throws AqualinkUnauthorizedError on 401", async () => {
      fetchMock.mockResolvedValueOnce(
        new Response("Unauthorized", { status: 401 }),
      );

      expect(client.login("bad@example.com", "wrong")).rejects.toThrow(
        AqualinkUnauthorizedError,
      );
    });

    test("throws AqualinkServiceError on other failures", async () => {
      fetchMock.mockResolvedValueOnce(
        new Response("Server Error", { status: 500 }),
      );

      expect(client.login("test@example.com", "password")).rejects.toThrow(
        AqualinkServiceError,
      );
    });
  });

  describe("getSystems", () => {
    test("throws when not logged in", () => {
      expect(client.getSystems()).rejects.toThrow(AqualinkUnauthorizedError);
    });

    test("fetches devices and creates systems", async () => {
      // Login first
      fetchMock.mockResolvedValueOnce(
        new Response(JSON.stringify(MOCK_LOGIN_RESPONSE), { status: 200 }),
      );
      await client.login("test@example.com", "password");

      // Then get systems
      fetchMock.mockResolvedValueOnce(
        new Response(JSON.stringify(MOCK_DEVICES_RESPONSE), { status: 200 }),
      );

      const systems = await client.getSystems();

      expect(systems.size).toBe(1);
      expect(systems.has("POOL001")).toBe(true);

      const system = systems.get("POOL001")!;
      expect(system.type).toBe("iaqua");
      expect(system.serial).toBe("POOL001");
    });

    test("handles empty devices list", async () => {
      fetchMock.mockResolvedValueOnce(
        new Response(JSON.stringify(MOCK_LOGIN_RESPONSE), { status: 200 }),
      );
      await client.login("test@example.com", "password");

      fetchMock.mockResolvedValueOnce(
        new Response(JSON.stringify([]), { status: 200 }),
      );
      const systems = await client.getSystems();
      expect(systems.size).toBe(0);
    });

    test("uses correct auth params in devices URL", async () => {
      fetchMock.mockResolvedValueOnce(
        new Response(JSON.stringify(MOCK_LOGIN_RESPONSE), { status: 200 }),
      );
      await client.login("test@example.com", "password");

      fetchMock.mockResolvedValueOnce(
        new Response(JSON.stringify([]), { status: 200 }),
      );
      await client.getSystems();

      const [url] = fetchMock.mock.calls[1];
      const parsed = new URL(url);
      expect(parsed.origin + parsed.pathname).toBe(
        "https://r-api.iaqualink.net/devices.json",
      );
      expect(parsed.searchParams.get("api_key")).toBe("EOOEMOW4YR6QNB07");
      expect(parsed.searchParams.get("authentication_token")).toBe("auth789");
      expect(parsed.searchParams.get("user_id")).toBe("user123");
    });
  });

  describe("refreshLogin", () => {
    test("throws when no stored credentials", async () => {
      expect(client.refreshLogin()).rejects.toThrow(
        AqualinkUnauthorizedError,
      );
    });

    test("re-authenticates with stored credentials", async () => {
      // Initial login
      fetchMock.mockResolvedValueOnce(
        new Response(JSON.stringify(MOCK_LOGIN_RESPONSE), { status: 200 }),
      );
      await client.login("test@example.com", "password");

      // Refresh returns new session
      const refreshResponse = {
        ...MOCK_LOGIN_RESPONSE,
        session_id: "new_session_789",
      };
      fetchMock.mockResolvedValueOnce(
        new Response(JSON.stringify(refreshResponse), { status: 200 }),
      );
      await client.refreshLogin();

      expect(client.getCredentials().sessionId).toBe("new_session_789");
    });

    test("coalesces concurrent refresh calls into one login", async () => {
      // Initial login
      fetchMock.mockResolvedValueOnce(
        new Response(JSON.stringify(MOCK_LOGIN_RESPONSE), { status: 200 }),
      );
      await client.login("test@example.com", "password");

      // Only one refresh response needed — concurrent calls share it
      const refreshResponse = {
        ...MOCK_LOGIN_RESPONSE,
        session_id: "shared_session",
      };
      fetchMock.mockResolvedValueOnce(
        new Response(JSON.stringify(refreshResponse), { status: 200 }),
      );

      // Fire two refreshes concurrently
      const [r1, r2] = await Promise.all([
        client.refreshLogin(),
        client.refreshLogin(),
      ]);

      // Only one login fetch should have been made (2 total: initial + refresh)
      expect(fetchMock).toHaveBeenCalledTimes(2);
      expect(client.getCredentials().sessionId).toBe("shared_session");
    });
  });
});
