import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuthStore } from "../store/auth";

interface Props {
  visible: boolean;
  onClose: () => void;
  onNavigate: (screen: string) => void;
}

const DRAWER_WIDTH = 280;

export function DrawerMenu({ visible, onClose, onNavigate }: Props) {
  const translateX = useRef(new Animated.Value(-DRAWER_WIDTH)).current;
  const [modalVisible, setModalVisible] = useState(false);
  const logout = useAuthStore((s) => s.logout);

  useEffect(() => {
    if (visible) {
      setModalVisible(true);
      Animated.timing(translateX, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(translateX, {
        toValue: -DRAWER_WIDTH,
        duration: 250,
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (finished) setModalVisible(false);
      });
    }
  }, [visible, translateX]);

  const handleSignOut = async () => {
    onClose();
    await logout();
  };

  return (
    <Modal
      visible={modalVisible}
      transparent
      animationType="none"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={onClose} />
        <Animated.View
          style={[styles.panel, { transform: [{ translateX }] }]}
        >
          <SafeAreaView style={styles.panelInner} edges={["top", "bottom"]}>
            <Text style={styles.title}>Quick Pool</Text>
            <View style={styles.divider} />

            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => onNavigate("Settings")}
              activeOpacity={0.7}
            >
              <Text style={styles.menuItemText}>Settings</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.menuItem}
              onPress={handleSignOut}
              activeOpacity={0.7}
            >
              <Text style={styles.signOutText}>Sign Out</Text>
            </TouchableOpacity>
          </SafeAreaView>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    flexDirection: "row",
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  panel: {
    width: DRAWER_WIDTH,
    backgroundColor: "#1a1a2e",
    elevation: 16,
    shadowColor: "#000",
    shadowOffset: { width: 2, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  panelInner: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  title: {
    color: "#4fc3f7",
    fontSize: 22,
    fontWeight: "700",
    marginBottom: 16,
  },
  divider: {
    height: 1,
    backgroundColor: "#333",
    marginBottom: 8,
  },
  menuItem: {
    paddingVertical: 14,
    paddingHorizontal: 4,
  },
  menuItemText: {
    color: "#fff",
    fontSize: 16,
  },
  signOutText: {
    color: "#ef5350",
    fontSize: 16,
    fontWeight: "600",
  },
});
