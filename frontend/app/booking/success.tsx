import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { Screen } from "@/components/Screen";
import { AppButton } from "@/components/AppButton";
import { colors, radius, shadows } from "@/constants/theme";
import { AppText } from "@/components/Typography";

function dateText(value?: string) {
  if (!value) return "";
  return new Date(`${value}T12:00:00`).toLocaleDateString("en-PK", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function time(value?: string) {
  return value?.slice(0, 5) || "";
}

export default function BookingSuccessScreen() {
  const params = useLocalSearchParams<{
    id?: string;
    bookingNumber?: string;
    date?: string;
    startTime?: string;
    endTime?: string;
    name?: string;
    total?: string;
    paymentStatus?: string;
  }>();

  return (
    <Screen>
      <View style={styles.container}>
        <View style={styles.celebration}>
          <View style={styles.outerRing}>
            <View style={styles.checkCircle}>
              <Ionicons name="checkmark" size={42} color={colors.white} />
            </View>
          </View>
          <View style={[styles.confetti, styles.c1]} /><View style={[styles.confetti, styles.c2]} /><View style={[styles.confetti, styles.c3]} /><View style={[styles.confetti, styles.c4]} />
        </View>

        <AppText style={styles.kicker}>ALL SET</AppText>
        <AppText style={styles.title}>Booking confirmed!</AppText>
        <AppText style={styles.subtitle}>Your salon visit is booked. We look forward to seeing you.</AppText>

        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View>
              <AppText style={styles.cardLabel}>BOOKING NUMBER</AppText>
              <AppText style={styles.bookingNumber}>{params.bookingNumber || "Confirmed"}</AppText>
            </View>
            <View style={styles.status}><AppText style={styles.statusText}>CONFIRMED</AppText></View>
          </View>

          <View style={styles.divider} />
          <Info icon="sparkles-outline" label="Service" value={params.name || "Salon service"} />
          <Info icon="calendar-outline" label="Date" value={dateText(params.date)} />
          <Info icon="time-outline" label="Time" value={`${time(params.startTime)} – ${time(params.endTime)}`} />
          <Info icon="wallet-outline" label="Payment" value={`${params.paymentStatus === "PAID" ? "Paid from wallet" : "Wallet payment"} · ${params.total ? `PKR ${Number(params.total).toLocaleString("en-PK")}` : ""}`} />
        </View>

        <View style={styles.note}>
          <Ionicons name="calendar-outline" size={18} color={colors.plum} />
          <AppText style={styles.noteText}>You can view, manage or cancel this appointment from My Appointments.</AppText>
        </View>

        <View style={styles.actions}>
          <AppButton title="View my appointments" onPress={() => router.replace("/(tabs)/appointments")} />
          <AppButton title="Back to home" variant="secondary" onPress={() => router.replace("/(tabs)/home")} />
        </View>
      </View>
    </Screen>
  );
}

function Info({ icon, label, value }: { icon: keyof typeof Ionicons.glyphMap; label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <View style={styles.infoIcon}><Ionicons name={icon} size={17} color={colors.plum} /></View>
      <View style={{ flex: 1 }}><AppText style={styles.infoLabel}>{label}</AppText><AppText style={styles.infoValue}>{value}</AppText></View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: "center", justifyContent: "center", paddingVertical: 22 },
  celebration: { width: 150, height: 130, alignItems: "center", justifyContent: "center", position: "relative" },
  outerRing: { width: 104, height: 104, borderRadius: 52, borderWidth: 1, borderColor: colors.champagne, alignItems: "center", justifyContent: "center" },
  checkCircle: { width: 76, height: 76, borderRadius: 38, backgroundColor: colors.plum, alignItems: "center", justifyContent: "center", ...shadows.card },
  confetti: { width: 7, height: 14, borderRadius: 4, backgroundColor: colors.champagne, position: "absolute" },
  c1: { left: 17, top: 22, transform: [{ rotate: "-28deg" }] },
  c2: { right: 18, top: 31, transform: [{ rotate: "28deg" }] },
  c3: { left: 36, bottom: 7, transform: [{ rotate: "22deg" }] },
  c4: { right: 34, bottom: 2, transform: [{ rotate: "-25deg" }] },
  kicker: { color: colors.champagne, fontSize: 9, fontWeight: "900", letterSpacing: 1.6 },
  title: { color: colors.ink, fontSize: 27, fontWeight: "900", marginTop: 5, textAlign: "center" },
  subtitle: { color: colors.muted, fontSize: 12, lineHeight: 18, textAlign: "center", maxWidth: 290, marginTop: 6, marginBottom: 18 },
  card: { width: "100%", backgroundColor: colors.white, borderRadius: radius.xl, padding: 18, borderWidth: 1, borderColor: colors.border, ...shadows.card },
  cardHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  cardLabel: { color: colors.muted, fontSize: 8, fontWeight: "900", letterSpacing: 1.1 },
  bookingNumber: { color: colors.ink, fontSize: 14, fontWeight: "900", marginTop: 3 },
  status: { backgroundColor: colors.champagneLight, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 5 },
  statusText: { color: colors.plum, fontSize: 8, fontWeight: "900", letterSpacing: .7 },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: 15 },
  infoRow: { flexDirection: "row", alignItems: "center", marginBottom: 13 },
  infoIcon: { width: 34, height: 34, borderRadius: 11, backgroundColor: colors.ivoryDeep, alignItems: "center", justifyContent: "center", marginRight: 10 },
  infoLabel: { color: colors.muted, fontSize: 9 },
  infoValue: { color: colors.ink, fontSize: 12, fontWeight: "800", marginTop: 2 },
  note: { width: "100%", flexDirection: "row", alignItems: "center", backgroundColor: colors.champagneLight, borderRadius: radius.md, padding: 12, marginTop: 11 },
  noteText: { flex: 1, color: colors.plumSoft, fontSize: 10, lineHeight: 15, marginLeft: 8 },
  actions: { width: "100%", gap: 9, marginTop: 18 },
});
