import React from "react";
import { TouchableOpacity, View, StyleSheet } from "react-native";

interface Props {
  onPress: () => void;
}

export function HamburgerButton({ onPress }: Props) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={styles.container}
      activeOpacity={0.7}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
    >
      <View style={styles.bar} />
      <View style={styles.bar} />
      <View style={styles.bar} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 12,
    justifyContent: "center",
  },
  bar: {
    width: 20,
    height: 2,
    backgroundColor: "#fff",
    marginVertical: 2,
    borderRadius: 1,
  },
});
