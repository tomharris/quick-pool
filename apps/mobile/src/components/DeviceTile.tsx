import React from "react";
import { TouchableOpacity, Text, StyleSheet } from "react-native";
import {
  AqualinkDevice,
  AqualinkSwitch,
  AqualinkThermostat,
  AqualinkLight,
} from "@quick-pool/iaqualink";

interface Props {
  device: AqualinkDevice;
  onPress: (device: AqualinkDevice) => void;
  onLongPress?: (device: AqualinkDevice) => void;
}

export function DeviceTile({ device, onPress, onLongPress }: Props) {
  const isSwitch = device instanceof AqualinkSwitch;
  const isOn = isSwitch && (device as AqualinkSwitch).isOn;

  const isNavigable =
    device instanceof AqualinkThermostat ||
    device instanceof AqualinkLight;

  return (
    <TouchableOpacity
      style={[styles.tile, isOn && styles.tileOn]}
      onPress={() => onPress(device)}
      onLongPress={() => onLongPress?.(device)}
      activeOpacity={0.7}
    >
      <Text style={[styles.label, isOn && styles.labelOn]} numberOfLines={1}>
        {device.label}
      </Text>
      <Text style={[styles.state, isOn && styles.stateOn]}>
        {isSwitch ? (isOn ? "ON" : "OFF") : device.state}
      </Text>
      {isNavigable && <Text style={styles.arrow}>›</Text>}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  tile: {
    flex: 1,
    backgroundColor: "#2a2a4a",
    borderRadius: 12,
    padding: 16,
    margin: 4,
    minHeight: 80,
    justifyContent: "center",
  },
  tileOn: {
    backgroundColor: "#1b3a2a",
    borderColor: "#4caf50",
    borderWidth: 1,
  },
  label: {
    fontSize: 13,
    color: "#aaa",
    marginBottom: 4,
  },
  labelOn: {
    color: "#ccc",
  },
  state: {
    fontSize: 16,
    fontWeight: "600",
    color: "#666",
  },
  stateOn: {
    color: "#4caf50",
  },
  arrow: {
    position: "absolute",
    right: 12,
    top: 12,
    fontSize: 20,
    color: "#4fc3f7",
  },
});
