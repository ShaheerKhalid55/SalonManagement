import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Alert, Modal, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View, Pressable } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Screen } from "@/components/Screen";
import { AppButton } from "@/components/AppButton";
import { Booking, getMyBookings } from "@/services/bookings";
import { getApiErrorMessage } from "@/lib/api";
import { colors, radius, shadows } from "@/constants/theme";
import { AppText, AppTextInput } from "@/components/Typography";

const money = (v: unknown) => `PKR ${Number(v ?? 0).toLocaleString("en-PK", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
function dateText(value: string) { return new Date(`${value}T12:00:00`).toLocaleDateString("en-PK", { weekday: "short", day: "numeric", month: "short", year: "numeric" }); }
function time(value: string) { return value.slice(0, 5); }

type TabKey = "UPCOMING" | "COMPLETED" | "CANCELLED";
type DateFilter = "ALL" | "TODAY" | "NEXT_7" | "THIS_MONTH";

const isCancelled = (status: string) => ["CANCELLED", "CANCELED"].includes(status.toUpperCase());
const isCompleted = (status: string) => status.toUpperCase() === "COMPLETED";
const isUpcoming = (status: string) => ["PENDING", "CONFIRMED", "IN_PROGRESS"].includes(status.toUpperCase());

export default function AppointmentsScreen() {
  const [items, setItems] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<TabKey>("UPCOMING");
  const [search, setSearch] = useState("");
  const [dateFilter, setDateFilter] = useState<DateFilter>("ALL");
  const [filterOpen, setFilterOpen] = useState(false);

  const load = useCallback(async () => {
    try { setItems(await getMyBookings()); }
    catch (e) { Alert.alert("Appointments", getApiErrorMessage(e)); }
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const tabItems = useMemo(() => ({
    UPCOMING: items.filter(b => isUpcoming(b.status)),
    COMPLETED: items.filter(b => isCompleted(b.status)),
    CANCELLED: items.filter(b => isCancelled(b.status)),
  }), [items]);

  const filteredItems = useMemo(() => {
    const query = search.trim().toLowerCase();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayKey = today.toISOString().slice(0, 10);
    const next7 = new Date(today);
    next7.setDate(next7.getDate() + 7);
    const month = today.getMonth();
    const year = today.getFullYear();

    return tabItems[activeTab].filter(b => {
      const bookingDate = new Date(`${b.booking_date}T12:00:00`);
      const matchesDate = dateFilter === "ALL"
        || (dateFilter === "TODAY" && b.booking_date === todayKey)
        || (dateFilter === "NEXT_7" && bookingDate >= today && bookingDate <= next7)
        || (dateFilter === "THIS_MONTH" && bookingDate.getMonth() === month && bookingDate.getFullYear() === year);
      if (!matchesDate) return false;
      if (!query) return true;
      const haystack = [b.booking_number, b.status, b.booking_date, dateText(b.booking_date), ...b.items.map(i => i.name)].join(" ").toLowerCase();
      return haystack.includes(query);
    });
  }, [activeTab, search, tabItems, dateFilter]);

  const changeTab = (tab: TabKey) => {
    setActiveTab(tab);
    setSearch("");
  };

  return <Screen>
    <ScrollView
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={colors.plum} />}
    >
      <View style={styles.headerRow}>
        <View style={{ flex: 1 }}>
          <AppText style={styles.kicker}>YOUR VISITS</AppText>
          <AppText style={styles.title}>My appointments</AppText>
          <AppText style={styles.subtitle}>Everything from your next visit to your salon history.</AppText>
        </View>
        <Pressable accessibilityRole="button" accessibilityLabel="Filter appointments by date" onPress={() => setFilterOpen(true)} style={[styles.headerIcon, dateFilter !== "ALL" && styles.headerIconActive]}><Ionicons name="calendar-outline" size={21} color={colors.plum} /><View style={styles.filterBadge}><Ionicons name="options-outline" size={9} color={colors.white} /></View></Pressable>
      </View>

      <View style={styles.searchBox}>
        <Ionicons name="search-outline" size={19} color={colors.muted} />
        <AppTextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Search by service or booking number"
          placeholderTextColor={colors.muted}
          style={styles.searchInput}
          returnKeyType="search"
          autoCapitalize="none"
        />
        {search.length > 0 && <Pressable onPress={() => setSearch("")} hitSlop={8} style={styles.clearButton}>
          <Ionicons name="close-circle" size={18} color={colors.muted} />
        </Pressable>}
      </View>

      <View style={styles.tabs}>
        <Tab label="Upcoming" count={tabItems.UPCOMING.length} active={activeTab === "UPCOMING"} onPress={() => changeTab("UPCOMING")} />
        <Tab label="Completed" count={tabItems.COMPLETED.length} active={activeTab === "COMPLETED"} onPress={() => changeTab("COMPLETED")} />
        <Tab label="Cancelled" count={tabItems.CANCELLED.length} active={activeTab === "CANCELLED"} onPress={() => changeTab("CANCELLED")} />
      </View>

      <View style={styles.resultRow}>
        <AppText style={styles.resultTitle}>{activeTab === "UPCOMING" ? "Upcoming visits" : activeTab === "COMPLETED" ? "Completed visits" : "Cancelled visits"}</AppText>
        <AppText style={styles.resultCount}>{filteredItems.length} {filteredItems.length === 1 ? "visit" : "visits"}</AppText>
      </View>

      {dateFilter !== "ALL" && <Pressable onPress={() => setDateFilter("ALL")} style={styles.filterChip}><Ionicons name="calendar-outline" size={13} color={colors.plum} /><AppText style={styles.filterChipText}>{dateFilter === "TODAY" ? "Today" : dateFilter === "NEXT_7" ? "Next 7 days" : "This month"}</AppText><Ionicons name="close" size={14} color={colors.plum} /></Pressable>}

      {loading ? <View style={styles.state}><Ionicons name="time-outline" size={24} color={colors.champagne} /><AppText style={styles.hint}>Loading appointments...</AppText></View> : filteredItems.length === 0 ? (
        <EmptyState tab={activeTab} searching={search.length > 0} clearSearch={() => setSearch("")} />
      ) : filteredItems.map(b => <AppointmentCard key={b.id} booking={b} />)}
    </ScrollView>
    <Modal visible={filterOpen} transparent animationType="slide" onRequestClose={() => setFilterOpen(false)}>
      <Pressable style={styles.modalBackdrop} onPress={() => setFilterOpen(false)}>
        <Pressable style={styles.filterSheet} onPress={e => e.stopPropagation()}>
          <View style={styles.sheetHandle} />
          <View style={styles.sheetHeader}><View><AppText style={styles.sheetKicker}>FILTER</AppText><AppText style={styles.sheetTitle}>Appointment dates</AppText></View><Pressable onPress={() => setFilterOpen(false)} style={styles.closeSheet}><Ionicons name="close" size={20} color={colors.plum} /></Pressable></View>
          {([
            ["ALL", "All dates", "Show every appointment"],
            ["TODAY", "Today", "Appointments scheduled today"],
            ["NEXT_7", "Next 7 days", "Your appointments in the next week"],
            ["THIS_MONTH", "This month", "Appointments in the current month"],
          ] as const).map(([key, label, description]) => <Pressable key={key} onPress={() => { setDateFilter(key); setFilterOpen(false); }} style={[styles.filterOption, dateFilter === key && styles.filterOptionActive]}>
            <View style={[styles.optionIcon, dateFilter === key && styles.optionIconActive]}><Ionicons name={key === "ALL" ? "apps-outline" : "calendar-outline"} size={18} color={dateFilter === key ? colors.white : colors.plum} /></View>
            <View style={{ flex: 1 }}><AppText style={[styles.optionLabel, dateFilter === key && styles.optionLabelActive]}>{label}</AppText><AppText style={styles.optionDescription}>{description}</AppText></View>
            {dateFilter === key && <Ionicons name="checkmark-circle" size={20} color={colors.champagne} />}
          </Pressable>)}
        </Pressable>
      </Pressable>
    </Modal>
  </Screen>;
}

function Tab({ label, count, active, onPress }: { label: string; count: number; active: boolean; onPress: () => void }) {
  return <Pressable onPress={onPress} style={[styles.tab, active && styles.activeTab]}>
    <AppText style={[styles.tabText, active && styles.activeText]}>{label}</AppText>
    <View style={[styles.count, active && styles.activeCount]}><AppText style={[styles.countText, active && styles.activeCountText]}>{count}</AppText></View>
  </Pressable>;
}

function AppointmentCard({ booking: b }: { booking: Booking }) {
  return <View style={styles.card}>
    <View style={styles.cardTop}>
      <View style={{ flex: 1 }}>
        <AppText style={styles.date}>{dateText(b.booking_date)}</AppText>
        <AppText style={styles.time}>{time(b.start_time)} - {time(b.end_time)}</AppText>
      </View>
      <Status value={b.status} />
    </View>

    <View style={styles.serviceRow}>
      <View style={styles.serviceIcon}><Ionicons name="cut-outline" size={18} color={colors.plum} /></View>
      <View style={{ flex: 1 }}>
        <AppText style={styles.itemTitle} numberOfLines={2}>{b.items.map(i => i.name).join(" + ")}</AppText>
        <AppText style={styles.location}><Ionicons name="location-outline" size={12} color={colors.muted} /> Glamour Salon</AppText>
      </View>
    </View>

    <View style={styles.metaRow}>
      <View><AppText style={styles.metaLabel}>Booking</AppText><AppText style={styles.metaValue}>#{b.booking_number}</AppText></View>
      <View style={{ alignItems: "flex-end" }}><AppText style={styles.metaLabel}>Total</AppText><AppText style={styles.total}>{money(b.total)}</AppText></View>
    </View>

    <AppButton
      title="View appointment"
      variant="ghost"
      onPress={() => router.push({ pathname: "/booking/[id]", params: { id: String(b.id) } })}
      style={styles.detailsButton}
    />
  </View>;
}

function EmptyState({ tab, searching, clearSearch }: { tab: TabKey; searching: boolean; clearSearch: () => void }) {
  const title = searching ? "No matching appointments" : tab === "UPCOMING" ? "No upcoming appointments" : tab === "COMPLETED" ? "No completed appointments" : "No cancelled appointments";
  const message = searching ? "Try another service name or booking number." : tab === "UPCOMING" ? "Book your next salon visit and it will appear here." : tab === "COMPLETED" ? "Your completed salon visits will appear here." : "Appointments you cancel will appear here.";
  return <View style={styles.empty}>
    <View style={styles.emptyIcon}><Ionicons name={searching ? "search-outline" : "calendar-outline"} size={25} color={colors.plum} /></View>
    <AppText style={styles.emptyTitle}>{title}</AppText>
    <AppText style={styles.hint}>{message}</AppText>
    {searching ? <AppButton title="Clear search" variant="secondary" onPress={clearSearch} style={styles.emptyButton} /> : tab === "UPCOMING" ? <AppButton title="Browse services" onPress={() => router.push("/(tabs)/services")} style={styles.emptyButton} /> : null}
  </View>;
}

function Status({ value }: { value: string }) {
  const status = value.toUpperCase();
  const completed = status === "COMPLETED";
  const cancelled = isCancelled(status);
  const active = !completed && !cancelled;
  return <View style={[styles.status, { backgroundColor: completed ? "#EEE5F3" : cancelled ? "#F8E9E7" : "#E8F4EE" }]}>
    <View style={[styles.statusDot, { backgroundColor: completed ? colors.plumSoft : cancelled ? colors.danger : colors.success }]} />
    <AppText style={[styles.statusText, { color: completed ? colors.plum : cancelled ? colors.danger : colors.success }]}>{status.replace("_", " ")}</AppText>
  </View>;
}

const styles = StyleSheet.create({
  content: { paddingVertical: 24, paddingBottom: 50 },
  headerRow: { flexDirection: "row", alignItems: "flex-start", marginBottom: 18 },
  kicker: { color: colors.champagne, fontSize: 10, fontWeight: "900", letterSpacing: 1.3 },
  title: { color: colors.ink, fontSize: 29, fontWeight: "900", marginTop: 4 },
  subtitle: { color: colors.muted, fontSize: 14, lineHeight: 21, marginTop: 5, paddingRight: 14 },
  headerIcon: { width: 46, height: 46, borderRadius: 16, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border, alignItems: "center", justifyContent: "center", ...shadows.card },
  searchBox: { height: 52, backgroundColor: colors.white, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, flexDirection: "row", alignItems: "center", paddingHorizontal: 15, marginBottom: 14 },
  searchInput: { flex: 1, color: colors.ink, fontSize: 13, paddingHorizontal: 10, height: "100%" },
  clearButton: { paddingLeft: 6 },
  tabs: { backgroundColor: colors.ivoryDeep, borderRadius: 16, padding: 4, flexDirection: "row", marginBottom: 18 },
  tab: { flex: 1, minHeight: 42, borderRadius: 12, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 6 },
  activeTab: { backgroundColor: colors.white, ...shadows.card },
  tabText: { color: colors.muted, fontSize: 11, fontWeight: "800" },
  activeText: { color: colors.plum },
  count: { minWidth: 20, height: 20, borderRadius: 10, backgroundColor: "#EAE3DB", alignItems: "center", justifyContent: "center", paddingHorizontal: 5 },
  activeCount: { backgroundColor: colors.champagneLight },
  countText: { color: colors.muted, fontSize: 9, fontWeight: "900" },
  activeCountText: { color: colors.plum },
  resultRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 10 },
  resultTitle: { color: colors.ink, fontSize: 16, fontWeight: "900" },
  resultCount: { color: colors.muted, fontSize: 11, fontWeight: "700" },
  state: { backgroundColor: colors.white, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, minHeight: 130, alignItems: "center", justifyContent: "center", gap: 8 },
  hint: { color: colors.muted, fontSize: 13, lineHeight: 19, textAlign: "center" },
  card: { backgroundColor: colors.white, borderRadius: radius.lg, padding: 17, marginBottom: 12, borderWidth: 1, borderColor: colors.border, ...shadows.card },
  cardTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  date: { color: colors.ink, fontSize: 16, fontWeight: "900" },
  time: { color: colors.muted, fontSize: 12, marginTop: 4 },
  status: { borderRadius: 10, paddingHorizontal: 9, paddingVertical: 6, flexDirection: "row", alignItems: "center", gap: 5 },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusText: { fontSize: 9, fontWeight: "900" },
  serviceRow: { flexDirection: "row", alignItems: "center", marginTop: 15, paddingTop: 13, borderTopWidth: 1, borderTopColor: colors.border },
  serviceIcon: { width: 40, height: 40, borderRadius: 14, backgroundColor: colors.ivoryDeep, alignItems: "center", justifyContent: "center", marginRight: 10 },
  itemTitle: { color: colors.ink, fontSize: 14, fontWeight: "900", lineHeight: 19 },
  location: { color: colors.muted, fontSize: 11, marginTop: 4 },
  metaRow: { flexDirection: "row", justifyContent: "space-between", paddingTop: 12, marginTop: 12, marginBottom: 14, borderTopWidth: 1, borderTopColor: colors.border },
  metaLabel: { color: colors.muted, fontSize: 9, textTransform: "uppercase", letterSpacing: .7, fontWeight: "800", marginBottom: 2 },
  metaValue: { color: colors.ink, fontSize: 11, fontWeight: "800" },
  total: { color: colors.plum, fontWeight: "900", fontSize: 15 },
  detailsButton: { width: "100%", minHeight: 48, marginTop: 0 },
  empty: { backgroundColor: colors.white, borderRadius: radius.lg, padding: 24, borderWidth: 1, borderColor: colors.border, alignItems: "center", ...shadows.card },
  emptyIcon: { width: 54, height: 54, borderRadius: 19, backgroundColor: colors.ivoryDeep, alignItems: "center", justifyContent: "center", marginBottom: 11 },
  emptyTitle: { color: colors.ink, fontWeight: "900", fontSize: 17, marginBottom: 4 },
  emptyButton: { width: "100%", marginTop: 15 },
  headerIconActive: { backgroundColor: colors.champagneLight, borderColor: colors.champagne },
  filterBadge: { position: "absolute", right: 4, top: 4, width: 14, height: 14, borderRadius: 7, backgroundColor: colors.plum, alignItems: "center", justifyContent: "center" },
  filterChip: { alignSelf: "flex-start", flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: colors.champagneLight, borderRadius: 12, paddingHorizontal: 10, paddingVertical: 7, marginBottom: 10 },
  filterChipText: { color: colors.plum, fontSize: 10, fontWeight: "900" },
  modalBackdrop: { flex: 1, backgroundColor: "rgba(33,18,41,.35)", justifyContent: "flex-end" },
  filterSheet: { backgroundColor: colors.ivory, borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 20, paddingBottom: 30 },
  sheetHandle: { width: 42, height: 4, borderRadius: 2, backgroundColor: colors.border, alignSelf: "center", marginBottom: 18 },
  sheetHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 14 },
  sheetKicker: { color: colors.champagne, fontSize: 9, fontWeight: "900", letterSpacing: 1.2 },
  sheetTitle: { color: colors.ink, fontSize: 22, fontWeight: "900", marginTop: 3 },
  closeSheet: { width: 38, height: 38, borderRadius: 13, backgroundColor: colors.white, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: colors.border },
  filterOption: { backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border, borderRadius: 17, minHeight: 68, padding: 11, flexDirection: "row", alignItems: "center", marginBottom: 9 },
  filterOptionActive: { borderColor: colors.champagne, backgroundColor: "#FFF9ED" },
  optionIcon: { width: 42, height: 42, borderRadius: 14, backgroundColor: colors.ivoryDeep, alignItems: "center", justifyContent: "center", marginRight: 11 },
  optionIconActive: { backgroundColor: colors.plum },
  optionLabel: { color: colors.ink, fontSize: 13, fontWeight: "900" },
  optionLabelActive: { color: colors.plum },
  optionDescription: { color: colors.muted, fontSize: 10, marginTop: 3 },
});
