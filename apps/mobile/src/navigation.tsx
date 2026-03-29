import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  NavigationContainer,
  DefaultTheme,
  NavigationContainerRef,
} from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useAuthStore } from "./store/auth";
import { DashboardScreen } from "./screens/DashboardScreen";
import { DeviceDetailScreen } from "./screens/DeviceDetailScreen";
import { SettingsScreen } from "./screens/SettingsScreen";
import { LoginScreen } from "./screens/LoginScreen";
import { DrawerMenu } from "./components/DrawerMenu";
import { HamburgerButton } from "./components/HamburgerButton";

export type RootStackParamList = {
  Dashboard: undefined;
  DeviceDetail: { deviceName: string };
  Settings: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

const DarkTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: "#4fc3f7",
    background: "#0f0f23",
    card: "#1a1a2e",
    text: "#ffffff",
    border: "#333",
    notification: "#ef5350",
  },
};

export function AppNavigator() {
  const isLoggedIn = useAuthStore((s) => s.isLoggedIn);
  const isLoading = useAuthStore((s) => s.isLoading);
  const tryRestoreSession = useAuthStore((s) => s.tryRestoreSession);

  const [drawerVisible, setDrawerVisible] = useState(false);
  const navRef = useRef<NavigationContainerRef<RootStackParamList>>(null);

  const handleDrawerNavigate = useCallback((screen: string) => {
    setDrawerVisible(false);
    navRef.current?.navigate({ name: screen } as never);
  }, []);

  useEffect(() => {
    tryRestoreSession();
  }, [tryRestoreSession]);

  if (isLoading && !isLoggedIn) {
    // Could show a splash screen here; for now just show login
    return null;
  }

  return (
    <NavigationContainer theme={DarkTheme} ref={navRef}>
      {isLoggedIn ? (
        <>
          <Stack.Navigator
            screenOptions={{
              headerStyle: { backgroundColor: "#1a1a2e" },
              headerTintColor: "#fff",
            }}
          >
            <Stack.Screen
              name="Dashboard"
              component={DashboardScreen}
              options={{
                title: "Quick Pool",
                headerLeft: () => (
                  <HamburgerButton onPress={() => setDrawerVisible(true)} />
                ),
              }}
            />
            <Stack.Screen
              name="DeviceDetail"
              component={DeviceDetailScreen}
              options={{ title: "Device" }}
            />
            <Stack.Screen
              name="Settings"
              component={SettingsScreen}
              options={{ title: "Settings" }}
            />
          </Stack.Navigator>
          <DrawerMenu
            visible={drawerVisible}
            onClose={() => setDrawerVisible(false)}
            onNavigate={handleDrawerNavigate}
          />
        </>
      ) : (
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          <Stack.Screen name="Dashboard" component={LoginScreen} />
        </Stack.Navigator>
      )}
    </NavigationContainer>
  );
}
