import React, { useCallback, useEffect, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Screen } from "@/components/Screen";
import { AppButton } from "@/components/AppButton";
import { Booking, cancelBooking, getBooking } from "@/services/bookings";
import { getApiErrorMessage } from "@/lib/api";
import { colors, radius, shadows } from "@/constants/theme";

const money = (v: unknown) => `PKR ${Number(v ?? 0).toLocaleString("en-PK", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
function dateText(value: string) { return new Date(`${value}T12:00:00`).toLocaleDateString("en-PK", { weekday: "long", day: "numeric", month: "long", year: "numeric" }); }
function time(value: string) { return value.slice(0, 5); }
function cancelled(status: string) { return ["CANCELLED", "CANCELED"].includes(status.toUpperCase()); }

export default function BookingDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [booking, setBooking] = useState<Booking | null>(null);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);

  const load = useCallback(async () => {
    try { setBooking(await getBooking(Number(id))); }
    catch (e) { Alert.alert("Booking", getApiErrorMessage(e)); }
    finally { setLoading(false); }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  async function cancel() {
    if (!booking) return;
    try {
      setCancelling(true);
      const updated = await cancelBooking(booking.id);
      setBooking(updated);
      Alert.alert("Cancelled", "The booking was cancelled and the wallet refund was processed when applicable.");
    } catch (e) { Alert.alert("Cancellation failed", getApiErrorMessage(e)); }
    finally { setCancelling(false); }
  }

  const canCancel = booking && ["PENDING", "CONFIRMED"].includes(booking.status.toUpperCase());

  if (loading) return <Screen><View style={styles.center}><Text style={styles.hint}>Loading booking...</Text></View></Screen>;
  if (!booking) return <Screen><View style={styles.center}><Text style={styles.hint}>Booking not found.</Text></View></Screen>;

  const isCancelled = cancelled(booking.status);
  const isCompleted = booking.status.toUpperCase() === "COMPLETED";

  return <Screen><ScrollView contentContainerStyle={styles.content}>
    <View style={styles.pageHeader}>
      <View style={styles.backCircle}><Pressable onPress={() => router.back()} hitSlop={8}><Ionicons name="arrow-back" size={20} color={colors.plum} /></Pressable></View>
      <View style={{ flex: 1 }}><Text style={styles.kicker}>YOUR VISIT</Text><Text style={styles.title}>Appointment details</Text></View>
    </View>

    <View style={styles.hero}>
      <View style={styles.heroTop}><Text style={styles.number}>{booking.booking_number}</Text><Status value={booking.status} /></View>
      <Text style={styles.date}>{dateText(booking.booking_date)}</Text>
      <View style={styles.timeRow}><Ionicons name="time-outline" size={16} color={colors.champagneLight} /><Text style={styles.time}>{time(booking.start_time)} - {time(booking.end_time)}</Text></View>
      <View style={styles.heroFooter}><View><Text style={styles.heroLabel}>SALON</Text><Text style={styles.heroValue}>Glamour Salon</Text></View><View style={{ alignItems: "flex-end" }}><Text style={styles.heroLabel}>TOTAL</Text><Text style={styles.heroTotal}>{money(booking.total)}</Text></View></View>
    </View>

    <Text style={styles.section}>Services</Text>
    <View style={styles.card}>{booking.items.map(i => <View key={i.id} style={styles.item}>
      <View style={styles.itemIcon}><Ionicons name="cut-outline" size={17} color={colors.plum} /></View>
      <View style={{ flex: 1 }}><Text style={styles.itemName}>{i.name}</Text><Text style={styles.itemMeta}>{i.item_type} · Qty {i.quantity}</Text></View>
      <Text style={styles.itemPrice}>{money(i.total_price)}</Text>
    </View>)}</View>

    <Text style={styles.section}>Payment summary</Text>
    <View style={styles.card}>
      <Line label="Subtotal" value={money(booking.subtotal)} />
      <Line label="Discount" value={`- ${money(booking.discount)}`} />
      <View style={styles.divider} />
      <Line label="Total" value={money(booking.total)} bold />
      <View style={styles.paymentPill}><Ionicons name="wallet-outline" size={15} color={colors.plum} /><Text style={styles.paymentText}>{booking.payment_method} · {booking.payment_status}</Text></View>
    </View>

    {isCompleted && <View style={styles.infoBox}><Ionicons name="checkmark-circle" size={20} color={colors.success} /><View style={{ flex: 1 }}><Text style={styles.infoTitle}>Visit completed</Text><Text style={styles.hintLeft}>Thank you for visiting Glamour Salon.</Text></View></View>}
    {isCancelled && <View style={styles.cancelledBox}><Ionicons name="close-circle" size={20} color={colors.danger} /><View style={{ flex: 1 }}><Text style={styles.cancelledTitle}>Appointment cancelled</Text><Text style={styles.hintLeft}>This appointment is no longer active.</Text></View></View>}

    {canCancel ? <View style={styles.dangerBox}><View style={styles.dangerHeader}><Ionicons name="alert-circle-outline" size={19} color={colors.danger} /><Text style={styles.dangerTitle}>Need to cancel?</Text></View><Text style={styles.hintLeft}>Cancelling releases the slot. If the booking was paid, the backend processes the wallet refund.</Text><AppButton title={cancelling ? "Cancelling..." : "Cancel appointment"} variant="secondary" disabled={cancelling} onPress={() => Alert.alert("Cancel appointment", "Are you sure?", [{ text: "Keep", style: "cancel" }, { text: "Cancel appointment", style: "destructive", onPress: cancel }])} style={styles.fullButton} /></View> : null}

    <AppButton title="Back to appointments" variant="primary" onPress={() => router.replace("/(tabs)/appointments")} style={styles.fullButton} />
  </ScrollView></Screen>;
}

function Status({ value }: { value: string }) {
  const status = value.toUpperCase();
  const complete = status === "COMPLETED";
  const cancel = cancelled(status);
  return <View style={[styles.status, { backgroundColor: complete ? "#EEE5F3" : cancel ? "#F8E9E7" : "#E8F4EE" }]}><View style={[styles.statusDot, { backgroundColor: complete ? colors.plumSoft : cancel ? colors.danger : colors.success }]} /><Text style={[styles.statusText, { color: complete ? colors.plum : cancel ? colors.danger : colors.success }]}>{status.replace("_", " ")}</Text></View>;
}

function Line({ label, value, bold = false }: { label: string; value: string; bold?: boolean }) { return <View style={styles.line}><Text style={[styles.lineLabel, bold && styles.bold]}>{label}</Text><Text style={[styles.lineValue, bold && styles.bold]}>{value}</Text></View>; }

const styles = StyleSheet.create({
  content: { paddingVertical: 20, paddingBottom: 50 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  pageHeader: { flexDirection: "row", alignItems: "center", marginBottom: 16, gap: 12 },
  backCircle: { width: 42, height: 42, borderRadius: 15, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border, alignItems: "center", justifyContent: "center", ...shadows.card },
  kicker: { color: colors.champagne, fontSize: 9, fontWeight: "900", letterSpacing: 1.3 },
  title: { color: colors.ink, fontSize: 25, fontWeight: "900", marginTop: 2 },
  hero: { backgroundColor: colors.plum, borderRadius: radius.xl, padding: 20, ...shadows.card },
  heroTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  number: { color: colors.champagneLight, fontSize: 11, fontWeight: "900", letterSpacing: .8 },
  status: { borderRadius: 10, paddingHorizontal: 9, paddingVertical: 6, flexDirection: "row", alignItems: "center", gap: 5 },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusText: { fontSize: 9, fontWeight: "900" },
  date: { color: colors.white, fontSize: 19, fontWeight: "900", marginTop: 19 },
  timeRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 6 },
  time: { color: colors.champagneLight, fontSize: 13, fontWeight: "700" },
  heroFooter: { flexDirection: "row", justifyContent: "space-between", borderTopWidth: 1, borderTopColor: "rgba(255,255,255,.15)", marginTop: 18, paddingTop: 15 },
  heroLabel: { color: "#CDBFD2", fontSize: 8, fontWeight: "900", letterSpacing: .8 },
  heroValue: { color: colors.white, fontSize: 12, fontWeight: "800", marginTop: 3 },
  heroTotal: { color: colors.champagneLight, fontSize: 15, fontWeight: "900", marginTop: 2 },
  section: { color: colors.plum, fontSize: 17, fontWeight: "900", marginTop: 22, marginBottom: 10 },
  card: { backgroundColor: colors.white, borderRadius: radius.lg, padding: 17, borderWidth: 1, borderColor: colors.border, marginBottom: 2 },
  item: { flexDirection: "row", alignItems: "center", paddingVertical: 7 },
  itemIcon: { width: 36, height: 36, borderRadius: 12, backgroundColor: colors.ivoryDeep, alignItems: "center", justifyContent: "center", marginRight: 10 },
  itemName: { color: colors.ink, fontWeight: "900", fontSize: 13 },
  itemMeta: { color: colors.muted, fontSize: 10, marginTop: 3 },
  itemPrice: { color: colors.plum, fontWeight: "900", fontSize: 12 },
  line: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 7 },
  lineLabel: { color: colors.muted, fontSize: 12 },
  lineValue: { color: colors.ink, fontSize: 12 },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: 5 },
  bold: { fontWeight: "900", color: colors.plum },
  paymentPill: { backgroundColor: colors.ivoryDeep, borderRadius: 12, minHeight: 40, flexDirection: "row", alignItems: "center", paddingHorizontal: 12, gap: 7, marginTop: 8 },
  paymentText: { color: colors.plum, fontSize: 11, fontWeight: "800" },
  infoBox: { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: "#EAF5EF", borderRadius: 16, padding: 15, marginTop: 14 },
  infoTitle: { color: colors.success, fontWeight: "900", fontSize: 13, marginBottom: 2 },
  cancelledBox: { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: "#FBEDEC", borderRadius: 16, padding: 15, marginTop: 14 },
  cancelledTitle: { color: colors.danger, fontWeight: "900", fontSize: 13, marginBottom: 2 },
  hint: { color: colors.muted, fontSize: 13, lineHeight: 19 },
  hintLeft: { color: colors.muted, fontSize: 12, lineHeight: 18 },
  dangerBox: { backgroundColor: "#FFF7F5", borderRadius: 18, padding: 16, marginTop: 14, borderWidth: 1, borderColor: "#F0D8D3" },
  dangerHeader: { flexDirection: "row", alignItems: "center", gap: 7, marginBottom: 5 },
  dangerTitle: { color: colors.danger, fontSize: 14, fontWeight: "900" },
  fullButton: { width: "100%", minHeight: 50, marginTop: 14 },
});
