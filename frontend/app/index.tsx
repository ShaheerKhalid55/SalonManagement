import React from "react";
import { Redirect } from "expo-router";
import { ActivityIndicator, View } from "react-native";
import { useAuth } from "@/context/AuthContext";

export default function Index() {
  const { isLoading, isAuthenticated, user } = useAuth();
  if (isLoading) return <View style={{flex:1,alignItems:"center",justifyContent:"center"}}><ActivityIndicator/></View>;
  if (!isAuthenticated) return <Redirect href="/(auth)/login" />;
  if (user?.role === "AGENT") return <Redirect href="/agent/dashboard" />;
  return <Redirect href="/(tabs)/home" />;
}
