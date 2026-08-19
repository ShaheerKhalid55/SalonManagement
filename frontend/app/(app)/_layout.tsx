import React from "react";
import { Redirect, Stack } from "expo-router";
import { ActivityIndicator, View } from "react-native";
import { useAuth } from "@/context/AuthContext";

export default function AppLayout() {
  const { isLoading, isAuthenticated } = useAuth();
  if (isLoading) return <View style={{flex:1,alignItems:"center",justifyContent:"center"}}><ActivityIndicator /></View>;
  if (!isAuthenticated) return <Redirect href="/(auth)/login" />;
  return <Stack screenOptions={{headerShown:false}} />;
}
