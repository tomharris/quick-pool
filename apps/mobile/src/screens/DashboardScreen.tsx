import React, { useCallback } from "react";
import {
  View,
  FlatList,
  Text,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
  TouchableOpacity,
} from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import {
  AqualinkDevice,
  AqualinkSwitch,
  AqualinkThermostat,
  AqualinkLight,
} from "@quick-pool/iaqualink";
import { useDevicesStore } from "../store/devices";
import { useAuthStore } from "../store/auth";
import { useDevicePolling, useGroupedDevices } from "../hooks/useDevices";
import { TemperatureDisplay } from "../components/TemperatureDisplay";
import { EquipmentToggles } from "../components/EquipmentToggles";
import { DeviceTile } from "../components/DeviceTile";
import type { RootStackParamList } from "../navigation";

type Props = NativeStackScreenProps<RootStackParamList, "Dashboard">;

export function DashboardScreen({ navigation }: Props) {
  useDevicePolling();

  const isLoading = useDevicesStore((s) => s.isLoading);
  const error = useDevicesStore((s) => s.error);
  const isAuthError = useDevicesStore((s) => s.isAuthError);
  const refreshDevices = useDevicesStore((s) => s.refreshDevices);
  const logout = useAuthStore((s) => s.logout);
  const toggleDevice = useDevicesStore((s) => s.toggleDevice);
  const systems = useDevicesStore((s) => s.systems);
  const activeSerial = useDevicesStore((s) => s.activeSystemSerial);

  const { sensors, pumpsAndHeaters, switches, thermostats, lights } =
    useGroupedDevices();
  const controllableDevices = [...thermostats, ...switches, ...lights];

  const activeSystem = activeSerial ? systems.get(activeSerial) : null;
  const tempUnit = activeSystem?.tempUnit ?? "F";

  const [refreshing, setRefreshing] = React.useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refreshDevices();
    setRefreshing(false);
  }, [refreshDevices]);

  const handleDevicePress = useCallback(
    (device: AqualinkDevice) => {
      if (
        device instanceof AqualinkThermostat ||
        device instanceof AqualinkLight
      ) {
        navigation.navigate("DeviceDetail", { deviceName: device.name });
      } else if (device instanceof AqualinkSwitch) {
        toggleDevice(device.name);
      }
    },
    [navigation, toggleDevice],
  );

  if (isLoading && controllableDevices.length === 0) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#4fc3f7" />
        <Text style={styles.loadingText}>Loading devices...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={controllableDevices}
        keyExtractor={(item) => item.name}
        numColumns={2}
        ListHeaderComponent={
          <>
            <TemperatureDisplay sensors={sensors} tempUnit={tempUnit} />
            <EquipmentToggles
              devices={pumpsAndHeaters}
              onToggle={handleDevicePress}
            />
            {error && (
              <View style={styles.errorContainer}>
                <Text style={styles.errorText}>{error}</Text>
                {isAuthError && (
                  <TouchableOpacity onPress={logout} activeOpacity={0.8}>
                    <Text style={styles.signOutLink}>Sign Out</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}
            {controllableDevices.length > 0 && (
              <Text style={styles.sectionTitle}>Devices</Text>
            )}
          </>
        }
        renderItem={({ item }) => (
          <DeviceTile device={item} onPress={handleDevicePress} />
        )}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#4fc3f7"
          />
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0f0f23",
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#0f0f23",
  },
  loadingText: {
    color: "#888",
    marginTop: 12,
    fontSize: 14,
  },
  errorContainer: {
    alignItems: "center",
    marginTop: 8,
    marginHorizontal: 16,
  },
  errorText: {
    color: "#ef5350",
    fontSize: 13,
    textAlign: "center",
  },
  signOutLink: {
    color: "#4fc3f7",
    fontSize: 14,
    fontWeight: "600",
    marginTop: 8,
    paddingVertical: 4,
  },
  sectionTitle: {
    color: "#888",
    fontSize: 13,
    fontWeight: "600",
    textTransform: "uppercase",
    marginHorizontal: 20,
    marginTop: 20,
    marginBottom: 4,
  },
  list: {
    paddingBottom: 24,
    paddingHorizontal: 12,
  },
});
