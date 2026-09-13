import React, { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@/context/AuthContext";
import { Screen } from "@/components/Screen";
import { AppButton } from "@/components/AppButton";
import { api } from "@/lib/api";
import { getMyBookings, Booking } from "@/services/bookings";
import { getNotifications } from "@/services/notifications";
import { colors, radius, shadows, spacing } from "@/constants/theme";
import { AppText } from "@/components/Typography";

function money(v: unknown) { const n = Number(v ?? 0); return `PKR ${Number.isNaN(n) ? 0 : n.toLocaleString("en-PK", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`; }
function dateText(v: string) { return new Date(`${v}T12:00:00`).toLocaleDateString("en-PK", { weekday: "short", day: "numeric", month: "short" }); }
function time(v: string) { return v.slice(0, 5); }

export default function HomeScreen() {
  const { user } = useAuth(); const [balance, setBalance] = useState(0); const [upcoming, setUpcoming] = useState<Booking[]>([]); const [unread, setUnread] = useState(0); const [loading, setLoading] = useState(true); const [refreshing, setRefreshing] = useState(false);
  const load = useCallback(async () => { try { const [w, b, n] = await Promise.all([api.get<{ balance: number | string }>("/wallet"), getMyBookings(), getNotifications(true)]); setBalance(Number(w.data.balance ?? 0)); setUpcoming(b.filter(x => ["PENDING", "CONFIRMED", "IN_PROGRESS"].includes(x.status)).slice(0, 1)); setUnread(n.length); } catch (e) { } finally { setLoading(false); setRefreshing(false); } }, []);
  useEffect(() => { load(); }, [load]);
  const firstName = user?.name?.split(" ")[0] || "there";
  return <Screen><ScrollView contentContainerStyle={styles.content} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} />}>
    <View style={styles.header}><View style={{ flex: 1 }}><AppText style={styles.kicker}>YOUR BEAUTY JOURNEY</AppText><AppText style={styles.title}>Good morning, {firstName} 👋</AppText><AppText style={styles.subtitle}>Ready for your next visit?</AppText></View><View style={styles.headerIcons}><Pressable accessibilityRole="button" accessibilityLabel="Notifications" onPress={() => router.push("/(tabs)/notifications")} style={styles.iconButton}><Ionicons name="notifications-outline" size={20} color={colors.plum} />{unread > 0 && <View style={styles.dot}><AppText style={styles.dotText}>{unread > 9 ? "9+" : unread}</AppText></View>}</Pressable></View></View>
    <View style={styles.wallet}><View style={styles.walletTop}><AppText style={styles.walletLabel}>WALLET BALANCE</AppText><Ionicons name="wallet-outline" size={28} color={colors.champagne} /></View><AppText style={styles.walletAmount}>{loading ? <ActivityIndicator color={colors.white} /> : money(balance)}</AppText><AppButton title="View wallet  →" variant="secondary" onPress={() => router.push("/(tabs)/wallet")} style={styles.walletButton} /></View>
    <View style={styles.sectionHeader}><AppText style={styles.section}>Quick actions</AppText></View>
    <View style={styles.quickGrid}>{[
      ["cut-outline", "Services", "/(tabs)/services"]
    ].map(([icon, label, path]) => <Pressable key={label} onPress={() => router.push(path as any)} style={styles.quick}><View style={styles.quickIcon}><Ionicons name={icon as any} size={21} color={colors.plum} /></View><AppText style={styles.quickText}>{label}</AppText><Ionicons name="chevron-forward" size={18} color={colors.plum} /></Pressable>)}</View>
    <View style={styles.sectionHeader}><AppText style={styles.section}>Upcoming appointment</AppText><Pressable onPress={() => router.push("/(tabs)/appointments")} style={styles.viewAllWrap}><AppText style={styles.viewAll}>View all</AppText><Ionicons name="chevron-forward" size={14} color={colors.champagne} /></Pressable></View>
    {upcoming.length === 0 ? <View style={styles.card}><AppText style={styles.cardTitle}>Your next visit is waiting ✨</AppText><AppText style={styles.text}>Explore our services and reserve your preferred time.</AppText><AppButton title="Browse services" onPress={() => router.push("/(tabs)/services")} style={{ marginTop: 14 }} /></View> :
      <View style={styles.appointment}>
  <View style={styles.appointmentRow}>
    <View style={styles.dateBox}>
      <AppText style={styles.dateDay}>{new Date(`${upcoming[0].booking_date}T12:00:00`).getDate()}</AppText>
      <AppText style={styles.dateMonth}>{new Date(`${upcoming[0].booking_date}T12:00:00`).toLocaleDateString("en-PK",{month:"short"}).toUpperCase()}</AppText>
    </View>
    <View style={{ flex: 1, marginLeft: 14 }}>
      <View style={styles.status}><AppText style={styles.statusText}>UPCOMING</AppText></View>
      <AppText style={styles.appTitle}>{upcoming[0].items.map(i=>i.name).join(" + ")}</AppText>
      <AppText style={styles.text}>{dateText(upcoming[0].booking_date)} · {time(upcoming[0].start_time)}</AppText>
      <AppText style={styles.location}>⌖ Glamour Salon</AppText>
    </View>
    <Ionicons name="chevron-forward" size={20} color={colors.muted} />
  </View>

  <AppButton
    title="View appointment"
    variant="ghost"
    onPress={() => router.push({ pathname: "/booking/[id]", params: { id: String(upcoming[0].id) } })}
    style={styles.fullButton}
  />
</View>}
  </ScrollView></Screen>;
}
const styles = StyleSheet.create({ content: { paddingVertical: 24, paddingBottom: 40 }, header: { flexDirection: "row", alignItems: "flex-start", marginBottom: 22 }, kicker: { color: colors.champagne, fontSize: 10, fontWeight: "900", letterSpacing: 1.4 }, title: { color: colors.ink, fontSize: 25, fontWeight: "800", marginTop: 5, flexShrink: 1 }, subtitle: { color: colors.muted, fontSize: 14, marginTop: 4 }, headerIcons: { flexDirection: "row", marginLeft: 10 }, iconButton: { width: 42, height: 42, borderRadius: 15, backgroundColor: colors.white, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: colors.border }, dot: { position: "absolute", right: -2, top: -4, minWidth: 17, height: 17, borderRadius: 9, backgroundColor: colors.plum, alignItems: "center", justifyContent: "center", paddingHorizontal: 3 }, dotText: { color: colors.white, fontSize: 8, fontWeight: "900" }, wallet: { backgroundColor: colors.plum, borderRadius: radius.lg, padding: 20, marginBottom: 26, ...shadows.card }, walletTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" }, walletLabel: { color: "#D8CADC", fontSize: 10, fontWeight: "800", letterSpacing: 1 }, walletAmount: { color: colors.white, fontSize: 30, fontWeight: "900", marginVertical: 7 }, walletButton: { alignSelf: "flex-start", paddingHorizontal: 14, minHeight: 40 }, sectionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 11 }, viewAllWrap: { flexDirection: "row", alignItems: "center", gap: 2 }, section: { color: colors.ink, fontSize: 18, fontWeight: "900" }, viewAll: { color: colors.champagne, fontSize: 12, fontWeight: "800" }, quickGrid: { flexDirection: "row", flexWrap: "wrap", gap: 9, marginBottom: 26 }, quick: { width: "48%", backgroundColor: colors.white, borderRadius: radius.md, padding: 13, flexDirection: "row", alignItems: "center", borderWidth: 1, borderColor: colors.border, ...shadows.card }, quickIcon: { width: 38, height: 38, borderRadius: 13, backgroundColor: colors.ivoryDeep, alignItems: "center", justifyContent: "center", marginRight: 9 }, quickText: { color: colors.ink, fontSize: 12, fontWeight: "800", flex: 1 }, card: { backgroundColor: colors.white, borderRadius: radius.lg, padding: 18, borderWidth: 1, borderColor: colors.border, ...shadows.card }, cardTitle: { color: colors.ink, fontSize: 17, fontWeight: "900" }, text: { color: colors.muted, fontSize: 12, lineHeight: 18, marginTop: 4 }, appointment: {
  backgroundColor: colors.white,
  borderRadius: radius.lg,
  padding: 16,
  borderWidth: 1,
  borderColor: colors.border,
  ...shadows.card,
},dateBox: {
  width: 52,
  height: 58,
  borderRadius: 15,
  backgroundColor: colors.ivoryDeep,
  alignItems: "center",
  justifyContent: "center",
}, dateDay: { fontSize: 21, fontWeight: "900", color: colors.plum }, dateMonth: { fontSize: 9, fontWeight: "900", color: colors.muted, marginTop: 1 }, status: {
  alignSelf: "flex-start",
  backgroundColor: "#F9EED9",
  borderRadius: 8,
  paddingHorizontal: 7,
  paddingVertical: 4,
},fullButton: {
  width: "100%",
  marginTop: 18,
},appointmentRow: {
  flexDirection: "row",
  alignItems: "center",
},location: { color: colors.plum, fontSize: 11, fontWeight: "700", marginTop: 5 },appTitle: { color: colors.ink, fontSize: 15, fontWeight: "900", marginTop: 7 },statusText: { fontSize: 8, fontWeight: "900", color: colors.plum, letterSpacing: 0.6 } }
);
