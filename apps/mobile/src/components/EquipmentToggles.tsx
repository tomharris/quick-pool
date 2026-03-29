import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { AqualinkDevice } from "@quick-pool/iaqualink";
import { DeviceTile } from "./DeviceTile";

interface Props {
  devices: AqualinkDevice[];
  onToggle: (device: AqualinkDevice) => void;
}

export function EquipmentToggles({ devices, onToggle }: Props) {
  if (devices.length === 0) return null;

  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>Equipment</Text>
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
