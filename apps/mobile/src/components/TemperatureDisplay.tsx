import React from "react";
import { View, Text, StyleSheet } from "react-native";
import type { AqualinkDevice } from "@quick-pool/iaqualink";

interface Props {
  sensors: AqualinkDevice[];
  tempUnit: string;
}

const TEMP_LABELS: Record<string, string> = {
  pool_temp: "Pool",
  spa_temp: "Spa",
  air_temp: "Air",
  sns_3: "Water",
};

export function TemperatureDisplay({ sensors, tempUnit }: Props) {
  const tempSensors = sensors.filter(
    (s) =>
      s.name.includes("temp") ||
      s.name.startsWith("sns_"),
  );

  if (tempSensors.length === 0) return null;

  return (
    <View style={styles.container}>
      {tempSensors.map((sensor) => (
        <View key={sensor.name} style={styles.tempItem}>
          <Text style={styles.label}>
            {TEMP_LABELS[sensor.name] ?? sensor.label}
          </Text>
          <Text style={styles.value}>
            {sensor.state}°{tempUnit}
          </Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    justifyContent: "space-around",
    paddingVertical: 24,
    paddingHorizontal: 16,
    backgroundColor: "#1a1a2e",
    borderRadius: 16,
    marginHorizontal: 16,
    marginTop: 16,
  },
  tempItem: {
    alignItems: "center",
  },
  label: {
    fontSize: 13,
    color: "#888",
    marginBottom: 4,
  },
  value: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#4fc3f7",
  },
});
