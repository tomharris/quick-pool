import React, { useCallback } from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { useAuthStore } from "../store/auth";
import { useDevicesStore } from "../store/devices";

export function SettingsScreen() {
  const logout = useAuthStore((s) => s.logout);
  const systems = useDevicesStore((s) => s.systems);
  const activeSerial = useDevicesStore((s) => s.activeSystemSerial);
  const setActiveSystem = useDevicesStore((s) => s.setActiveSystem);

  const handleLogout = useCallback(async () => {
    await logout();
  }, [logout]);

  const systemList = Array.from(systems.entries());

  return (
    <View style={styles.container}>
      {systemList.length > 1 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Systems</Text>
          {systemList.map(([serial, system]) => (
            <TouchableOpacity
              key={serial}
              style={[
                styles.systemItem,
                serial === activeSerial && styles.systemItemActive,
              ]}
              onPress={() => setActiveSystem(serial)}
            >
              <Text style={styles.systemName}>
                {system.name}
              </Text>
              <Text style={styles.systemSerial}>{serial}</Text>
              {serial === activeSerial && (
                <Text style={styles.checkmark}>✓</Text>
              )}
            </TouchableOpacity>
          ))}
        </View>
      )}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Account</Text>
        <TouchableOpacity
          style={styles.logoutButton}
          onPress={handleLogout}
          activeOpacity={0.8}
        >
          <Text style={styles.logoutText}>Sign Out</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.version}>Quick Pool v0.1.0</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0f0f23",
    padding: 16,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    color: "#888",
    fontSize: 13,
    fontWeight: "600",
    textTransform: "uppercase",
    marginBottom: 8,
    marginLeft: 4,
  },
  systemItem: {
    backgroundColor: "#1a1a2e",
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    flexDirection: "row",
    alignItems: "center",
  },
  systemItemActive: {
    borderColor: "#4fc3f7",
    borderWidth: 1,
  },
  systemName: {
    color: "#fff",
    fontSize: 16,
    flex: 1,
  },
  systemSerial: {
    color: "#666",
    fontSize: 12,
    marginRight: 8,
  },
  checkmark: {
    color: "#4fc3f7",
    fontSize: 18,
  },
  logoutButton: {
    backgroundColor: "#2a1a1a",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    borderColor: "#ef5350",
    borderWidth: 1,
  },
  logoutText: {
    color: "#ef5350",
    fontSize: 16,
    fontWeight: "600",
  },
  version: {
    color: "#444",
    fontSize: 12,
    textAlign: "center",
    marginTop: "auto",
    paddingBottom: 24,
  },
});
