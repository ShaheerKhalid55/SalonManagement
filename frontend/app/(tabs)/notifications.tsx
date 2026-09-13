import React, { useCallback, useMemo, useState } from "react";
import { Alert, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { router, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Screen } from "@/components/Screen";
import { getApiErrorMessage } from "@/lib/api";
import { colors, radius, shadows } from "@/constants/theme";
import { getNotifications, markNotificationRead, Notification } from "@/services/notifications";
import { AppText } from "@/components/Typography";

type Filter = "ALL" | "APPOINTMENTS" | "PROMOTIONS" | "SYSTEM";

function category(n: Notification): Exclude<Filter, "ALL"> {
  const value = `${n.notification_type} ${n.title} ${n.message}`.toLowerCase();
  if (value.includes("offer") || value.includes("promotion") || value.includes("reward")) return "PROMOTIONS";
  if (value.includes("system") || value.includes("password") || value.includes("account")) return "SYSTEM";
  return "APPOINTMENTS";
}

function iconFor(n: Notification) {
  const c = category(n);
  if (c === "PROMOTIONS") return "gift-outline";
  if (c === "SYSTEM") return "settings-outline";
  if (n.title.toLowerCase().includes("reminder")) return "notifications-outline";
  if (n.title.toLowerCase().includes("completed")) return "checkmark-circle-outline";
  return "calendar-outline";
}

export default function NotificationsScreen() {
  const [items, setItems] = useState<Notification[]>([]);
  const [filter, setFilter] = useState<Filter>("ALL");
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try { setItems(await getNotifications()); }
    catch (e) { Alert.alert("Notifications", getApiErrorMessage(e)); }
    finally { setRefreshing(false); }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const visible = useMemo(() => filter === "ALL" ? items : items.filter(n => category(n) === filter), [items, filter]);
  const unread = items.filter(n => !n.is_read).length;

  async function read(item: Notification) {
    if (item.is_read) return;
    try {
      const updated = await markNotificationRead(item.id);
      setItems(prev => prev.map(x => x.id === item.id ? updated : x));
    } catch (e) { Alert.alert("Notification", getApiErrorMessage(e)); }
  }

  return <Screen>
    <ScrollView contentContainerStyle={styles.content} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={colors.plum} />}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backCircle} accessibilityRole="button" accessibilityLabel="Back"><Ionicons name="arrow-back" size={20} color={colors.plum} /></Pressable>
        <View style={{ flex: 1 }}><AppText style={styles.kicker}>STAY UPDATED</AppText><AppText style={styles.title}>Notifications</AppText></View>
        {unread > 0 && <View style={styles.unreadBadge}><AppText style={styles.unreadBadgeText}>{unread} new</AppText></View>}
      </View>

      <View style={styles.filters}>
        {(["ALL", "APPOINTMENTS", "PROMOTIONS", "SYSTEM"] as Filter[]).map(key => <Pressable key={key} onPress={() => setFilter(key)} style={[styles.filterPill, filter === key && styles.filterPillActive]}>
          <AppText style={[styles.filterText, filter === key && styles.filterTextActive]}>{key === "ALL" ? "All" : key.charAt(0) + key.slice(1).toLowerCase()}</AppText>
        </Pressable>)}
      </View>

      {visible.length === 0 ? <View style={styles.empty}><View style={styles.emptyIcon}><Ionicons name="notifications-off-outline" size={25} color={colors.plum} /></View><AppText style={styles.emptyTitle}>You're all caught up</AppText><AppText style={styles.emptyText}>New salon updates and reminders will appear here.</AppText></View> : visible.map(n => <Pressable key={n.id} onPress={() => read(n)} style={[styles.item, !n.is_read && styles.unreadItem]}>
        <View style={[styles.icon, { backgroundColor: category(n) === "PROMOTIONS" ? colors.champagneLight : colors.ivoryDeep }]}><Ionicons name={iconFor(n) as any} size={18} color={colors.plum} /></View>
        <View style={{ flex: 1 }}>
          <View style={styles.itemTop}><AppText style={styles.itemTitle} numberOfLines={1}>{n.title}</AppText><AppText style={styles.time}>{new Date(n.created_at).toLocaleDateString("en-PK", { day: "numeric", month: "short" })}</AppText></View>
          <AppText style={styles.message}>{n.message}</AppText>
          {!n.is_read && <View style={styles.unreadLine}><View style={styles.redDot} /><AppText style={styles.unreadText}>Unread · tap to mark as read</AppText></View>}
        </View>
      </Pressable>)}
    </ScrollView>
  </Screen>;
}

const styles = StyleSheet.create({
  content: { paddingVertical: 22, paddingBottom: 50 },
  header: { flexDirection: "row", alignItems: "center", marginBottom: 18, gap: 11 },
  backCircle: { width: 40, height: 40, borderRadius: 14, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border, alignItems: "center", justifyContent: "center", ...shadows.card },
  kicker: { color: colors.champagne, fontSize: 9, fontWeight: "900", letterSpacing: 1.3 },
  title: { color: colors.ink, fontSize: 27, fontWeight: "900", marginTop: 2 },
  unreadBadge: { backgroundColor: colors.champagneLight, borderRadius: 10, paddingHorizontal: 9, paddingVertical: 6 },
  unreadBadgeText: { color: colors.plum, fontSize: 9, fontWeight: "900" },
  filters: { flexDirection: "row", gap: 8, marginBottom: 15 },
  filterPill: { borderWidth: 1, borderColor: colors.border, backgroundColor: colors.white, borderRadius: 18, paddingHorizontal: 13, paddingVertical: 9 },
  filterPillActive: { backgroundColor: colors.plum, borderColor: colors.plum },
  filterText: { color: colors.muted, fontSize: 10, fontWeight: "800" },
  filterTextActive: { color: colors.white },
  item: { backgroundColor: colors.white, borderRadius: radius.lg, padding: 14, marginBottom: 10, flexDirection: "row", alignItems: "flex-start", borderWidth: 1, borderColor: colors.border, ...shadows.card },
  unreadItem: { borderColor: colors.champagne },
  icon: { width: 42, height: 42, borderRadius: 14, alignItems: "center", justifyContent: "center", marginRight: 11 },
  itemTop: { flexDirection: "row", justifyContent: "space-between", gap: 8 },
  itemTitle: { color: colors.plum, fontWeight: "900", fontSize: 13, flex: 1 },
  message: { color: colors.muted, fontSize: 11, lineHeight: 17, marginTop: 4 },
  time: { color: colors.muted, fontSize: 9 },
  unreadLine: { flexDirection: "row", alignItems: "center", marginTop: 7, gap: 5 },
  redDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: "#D94B63" },
  unreadText: { color: colors.muted, fontSize: 9, fontWeight: "700" },
  empty: { backgroundColor: colors.white, borderRadius: radius.xl, padding: 28, borderWidth: 1, borderColor: colors.border, alignItems: "center", ...shadows.card },
  emptyIcon: { width: 56, height: 56, borderRadius: 19, backgroundColor: colors.ivoryDeep, alignItems: "center", justifyContent: "center", marginBottom: 10 },
  emptyTitle: { color: colors.ink, fontSize: 17, fontWeight: "900" },
  emptyText: { color: colors.muted, fontSize: 11, lineHeight: 17, textAlign: "center", marginTop: 5 },
});
