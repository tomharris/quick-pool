import { create } from "zustand";
import * as SecureStore from "expo-secure-store";
import { AqualinkClient } from "@quick-pool/iaqualink";

const CREDS_KEY = "iaqualink_credentials";

interface StoredCredentials {
  email: string;
  password: string;
}

interface AuthState {
  client: AqualinkClient;
  isLoggedIn: boolean;
  isLoading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  tryRestoreSession: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  client: new AqualinkClient(),
  isLoggedIn: false,
  isLoading: false,
  error: null,

  login: async (email: string, password: string) => {
    set({ isLoading: true, error: null });
    try {
      const { client } = get();
      await client.login(email, password);

      // Store credentials for session restore
      await SecureStore.setItemAsync(
        CREDS_KEY,
        JSON.stringify({ email, password }),
      );

      set({ isLoggedIn: true, isLoading: false });
    } catch (e) {
      set({
        isLoading: false,
        error: e instanceof Error ? e.message : "Login failed",
      });
      throw e;
    }
  },

  logout: async () => {
    await SecureStore.deleteItemAsync(CREDS_KEY);
    set({
      client: new AqualinkClient(),
      isLoggedIn: false,
      error: null,
    });
  },

  tryRestoreSession: async () => {
    set({ isLoading: true });
    try {
      const stored = await SecureStore.getItemAsync(CREDS_KEY);
      if (!stored) {
        set({ isLoading: false });
        return;
      }

      const { email, password } = JSON.parse(stored) as StoredCredentials;
      const { client } = get();
      await client.login(email.trim(), password.trim());
      set({ isLoggedIn: true, isLoading: false });
    } catch (e) {
      console.warn("[auth] session restore failed:", e instanceof Error ? e.message : e);
      await SecureStore.deleteItemAsync(CREDS_KEY);
      set({ isLoading: false });
    }
  },
}));
