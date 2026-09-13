import React, { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { Screen } from "@/components/Screen";
import { AppButton } from "@/components/AppButton";
import { createBooking, getAvailableSlots, Slot } from "@/services/catalog";
import { getApiErrorMessage } from "@/lib/api";
import { colors, radius, shadows } from "@/constants/theme";
import { AppText } from "@/components/Typography";

function isoDate(offset = 0) {
  const d = new Date();
  d.setHours(12, 0, 0, 0);
  d.setDate(d.getDate() + offset);
  return d.toISOString().slice(0, 10);
}

function prettyDate(value: string) {
  return new Date(`${value}T12:00:00`).toLocaleDateString("en-PK", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

function fullDate(value: string) {
  return new Date(`${value}T12:00:00`).toLocaleDateString("en-PK", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function time(value: string) {
  return value.slice(0, 5);
}

function money(value: unknown) {
  return `PKR ${Number(value ?? 0).toLocaleString("en-PK", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;
}

export default function BookingScreen() {
  const params = useLocalSearchParams<{
    salonId?: string;
    serviceId?: string;
    serviceIds?: string;
    bundleId?: string;
    name?: string;
    price?: string;
  }>();

  const salonId = Number(params.salonId);
  const serviceId = params.serviceId ? Number(params.serviceId) : undefined;
  const serviceIds = params.serviceIds ? params.serviceIds.split(",").map(Number).filter(Boolean) : serviceId ? [serviceId] : [];
  const bundleId = params.bundleId ? Number(params.bundleId) : undefined;
  const selectedName = params.name || "Selected service";
  const selectedPrice = Number(params.price || 0);

  const [step, setStep] = useState(1);
  const [date, setDate] = useState(isoDate());
  const [slots, setSlots] = useState<Slot[]>([]);
  const [slotId, setSlotId] = useState<number>();
  const [loading, setLoading] = useState(true);
  const [booking, setBooking] = useState(false);

  const dates = useMemo(() => Array.from({ length: 7 }, (_, i) => isoDate(i)), []);
  const selectedSlot = slots.find((slot) => slot.id === slotId);

  const loadSlots = useCallback(async () => {
    if (!salonId) return;
    try {
      setLoading(true);
      setSlotId(undefined);
      setSlots(await getAvailableSlots(salonId, date));
    } catch (e) {
      Alert.alert("Available slots", getApiErrorMessage(e));
      setSlots([]);
    } finally {
      setLoading(false);
    }
  }, [salonId, date]);

  useEffect(() => {
    loadSlots();
  }, [loadSlots]);

  async function confirmBooking() {
    if (!slotId) {
      Alert.alert("Select a time", "Choose an available time before continuing.");
      return;
    }

    try {
      setBooking(true);
      const result = await createBooking({
        salon_id: salonId,
        slot_id: slotId,
        service_ids: serviceIds,
        bundle_id: bundleId ?? null,
      });

      router.replace({
        pathname: "/booking/success",
        params: {
          id: String(result.id),
          bookingNumber: result.booking_number,
          date: result.booking_date,
          startTime: result.start_time,
          endTime: result.end_time,
          name: selectedName,
          total: String(result.total),
          paymentStatus: result.payment_status,
        },
      });
    } catch (e) {
      Alert.alert("Booking failed", getApiErrorMessage(e));
    } finally {
      setBooking(false);
    }
  }

  function goNext() {
    if (step === 1) {
      setStep(2);
      return;
    }
    if (step === 2) {
      if (!slotId) {
        Alert.alert("Select a time", "Choose an available time first.");
        return;
      }
      setStep(3);
    }
  }

  return (
    <Screen>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        <View style={styles.header}>
          <Pressable onPress={() => (step > 1 ? setStep(step - 1) : router.back())} style={styles.backButton}>
            <Ionicons name="chevron-back" size={21} color={colors.plum} />
          </Pressable>
          <View style={styles.headerCopy}>
            <AppText style={styles.kicker}>RESERVE YOUR VISIT</AppText>
            <AppText style={styles.title}>Book appointment</AppText>
          </View>
          <View style={styles.stepBadge}>
            <AppText style={styles.stepBadgeText}>{step}/3</AppText>
          </View>
        </View>

        <View style={styles.progressRow}>
          {[1, 2, 3].map((item) => (
            <React.Fragment key={item}>
              <View style={[styles.progressDot, item <= step && styles.progressDotActive]}>
                {item < step ? <Ionicons name="checkmark" size={12} color={colors.plum} /> : <AppText style={[styles.progressNumber, item === step && styles.progressNumberActive]}>{item}</AppText>}
              </View>
              {item < 3 ? <View style={[styles.progressLine, item < step && styles.progressLineActive]} /> : null}
            </React.Fragment>
          ))}
        </View>
        <View style={styles.progressLabels}>
          <AppText style={styles.progressLabel}>Service</AppText>
          <AppText style={styles.progressLabel}>Date & time</AppText>
          <AppText style={styles.progressLabel}>Confirm</AppText>
        </View>

        {step === 1 ? (
          <ServiceStep name={selectedName} price={selectedPrice} bundle={!!bundleId} />
        ) : null}

        {step === 2 ? (
          <DateTimeStep
            dates={dates}
            date={date}
            setDate={(value) => {
              setDate(value);
              setSlotId(undefined);
            }}
            loading={loading}
            slots={slots}
            slotId={slotId}
            setSlotId={setSlotId}
          />
        ) : null}

        {step === 3 ? (
          <ReviewStep
            name={selectedName}
            price={selectedPrice}
            date={date}
            slot={selectedSlot}
            paymentStatus="Wallet payment"
          />
        ) : null}

        <View style={styles.bottomArea}>
          {step === 3 ? (
            <AppButton
              title={booking ? "Confirming booking..." : "Confirm & book"}
              loading={booking}
              disabled={booking || !slotId}
              onPress={confirmBooking}
            />
          ) : (
            <AppButton
              title={step === 1 ? "Continue to date & time" : "Review appointment"}
              disabled={step === 2 && (!slotId || loading)}
              onPress={goNext}
            />
          )}
          <AppText style={styles.secureText}>
            <Ionicons name="lock-closed-outline" size={12} color={colors.muted} /> Secure booking · Wallet charged after confirmation
          </AppText>
        </View>
      </ScrollView>
    </Screen>
  );
}

function ServiceStep({ name, price, bundle }: { name: string; price: number; bundle: boolean }) {
  return (
    <View>
      <AppText style={styles.sectionTitle}>Your selection</AppText>
      <AppText style={styles.sectionSubtitle}>A beautiful visit starts with the right service.</AppText>

      <View style={styles.selectedCard}>
        <View style={styles.serviceArtwork}>
          <Ionicons name={bundle ? "sparkles" : "cut-outline"} size={30} color={colors.champagne} />
        </View>
        <View style={styles.selectedCopy}>
          <View style={styles.badgeRow}>
            <View style={styles.goldBadge}>
              <AppText style={styles.goldBadgeText}>{bundle ? "PACKAGE" : "SERVICE"}</AppText>
            </View>
            <Ionicons name="checkmark-circle" size={20} color={colors.champagne} />
          </View>
          <AppText style={styles.selectedName}>{name}</AppText>
          <AppText style={styles.selectedDescription}>{bundle ? "Curated salon package" : "Professional salon service"}</AppText>
          <AppText style={styles.selectedPrice}>{money(price)}</AppText>
        </View>
      </View>

      <View style={styles.perkRow}>
        <Perk icon="time-outline" title="Flexible timing" text="Choose from available slots" />
        <Perk icon="card-outline" title="Easy payment" text="Pay securely from wallet" />
      </View>
    </View>
  );
}

function Perk({ icon, title, text }: { icon: keyof typeof Ionicons.glyphMap; title: string; text: string }) {
  return (
    <View style={styles.perk}>
      <View style={styles.perkIcon}><Ionicons name={icon} size={18} color={colors.plum} /></View>
      <AppText style={styles.perkTitle}>{title}</AppText>
      <AppText style={styles.perkText}>{text}</AppText>
    </View>
  );
}

function DateTimeStep({
  dates,
  date,
  setDate,
  loading,
  slots,
  slotId,
  setSlotId,
}: {
  dates: string[];
  date: string;
  setDate: (value: string) => void;
  loading: boolean;
  slots: Slot[];
  slotId?: number;
  setSlotId: (value: number) => void;
}) {
  return (
    <View>
      <AppText style={styles.sectionTitle}>When would you like to visit?</AppText>
      <AppText style={styles.sectionSubtitle}>Select a date and one of the available appointment times.</AppText>

      <AppText style={styles.fieldLabel}>Choose date</AppText>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.dateScroller}>
        {dates.map((item) => {
          const active = item === date;
          const d = new Date(`${item}T12:00:00`);
          return (
            <Pressable key={item} onPress={() => setDate(item)} style={[styles.dateCard, active && styles.dateCardActive]}>
              <AppText style={[styles.dateWeekday, active && styles.dateActiveText]}>{d.toLocaleDateString("en-PK", { weekday: "short" })}</AppText>
              <AppText style={[styles.dateDay, active && styles.dateActiveText]}>{d.getDate()}</AppText>
              <AppText style={[styles.dateMonth, active && styles.dateActiveText]}>{d.toLocaleDateString("en-PK", { month: "short" })}</AppText>
            </Pressable>
          );
        })}
      </ScrollView>

      <View style={styles.selectedDateHeader}>
        <View>
          <AppText style={styles.fieldLabel}>Available times</AppText>
          <AppText style={styles.dateCaption}>{fullDate(date)}</AppText>
        </View>
        {loading ? <ActivityIndicator color={colors.champagne} /> : null}
      </View>

      {loading ? (
        <View style={styles.loadingCard}>
          <ActivityIndicator color={colors.plum} />
          <AppText style={styles.hint}>Finding the best available times...</AppText>
        </View>
      ) : slots.length === 0 ? (
        <View style={styles.emptyCard}>
          <View style={styles.emptyIcon}><Ionicons name="calendar-clear-outline" size={24} color={colors.plum} /></View>
          <AppText style={styles.emptyTitle}>No times available</AppText>
          <AppText style={styles.hint}>Please select another date to continue.</AppText>
        </View>
      ) : (
        <View style={styles.slotGrid}>
          {slots.map((slot) => {
            const active = slot.id === slotId;
            return (
              <Pressable key={slot.id} onPress={() => setSlotId(slot.id)} style={[styles.slotCard, active && styles.slotCardActive]}>
                <Ionicons name="time-outline" size={17} color={active ? colors.champagne : colors.plum} />
                <AppText style={[styles.slotText, active && styles.slotTextActive]}>{time(slot.start_time)}</AppText>
                <AppText style={[styles.slotEnd, active && styles.slotTextActive]}>– {time(slot.end_time)}</AppText>
                {active ? <Ionicons name="checkmark-circle" size={18} color={colors.champagne} style={styles.slotCheck} /> : null}
              </Pressable>
            );
          })}
        </View>
      )}
    </View>
  );
}

function ReviewStep({
  name,
  price,
  date,
  slot,
  paymentStatus,
}: {
  name: string;
  price: number;
  date: string;
  slot?: Slot;
  paymentStatus: string;
}) {
  return (
    <View>
      <AppText style={styles.sectionTitle}>Almost there</AppText>
      <AppText style={styles.sectionSubtitle}>Review your appointment details before confirming.</AppText>

      <View style={styles.reviewCard}>
        <View style={styles.reviewTop}>
          <View style={styles.reviewIcon}><Ionicons name="sparkles-outline" size={23} color={colors.champagne} /></View>
          <View style={{ flex: 1 }}>
            <AppText style={styles.reviewLabel}>YOUR APPOINTMENT</AppText>
            <AppText style={styles.reviewName}>{name}</AppText>
          </View>
          <AppText style={styles.reviewPrice}>{money(price)}</AppText>
        </View>

        <View style={styles.divider} />
        <ReviewLine icon="calendar-outline" label="Date" value={fullDate(date)} />
        <ReviewLine icon="time-outline" label="Time" value={slot ? `${time(slot.start_time)} – ${time(slot.end_time)}` : "Not selected"} />
        <ReviewLine icon="wallet-outline" label="Payment" value={paymentStatus} />
      </View>

      <View style={styles.walletNote}>
        <View style={styles.walletNoteIcon}><Ionicons name="shield-checkmark-outline" size={19} color={colors.plum} /></View>
        <View style={{ flex: 1 }}>
          <AppText style={styles.walletNoteTitle}>Secure wallet payment</AppText>
          <AppText style={styles.walletNoteText}>Your wallet will only be charged when the booking is successfully confirmed.</AppText>
        </View>
      </View>
    </View>
  );
}

function ReviewLine({ icon, label, value }: { icon: keyof typeof Ionicons.glyphMap; label: string; value: string }) {
  return (
    <View style={styles.reviewLine}>
      <View style={styles.reviewLineIcon}><Ionicons name={icon} size={17} color={colors.plum} /></View>
      <View style={{ flex: 1 }}>
        <AppText style={styles.reviewLineLabel}>{label}</AppText>
        <AppText style={styles.reviewLineValue}>{value}</AppText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { paddingTop: 18, paddingBottom: 38 },
  header: { flexDirection: "row", alignItems: "center", marginBottom: 18 },
  backButton: { width: 42, height: 42, borderRadius: 15, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border, alignItems: "center", justifyContent: "center" },
  headerCopy: { flex: 1, marginLeft: 12 },
  kicker: { color: colors.champagne, fontSize: 9, fontWeight: "900", letterSpacing: 1.5 },
  title: { color: colors.ink, fontSize: 25, fontWeight: "900", marginTop: 2 },
  stepBadge: { backgroundColor: colors.plum, paddingHorizontal: 10, paddingVertical: 7, borderRadius: 12 },
  stepBadgeText: { color: colors.champagneLight, fontSize: 11, fontWeight: "900" },
  progressRow: { flexDirection: "row", alignItems: "center", marginHorizontal: 8 },
  progressDot: { width: 28, height: 28, borderRadius: 14, backgroundColor: colors.ivoryDeep, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: colors.border },
  progressDotActive: { backgroundColor: colors.champagneLight, borderColor: colors.champagne },
  progressNumber: { color: colors.muted, fontSize: 10, fontWeight: "900" },
  progressNumberActive: { color: colors.plum },
  progressLine: { flex: 1, height: 2, backgroundColor: colors.border, marginHorizontal: 5 },
  progressLineActive: { backgroundColor: colors.champagne },
  progressLabels: { flexDirection: "row", justifyContent: "space-between", marginHorizontal: 2, marginTop: 7, marginBottom: 25 },
  progressLabel: { color: colors.muted, fontSize: 10, fontWeight: "700" },
  sectionTitle: { color: colors.ink, fontSize: 23, fontWeight: "900" },
  sectionSubtitle: { color: colors.muted, fontSize: 13, lineHeight: 19, marginTop: 5, marginBottom: 18 },
  selectedCard: { backgroundColor: colors.plum, borderRadius: radius.xl, padding: 16, flexDirection: "row", ...shadows.card },
  serviceArtwork: { width: 72, height: 94, borderRadius: 19, backgroundColor: colors.plumSoft, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "#624D6D" },
  selectedCopy: { flex: 1, paddingLeft: 15 },
  badgeRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  goldBadge: { backgroundColor: colors.champagneLight, borderRadius: 7, paddingHorizontal: 7, paddingVertical: 4 },
  goldBadgeText: { color: colors.plum, fontSize: 8, fontWeight: "900", letterSpacing: 1 },
  selectedName: { color: colors.white, fontSize: 18, fontWeight: "900", marginTop: 10 },
  selectedDescription: { color: "#D8CADC", fontSize: 11, marginTop: 3 },
  selectedPrice: { color: colors.champagneLight, fontSize: 16, fontWeight: "900", marginTop: 8 },
  perkRow: { flexDirection: "row", gap: 10, marginTop: 14 },
  perk: { flex: 1, backgroundColor: colors.white, borderRadius: radius.md, padding: 13, borderWidth: 1, borderColor: colors.border, ...shadows.card },
  perkIcon: { width: 34, height: 34, borderRadius: 12, backgroundColor: colors.ivoryDeep, alignItems: "center", justifyContent: "center", marginBottom: 9 },
  perkTitle: { color: colors.ink, fontSize: 12, fontWeight: "900" },
  perkText: { color: colors.muted, fontSize: 10, lineHeight: 15, marginTop: 3 },
  fieldLabel: { color: colors.ink, fontSize: 13, fontWeight: "900", marginBottom: 9 },
  dateScroller: { gap: 8, paddingBottom: 3 },
  dateCard: { width: 67, minHeight: 82, backgroundColor: colors.white, borderRadius: 18, borderWidth: 1, borderColor: colors.border, alignItems: "center", justifyContent: "center", ...shadows.card },
  dateCardActive: { backgroundColor: colors.plum, borderColor: colors.plum },
  dateWeekday: { color: colors.muted, fontSize: 10, fontWeight: "800" },
  dateDay: { color: colors.ink, fontSize: 23, fontWeight: "900", marginTop: 2 },
  dateMonth: { color: colors.muted, fontSize: 10, fontWeight: "700" },
  dateActiveText: { color: colors.white },
  selectedDateHeader: { flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between", marginTop: 24, marginBottom: 12 },
  dateCaption: { color: colors.muted, fontSize: 11, marginTop: -5 },
  loadingCard: { minHeight: 130, backgroundColor: colors.white, borderRadius: radius.lg, alignItems: "center", justifyContent: "center", gap: 9, borderWidth: 1, borderColor: colors.border },
  hint: { color: colors.muted, fontSize: 12, lineHeight: 18, textAlign: "center" },
  slotGrid: { flexDirection: "row", flexWrap: "wrap", gap: 9 },
  slotCard: { width: "47.5%", minHeight: 55, borderRadius: 15, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 11, flexDirection: "row", alignItems: "center", ...shadows.card },
  slotCardActive: { backgroundColor: colors.plum, borderColor: colors.plum },
  slotText: { color: colors.ink, fontSize: 13, fontWeight: "900", marginLeft: 7 },
  slotEnd: { color: colors.muted, fontSize: 11, marginLeft: 3 },
  slotTextActive: { color: colors.white },
  slotCheck: { marginLeft: "auto" },
  emptyCard: { backgroundColor: colors.white, borderRadius: radius.lg, padding: 24, alignItems: "center", borderWidth: 1, borderColor: colors.border },
  emptyIcon: { width: 52, height: 52, borderRadius: 18, backgroundColor: colors.ivoryDeep, alignItems: "center", justifyContent: "center", marginBottom: 10 },
  emptyTitle: { color: colors.ink, fontSize: 16, fontWeight: "900", marginBottom: 4 },
  reviewCard: { backgroundColor: colors.white, borderRadius: radius.xl, padding: 18, borderWidth: 1, borderColor: colors.border, ...shadows.card },
  reviewTop: { flexDirection: "row", alignItems: "center" },
  reviewIcon: { width: 46, height: 46, borderRadius: 16, backgroundColor: colors.plum, alignItems: "center", justifyContent: "center", marginRight: 11 },
  reviewLabel: { color: colors.champagne, fontSize: 8, fontWeight: "900", letterSpacing: 1.1 },
  reviewName: { color: colors.ink, fontSize: 15, fontWeight: "900", marginTop: 3 },
  reviewPrice: { color: colors.plum, fontSize: 14, fontWeight: "900" },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: 16 },
  reviewLine: { flexDirection: "row", alignItems: "center", marginBottom: 15 },
  reviewLineIcon: { width: 34, height: 34, borderRadius: 11, backgroundColor: colors.ivoryDeep, alignItems: "center", justifyContent: "center", marginRight: 10 },
  reviewLineLabel: { color: colors.muted, fontSize: 9, fontWeight: "700" },
  reviewLineValue: { color: colors.ink, fontSize: 12, fontWeight: "800", marginTop: 2 },
  walletNote: { flexDirection: "row", backgroundColor: colors.champagneLight, borderRadius: radius.md, padding: 14, marginTop: 12 },
  walletNoteIcon: { width: 36, height: 36, borderRadius: 12, backgroundColor: colors.white, alignItems: "center", justifyContent: "center", marginRight: 10 },
  walletNoteTitle: { color: colors.plum, fontSize: 12, fontWeight: "900" },
  walletNoteText: { color: colors.plumSoft, fontSize: 10, lineHeight: 15, marginTop: 3 },
  bottomArea: { marginTop: 25 },
  secureText: { color: colors.muted, fontSize: 9, textAlign: "center", marginTop: 10 },
});
