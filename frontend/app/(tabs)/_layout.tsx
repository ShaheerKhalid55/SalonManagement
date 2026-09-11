import React from "react";
import { Text, View, Platform, StyleSheet } from "react-native";
import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors } from "@/constants/theme";

export default function TabsLayout() {
  const insets = useSafeAreaInsets();
  const bottomInset = Math.max(insets.bottom, Platform.OS === "android" ? 0 : 0);
  const baseHeight = 58;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.plum,
        tabBarInactiveTintColor: "#A39A9F",
        tabBarHideOnKeyboard: true,
        tabBarStyle: {
          height: baseHeight + bottomInset,
          paddingTop: 6,
          paddingBottom: Math.max(bottomInset, 6),
          backgroundColor: colors.white,
          borderTopColor: colors.border,
          borderTopWidth: StyleSheet.hairlineWidth,
          elevation: 12,
        },
        tabBarItemStyle: {
          flex: 1,
          minWidth: 0,
        },
        tabBarLabelStyle: {
          fontSize: 10,
          lineHeight: 12,
          fontWeight: "700",
          marginTop: 1,
        },
        tabBarIconStyle: {
          marginTop: 0,
        },
      }}
    >
      <Tabs.Screen name="home" options={{ title: "Home", tabBarIcon: ({ color, size }) => <Ionicons name="home-outline" size={size} color={color} /> }} />
      <Tabs.Screen name="appointments" options={{ title: "Bookings", tabBarIcon: ({ color, size }) => <Ionicons name="calendar-outline" size={size} color={color} /> }} />
      <Tabs.Screen name="wallet" options={{ title: "Wallet", tabBarIcon: ({ color, size }) => <Ionicons name="wallet-outline" size={size} color={color} /> }} />
      <Tabs.Screen name="services" options={{ title: "Services", tabBarIcon: ({ color, size }) => <Ionicons name="cut-outline" size={size} color={color} /> }} />
      <Tabs.Screen name="profile" options={{ title: "Account", tabBarIcon: ({ size }) => <View style={{ width: size, height: size, borderRadius: 12, backgroundColor: colors.plum, alignItems: "center", justifyContent: "center" }}><Text style={{ color: colors.champagneLight, fontSize: 16, fontWeight: "900" }}>S</Text></View> }} />
      <Tabs.Screen name="referral" options={{ href: null }} />
      <Tabs.Screen name="notifications" options={{ href: null }} />
      <Tabs.Screen name="reminders" options={{ href: null }} />
    </Tabs>
  );
}
