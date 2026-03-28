import React, { useCallback, useState } from "react";
import { View, Text, StyleSheet, Switch } from "react-native";
import Slider from "@react-native-community/slider";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import {
  AqualinkSwitch,
  AqualinkThermostat,
  AqualinkLight,
  type Brightness,
} from "@quick-pool/iaqualink";
import { useDevicesStore } from "../store/devices";
import type { RootStackParamList } from "../navigation";

type Props = NativeStackScreenProps<RootStackParamList, "DeviceDetail">;

export function DeviceDetailScreen({ route }: Props) {
  const { deviceName } = route.params;
  const systems = useDevicesStore((s) => s.systems);
  const activeSerial = useDevicesStore((s) => s.activeSystemSerial);
  const refreshDevices = useDevicesStore((s) => s.refreshDevices);
  // Subscribe to updates
  useDevicesStore((s) => s.lastRefresh);

  const system = activeSerial ? systems.get(activeSerial) : null;
  const device = system?.devices.get(deviceName);
  const tempUnit = system?.tempUnit ?? "F";

  if (!device) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>Device not found</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{device.label}</Text>

      {device instanceof AqualinkThermostat && (
        <ThermostatControls
          device={device}
          tempUnit={tempUnit}
          onUpdate={refreshDevices}
        />
      )}

      {device instanceof AqualinkLight && (
        <LightControls device={device} onUpdate={refreshDevices} />
      )}

      {device instanceof AqualinkSwitch &&
        !(device instanceof AqualinkThermostat) &&
        !(device instanceof AqualinkLight) && (
          <SwitchControls device={device} onUpdate={refreshDevices} />
        )}
    </View>
  );
}

function ThermostatControls({
  device,
  tempUnit,
  onUpdate,
}: {
  device: AqualinkThermostat;
  tempUnit: string;
  onUpdate: () => Promise<void>;
}) {
  const [tempValue, setTempValue] = useState(
    device.targetTemperature ?? 78,
  );
  const [isSetting, setIsSetting] = useState(false);

  const handleSetTemp = useCallback(async () => {
    setIsSetting(true);
    try {
      await device.setTemperature(Math.round(tempValue));
      await onUpdate();
    } finally {
      setIsSetting(false);
    }
  }, [device, tempValue, onUpdate]);

  const handleToggle = useCallback(async () => {
    if (device.isOn) {
      await device.turnOff();
    } else {
      await device.turnOn();
    }
    await onUpdate();
  }, [device, onUpdate]);

  return (
    <View style={styles.section}>
      <View style={styles.row}>
        <Text style={styles.label}>Power</Text>
        <Switch
          value={device.isOn}
          onValueChange={handleToggle}
          trackColor={{ false: "#333", true: "#4caf50" }}
        />
      </View>

      {device.currentTemperature != null && (
        <Text style={styles.currentTemp}>
          Current: {device.currentTemperature}°{tempUnit}
        </Text>
      )}

      <Text style={styles.setpointLabel}>
        Set to: {Math.round(tempValue)}°{tempUnit}
      </Text>

      <Slider
        style={styles.slider}
        minimumValue={device.minTemperature ?? 40}
        maximumValue={device.maxTemperature ?? 104}
        step={1}
        value={tempValue}
        onValueChange={setTempValue}
        onSlidingComplete={handleSetTemp}
        minimumTrackTintColor="#4fc3f7"
        maximumTrackTintColor="#333"
        thumbTintColor="#4fc3f7"
        disabled={isSetting}
      />
    </View>
  );
}

function LightControls({
  device,
  onUpdate,
}: {
  device: AqualinkLight;
  onUpdate: () => Promise<void>;
}) {
  const handleToggle = useCallback(async () => {
    await device.toggle();
    await onUpdate();
  }, [device, onUpdate]);

  const handleBrightness = useCallback(
    async (value: number) => {
      if (!device.isDimmable) return;
      // Snap to nearest 25% increment
      const snapped = (Math.round(value / 25) * 25) as Brightness;
      await (device as any).setBrightness(snapped);
      await onUpdate();
    },
    [device, onUpdate],
  );

  return (
    <View style={styles.section}>
      <View style={styles.row}>
        <Text style={styles.label}>Power</Text>
        <Switch
          value={device.isOn}
          onValueChange={handleToggle}
          trackColor={{ false: "#333", true: "#4caf50" }}
        />
      </View>

      {device.isDimmable && (
        <>
          <Text style={styles.setpointLabel}>
            Brightness: {device.brightness ?? 0}%
          </Text>
          <Slider
            style={styles.slider}
            minimumValue={0}
            maximumValue={100}
            step={25}
            value={device.brightness ?? 0}
            onSlidingComplete={handleBrightness}
            minimumTrackTintColor="#ffc107"
            maximumTrackTintColor="#333"
            thumbTintColor="#ffc107"
          />
        </>
      )}
    </View>
  );
}

function SwitchControls({
  device,
  onUpdate,
}: {
  device: AqualinkSwitch;
  onUpdate: () => Promise<void>;
}) {
  const handleToggle = useCallback(async () => {
    if (device.isOn) {
      await device.turnOff();
    } else {
      await device.turnOn();
    }
    await onUpdate();
  }, [device, onUpdate]);

  return (
    <View style={styles.section}>
      <View style={styles.row}>
        <Text style={styles.label}>Power</Text>
        <Switch
          value={device.isOn}
          onValueChange={handleToggle}
          trackColor={{ false: "#333", true: "#4caf50" }}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0f0f23",
    padding: 16,
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#0f0f23",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#fff",
    marginBottom: 24,
  },
  section: {
    backgroundColor: "#1a1a2e",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  label: {
    fontSize: 16,
    color: "#ccc",
  },
  currentTemp: {
    fontSize: 18,
    color: "#4fc3f7",
    textAlign: "center",
    marginBottom: 16,
  },
  setpointLabel: {
    fontSize: 16,
    color: "#aaa",
    textAlign: "center",
    marginBottom: 8,
  },
  slider: {
    width: "100%",
    height: 40,
  },
  errorText: {
    color: "#ef5350",
    fontSize: 16,
  },
});
