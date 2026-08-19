import React from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Screen } from "@/components/Screen";
import { AppButton } from "@/components/AppButton";
import { useAuth } from "@/context/AuthContext";
import { colors, radius, shadows } from "@/constants/theme";

export default function ProfileScreen() {
  const { user, signOut } = useAuth();
  const logout = async () => { await signOut(); router.replace("/(auth)/login"); };
  const initials = (user?.name?.trim()?.[0] ?? "S").toUpperCase();

  const menu = [
    ["person-outline", "Personal information", "Manage your name, phone and email", () => {}],
    ["notifications-outline", "Notifications", "Booking updates and offers", () => router.push("/(tabs)/notifications")],
    ["time-outline", "Reminders", "Your upcoming salon reminders", () => router.push("/(tabs)/reminders")],
    ["gift-outline", "Referral program", "Invite friends and earn rewards", () => router.push("/(tabs)/referral")],
    ["settings-outline", "Settings", "Preferences and app settings", () => {}],
  ] as const;

  return <Screen>
    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.kicker}>ACCOUNT</Text>
          <Text style={styles.title}>My profile</Text>
          <Text style={styles.subtitle}>Manage your account, preferences and salon journey.</Text>
        </View>
      </View>

      <View style={styles.hero}>
        <View style={styles.heroGlow} />
        <View style={styles.avatar}><Text style={styles.avatarText}>{initials}</Text></View>
        <View style={styles.heroInfo}>
          <Text style={styles.name} numberOfLines={1}>{user?.name ?? "Customer"}</Text>
          <Text style={styles.role}>CUSTOMER</Text>
          <Text style={styles.phone}>{user?.phone ?? "Phone not provided"}</Text>
        </View>
        <Pressable onPress={() => {}} style={styles.editButton}>
          <Ionicons name="create-outline" size={18} color={colors.champagneLight} />
        </Pressable>
      </View>

      <View style={styles.membership}>
        <View style={styles.membershipIcon}><Ionicons name="sparkles-outline" size={20} color={colors.plum} /></View>
        <View style={{ flex: 1 }}>
          <Text style={styles.membershipTitle}>Membership</Text>
          <Text style={styles.membershipText}>Customer account · Ready for your next visit</Text>
        </View>
        <View style={styles.activePill}><View style={styles.activeDot} /><Text style={styles.activeText}>ACTIVE</Text></View>
      </View>

      <Text style={styles.sectionTitle}>Account</Text>
      <View style={styles.menu}>
        {menu.map(([icon, label, description, onPress], index) => <Pressable key={label} onPress={onPress} style={[styles.menuRow, index === menu.length - 1 && styles.lastRow]}>
          <View style={styles.menuIcon}><Ionicons name={icon as any} size={19} color={colors.plum} /></View>
          <View style={styles.menuCopy}>
            <Text style={styles.menuLabel}>{label}</Text>
            <Text style={styles.menuDescription}>{description}</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.muted} />
        </Pressable>)}
      </View>

      <Text style={styles.sectionTitle}>Account status</Text>
      <View style={styles.statusCard}>
        <View><Text style={styles.statusLabel}>EMAIL</Text><Text style={styles.statusValue}>{user?.email ?? "Not provided"}</Text></View>
        <View style={styles.verified}><Ionicons name="checkmark-circle" size={15} color={colors.success} /><Text style={styles.verifiedText}>ACCOUNT ACTIVE</Text></View>
      </View>

      <AppButton title="Sign out" variant="ghost" onPress={() => Alert.alert("Sign out", "Are you sure you want to sign out?", [{ text: "Cancel", style: "cancel" }, { text: "Sign out", style: "destructive", onPress: logout }])} style={styles.signOut} />
    </ScrollView>
  </Screen>;
}

