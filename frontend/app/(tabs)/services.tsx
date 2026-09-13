import React, { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Screen } from "@/components/Screen";
import { getSalons, Salon } from "@/services/catalog";
import { getApiErrorMessage } from "@/lib/api";
import { colors, radius, shadows } from "@/constants/theme";
import { AppText, AppTextInput } from "@/components/Typography";

const salonIcon = (index: number): keyof typeof Ionicons.glyphMap => {
  const icons: (keyof typeof Ionicons.glyphMap)[] = ["sparkles-outline", "cut-outline", "flower-outline", "color-palette-outline"];
  return icons[index % icons.length];
};

export default function ServicesScreen() {
  const [salons, setSalons] = useState<Salon[]>([]);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("All Salons");
  const [loading, setLoading] = useState(true);
  const [selectedSalonIds, setSelectedSalonIds] = useState<number[]>([]);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        setSalons(await getSalons());
      } catch (e) {
        Alert.alert("Services", getApiErrorMessage(e));
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const toggleCompare = (salonId: number) => {
    setSelectedSalonIds((current) => current.includes(salonId) ? current.filter((id) => id !== salonId) : current.length < 2 ? [...current, salonId] : current);
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return salons.filter((salon) => {
      const haystack = `${salon.name} ${salon.city ?? ""} ${salon.address_line1 ?? ""} ${salon.description ?? ""}`.toLowerCase();
      const matchesSearch = !q || haystack.includes(q);
      if (filter === "Nearby") return matchesSearch; // Distance can be added when location is available.
      return matchesSearch;
    });
  }, [salons, search, filter]);

  return (
    <Screen>
      <View style={styles.screen}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
          <View style={styles.headerRow}>
            <View style={styles.headerCopy}>
              {/* <AppText style={styles.kicker}>THE SALON MENU</AppText> */}
              <AppText style={styles.title}>Services</AppText>
              {/* <AppText style={styles.subtitle}>Choose a salon to explore its services and exclusive bundles.</AppText> */}
            </View>
            {/* <View style={styles.headerIcon}>
              <Ionicons name="sparkles" size={22} color={colors.champagne} />
            </View> */}
          </View>

          <AppText style={styles.sectionTitle}>Choose a salon</AppText>
          <AppText style={styles.sectionSubtitle}>Select a salon to view services and bundles</AppText>

          <View style={styles.searchBox}>
            <Ionicons name="search-outline" size={20} color={colors.muted} />
            <AppTextInput
              value={search}
              onChangeText={setSearch}
              placeholder="Search salon name, location..."
              placeholderTextColor="#A49BA2"
              style={styles.searchInput}
              returnKeyType="search"
            />
            {search.length > 0 && (
              <Pressable onPress={() => setSearch("")} hitSlop={8}>
                <Ionicons name="close-circle" size={19} color={colors.muted} />
              </Pressable>
            )}
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters}>
            {["All Salons"].map((item) => {
              const active = filter === item;
              return (
                <Pressable key={item} onPress={() => setFilter(item)} style={[styles.filterChip, active && styles.filterChipActive]}>
                  <AppText style={[styles.filterText, active && styles.filterTextActive]}>{item}</AppText>
                </Pressable>
              );
            })}
          </ScrollView>

          {loading ? (
            <View style={styles.loading}>
              <ActivityIndicator color={colors.plum} />
              <AppText style={styles.loadingText}>Finding salons...</AppText>
            </View>
          ) : filtered.length === 0 ? (
            <View style={styles.empty}>
              <View style={styles.emptyIcon}><Ionicons name="search-outline" size={24} color={colors.plum} /></View>
              <AppText style={styles.emptyTitle}>No salons found</AppText>
              <AppText style={styles.emptyText}>Try another salon name or location.</AppText>
            </View>
          ) : (
            <View style={styles.list}>
              {filtered.map((salon, index) => (
                <View key={salon.id} style={[styles.salonCard, selectedSalonIds.includes(salon.id) && styles.salonCardSelected]}>
                  <Pressable onPress={() => router.push(`/salon/${salon.id}`)} style={({ pressed }) => [styles.salonMain, pressed && styles.pressed]}>
                  <View style={styles.salonVisual}>
                    <Ionicons name={salonIcon(index)} size={32} color={colors.plum} />
                    <View style={styles.openBadge}>
                      <View style={styles.openDot} />
                      <AppText style={styles.openText}>Open</AppText>
                    </View>
                  </View>
                  <View style={styles.salonBody}>
                    <View style={styles.nameRow}>
                      <AppText style={styles.salonName} numberOfLines={2}>{salon.name}</AppText>
                      <View style={styles.rating}><Ionicons name="star" size={12} color={colors.champagne} /><AppText style={styles.ratingText}>4.8</AppText></View>
                    </View>
                    <View style={styles.locationRow}>
                      <Ionicons name="location-outline" size={14} color={colors.muted} />
                      <AppText style={styles.location} numberOfLines={1}>{salon.city || salon.address_line1 || "Location available"}</AppText>
                    </View>
                    <AppText style={styles.categories} numberOfLines={1}>Hair  ·  Skin  ·  Nails  ·  Makeup</AppText>
                    <View style={styles.cardFooter}>
                      <View style={styles.tag}><AppText style={styles.tagText}>Popular</AppText></View>
                      {/* <AppText style={styles.viewText}>View services</AppText> */}
                      <Ionicons name="arrow-forward" size={17} color={colors.plum} />
                    </View>
                  </View>
                  </Pressable>
                  <Pressable onPress={() => toggleCompare(salon.id)} style={[styles.compareButton, selectedSalonIds.includes(salon.id) && styles.compareButtonActive]}>
                    <Ionicons name={selectedSalonIds.includes(salon.id) ? "checkmark-circle" : "git-compare-outline"} size={15} color={selectedSalonIds.includes(salon.id) ? colors.white : colors.plum} />
                    <AppText style={[styles.compareButtonText, selectedSalonIds.includes(salon.id) && styles.compareButtonTextActive]}>Compare</AppText>
                  </Pressable>
                </View>
              ))}
            </View>
          )}

          {selectedSalonIds.length > 0 ? (
            <View style={styles.compareBar}>
              <View style={styles.compareBarIcon}><Ionicons name="git-compare-outline" size={20} color={colors.plum} /></View>
              <View style={styles.compareBarCopy}><AppText style={styles.compareBarTitle}>{selectedSalonIds.length} salon{selectedSalonIds.length > 1 ? "s" : ""} selected</AppText><AppText style={styles.compareBarSubtitle}>{selectedSalonIds.length < 2 ? "Select one more salon to compare" : "Compare these two salons"}</AppText></View>
              <Pressable disabled={selectedSalonIds.length < 2} onPress={() => router.push({ pathname: "/compare", params: { salonIds: selectedSalonIds.join(",") } })} style={[styles.compareGo, selectedSalonIds.length < 2 && styles.compareGoDisabled]}><AppText style={styles.compareGoText}>Compare</AppText></Pressable>
            </View>
          ) : null}

          <Pressable style={styles.dealsCard} onPress={() => filtered[0] && router.push(`/salon/${filtered[0].id}`)}>
            <View style={styles.dealsIcon}><Ionicons name="pricetag-outline" size={22} color={colors.champagneLight} /></View>
            <View style={styles.dealsCopy}><AppText style={styles.dealsTitle}>Deals & Offers</AppText><AppText style={styles.dealsSubtitle}>Explore salon packages and discounts</AppText></View>
            <Ionicons name="chevron-forward" size={23} color={colors.plum} />
          </Pressable>
        </ScrollView>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { paddingTop: 18, paddingBottom: 28 },
  headerRow: { flexDirection: "row", alignItems: "flex-start", marginBottom: 25 },
  headerCopy: { flex: 1, paddingRight: 12 },
  kicker: { color: colors.champagne, fontSize: 10, fontWeight: "900", letterSpacing: 1.6 },
  title: { color: colors.ink, fontSize: 30, fontWeight: "900", marginTop: 5 },
  subtitle: { color: colors.muted, fontSize: 13, lineHeight: 19, marginTop: 5 },
  headerIcon: { width: 48, height: 48, borderRadius: 17, backgroundColor: colors.plum, alignItems: "center", justifyContent: "center" },
  sectionTitle: { color: colors.ink, fontSize: 21, fontWeight: "900" },
  sectionSubtitle: { color: colors.muted, fontSize: 12, marginTop: 4, marginBottom: 14 },
  searchBox: { height: 53, borderRadius: 17, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border, flexDirection: "row", alignItems: "center", paddingHorizontal: 15, ...shadows.card },
  searchInput: { flex: 1, color: colors.ink, fontSize: 13, marginLeft: 9, paddingVertical: 0 },
  filters: { gap: 8, paddingVertical: 15 },
  filterChip: { height: 39, paddingHorizontal: 15, borderRadius: 14, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border, justifyContent: "center" },
  filterChipActive: { backgroundColor: colors.plum, borderColor: colors.plum },
  filterText: { color: colors.plum, fontSize: 11, fontWeight: "800" },
  filterTextActive: { color: colors.white },
  list: { gap: 12 },
  salonCard: { backgroundColor: colors.white, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, padding: 10, ...shadows.card },
  salonCardSelected: { borderColor: colors.plum, borderWidth: 1.5 },
  salonMain: { flexDirection: "row" },
  pressed: { opacity: 0.88, transform: [{ scale: 0.995 }] },
  compareButton: { height: 34, borderRadius: 11, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.ivoryDeep, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, marginTop: 8 },
  compareButtonActive: { backgroundColor: colors.plum, borderColor: colors.plum },
  compareButtonText: { color: colors.plum, fontSize: 9, fontWeight: "900" },
  compareButtonTextActive: { color: colors.white },
  compareBar: { backgroundColor: colors.white, borderRadius: 18, borderWidth: 1, borderColor: colors.plum, padding: 10, flexDirection: "row", alignItems: "center", marginTop: 14, marginBottom: 12, ...shadows.card },
  compareBarIcon: { width: 40, height: 40, borderRadius: 13, backgroundColor: colors.ivoryDeep, alignItems: "center", justifyContent: "center" },
  compareBarCopy: { flex: 1, paddingHorizontal: 10 },
  compareBarTitle: { color: colors.ink, fontSize: 11, fontWeight: "900" },
  compareBarSubtitle: { color: colors.muted, fontSize: 8, marginTop: 3 },
  compareGo: { height: 36, paddingHorizontal: 13, borderRadius: 11, backgroundColor: colors.plum, alignItems: "center", justifyContent: "center" },
  compareGoDisabled: { opacity: 0.45 },
  compareGoText: { color: colors.white, fontSize: 9, fontWeight: "900" },
  salonVisual: { width: 116, minHeight: 150, borderRadius: 18, backgroundColor: colors.ivoryDeep, alignItems: "center", justifyContent: "center", position: "relative" },
  openBadge: { position: "absolute", left: 8, bottom: 8, backgroundColor: "#EEF8F1", borderRadius: 9, paddingHorizontal: 8, paddingVertical: 5, flexDirection: "row", alignItems: "center", gap: 4 },
  openDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.success },
  openText: { color: colors.success, fontSize: 9, fontWeight: "800" },
  salonBody: { flex: 1, paddingLeft: 12, paddingVertical: 4 },
  nameRow: { flexDirection: "row", alignItems: "flex-start", gap: 6 },
  salonName: { flex: 1, color: colors.ink, fontSize: 15, lineHeight: 19, fontWeight: "900" },
  rating: { backgroundColor: "#FFF1D6", borderRadius: 9, paddingHorizontal: 7, paddingVertical: 5, flexDirection: "row", alignItems: "center", gap: 3 },
  ratingText: { color: colors.ink, fontSize: 9, fontWeight: "900" },
  locationRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 9 },
  location: { flex: 1, color: colors.muted, fontSize: 10 },
  categories: { color: colors.muted, fontSize: 9, marginTop: 9 },
  cardFooter: { flexDirection: "row", alignItems: "center", marginTop: 15, gap: 6 },
  tag: { backgroundColor: "#F1E8FF", borderRadius: 8, paddingHorizontal: 7, paddingVertical: 5 },
  tagText: { color: colors.plum, fontSize: 8, fontWeight: "900" },
  viewText: { flex: 1, color: colors.plum, fontSize: 10, fontWeight: "800", textAlign: "right" },
  loading: { minHeight: 180, alignItems: "center", justifyContent: "center", gap: 9 },
  loadingText: { color: colors.muted, fontSize: 12 },
  empty: { backgroundColor: colors.white, borderRadius: radius.lg, padding: 28, alignItems: "center", borderWidth: 1, borderColor: colors.border },
  emptyIcon: { width: 54, height: 54, borderRadius: 18, backgroundColor: colors.ivoryDeep, alignItems: "center", justifyContent: "center", marginBottom: 10 },
  emptyTitle: { color: colors.ink, fontSize: 16, fontWeight: "900" },
  emptyText: { color: colors.muted, fontSize: 11, marginTop: 5 },
  dealsCard: { marginTop: 18, borderRadius: radius.lg, backgroundColor: "#FFF0E3", padding: 15, flexDirection: "row", alignItems: "center", borderWidth: 1, borderColor: colors.border },
  dealsIcon: { width: 48, height: 48, borderRadius: 16, backgroundColor: colors.plum, alignItems: "center", justifyContent: "center" },
  dealsCopy: { flex: 1, marginLeft: 12 },
  dealsTitle: { color: colors.ink, fontSize: 14, fontWeight: "900" },
  dealsSubtitle: { color: colors.muted, fontSize: 10, marginTop: 3 },
});