const styles = StyleSheet.create({
  content: { paddingVertical: 22, paddingBottom: 50 },
  header: { flexDirection: "row", alignItems: "flex-start", marginBottom: 18 },
  kicker: { color: colors.champagne, fontSize: 10, fontWeight: "900", letterSpacing: 1.4 },
  title: { color: colors.ink, fontSize: 29, fontWeight: "900", marginTop: 4 },
  subtitle: { color: colors.muted, fontSize: 13, lineHeight: 19, marginTop: 5, paddingRight: 12 },
  hero: { backgroundColor: colors.plum, borderRadius: radius.xl, padding: 18, flexDirection: "row", alignItems: "center", overflow: "hidden", ...shadows.card },
  heroGlow: { position: "absolute", width: 150, height: 150, borderRadius: 75, right: -65, top: -80, backgroundColor: "rgba(217,184,121,.14)" },
  avatar: { width: 68, height: 68, borderRadius: 23, backgroundColor: colors.champagneLight, alignItems: "center", justifyContent: "center", borderWidth: 3, borderColor: "rgba(255,255,255,.18)" },
  avatarText: { color: colors.plum, fontSize: 27, fontWeight: "900" },
  heroInfo: { flex: 1, marginLeft: 14 },
  name: { color: colors.white, fontSize: 18, fontWeight: "900" },
  role: { color: colors.champagneLight, fontSize: 9, fontWeight: "900", letterSpacing: 1.1, marginTop: 5 },
  phone: { color: "#CDBFD2", fontSize: 11, marginTop: 5 },
  editButton: { width: 38, height: 38, borderRadius: 13, backgroundColor: "rgba(255,255,255,.10)", alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "rgba(255,255,255,.16)" },
  membership: { marginTop: 14, backgroundColor: colors.white, borderRadius: radius.lg, padding: 14, flexDirection: "row", alignItems: "center", borderWidth: 1, borderColor: colors.border, ...shadows.card },
  membershipIcon: { width: 42, height: 42, borderRadius: 14, backgroundColor: colors.ivoryDeep, alignItems: "center", justifyContent: "center", marginRight: 11 },
  membershipTitle: { color: colors.ink, fontSize: 14, fontWeight: "900" },
  membershipText: { color: colors.muted, fontSize: 10, marginTop: 3 },
  activePill: { backgroundColor: "#E8F4EE", paddingHorizontal: 8, paddingVertical: 6, borderRadius: 9, flexDirection: "row", alignItems: "center", gap: 4 },
  activeDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.success },
  activeText: { color: colors.success, fontSize: 8, fontWeight: "900" },
  sectionTitle: { color: colors.ink, fontSize: 16, fontWeight: "900", marginTop: 24, marginBottom: 9 },
  menu: { backgroundColor: colors.white, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, overflow: "hidden", ...shadows.card },
  menuRow: { minHeight: 72, paddingHorizontal: 13, flexDirection: "row", alignItems: "center", borderBottomWidth: 1, borderBottomColor: colors.border },
  lastRow: { borderBottomWidth: 0 },
  menuIcon: { width: 40, height: 40, borderRadius: 13, backgroundColor: colors.ivoryDeep, alignItems: "center", justifyContent: "center", marginRight: 11 },
  menuCopy: { flex: 1 },
  menuLabel: { color: colors.ink, fontSize: 13, fontWeight: "900" },
  menuDescription: { color: colors.muted, fontSize: 10, marginTop: 3 },
  statusCard: { backgroundColor: colors.white, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, padding: 15, flexDirection: "row", alignItems: "center", justifyContent: "space-between", ...shadows.card },
  statusLabel: { color: colors.muted, fontSize: 8, fontWeight: "900", letterSpacing: 1 },
  statusValue: { color: colors.ink, fontSize: 12, fontWeight: "800", marginTop: 4 },
  verified: { flexDirection: "row", alignItems: "center", gap: 5 },
  verifiedText: { color: colors.success, fontSize: 8, fontWeight: "900" },
  signOut: { width: "100%", minHeight: 50, marginTop: 20 },
});
