import React, { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Screen } from "@/components/Screen";
import { Bundle, getBundles, getSalon, getServicesPage, Salon, Service } from "@/services/catalog";
import { getApiErrorMessage } from "@/lib/api";
import { colors, radius, shadows } from "@/constants/theme";
import { AppText } from "@/components/Typography";

const money = (value: unknown) => `PKR ${Number(value ?? 0).toLocaleString("en-PK", { maximumFractionDigits: 0 })}`;
const iconFor = (category: string): keyof typeof Ionicons.glyphMap => {
  const x = category.toLowerCase();
  if (x.includes("hair")) return "cut-outline";
  if (x.includes("nail")) return "hand-left-outline";
  if (x.includes("make")) return "color-palette-outline";
  if (x.includes("skin") || x.includes("facial")) return "sparkles-outline";
  return "flower-outline";
};

export default function SalonServicesScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const salonId = Number(id);
  const [salon, setSalon] = useState<Salon | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [bundles, setBundles] = useState<Bundle[]>([]);
  const [tab, setTab] = useState<"services" | "bundles">("services");
  const [category, setCategory] = useState("All");
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [servicesPage, setServicesPage] = useState(1);
  const [servicesHasMore, setServicesHasMore] = useState(false);
  const [favorite, setFavorite] = useState(false);
  const { width } = useWindowDimensions();
  const compact = width < 390;

  const loadServicesPage = useCallback(async (nextPage: number) => {
    if (!salonId) return;
    try {
      if (nextPage > 1) setLoadingMore(true);
      const result = await getServicesPage(salonId, nextPage, 10);
      setServices(current => nextPage === 1 ? result.items : [...current, ...result.items]);
      setServicesPage(result.page);
      setServicesHasMore(result.has_more);
    } catch (e) {
      Alert.alert("Salon services", getApiErrorMessage(e));
    } finally {
      setLoadingMore(false);
    }
  }, [salonId]);

  useEffect(() => {
    if (!salonId) return;
    (async () => {
      try {
        setLoading(true);
        const [salonData, bundleData] = await Promise.all([
          getSalon(salonId),
          getBundles(salonId),
        ]);
        setSalon(salonData);
        setBundles(bundleData);
        await loadServicesPage(1);
      } catch (e) {
        Alert.alert("Salon", getApiErrorMessage(e), [{ text: "Back", onPress: () => router.back() }]);
      } finally {
        setLoading(false);
      }
    })();
  }, [salonId, loadServicesPage]);

  const loadMoreServices = () => {
    if (tab === "services" && !loading && !loadingMore && servicesHasMore) loadServicesPage(servicesPage + 1);
  };

  const categories = useMemo(() => ["All", ...Array.from(new Set(services.map((s) => s.category).filter(Boolean)))], [services]);
  const visibleServices = useMemo(() => services.filter((s) => category === "All" || s.category === category), [services, category]);

  const bookService = (service: Service) => {
    router.push({
      pathname: "/booking",
      params: { salonId: String(salonId), serviceIds: String(service.id), name: service.name, price: String(service.price) },
    });
  };

  const bookBundle = (bundle: Bundle) => {
    router.push({
      pathname: "/booking",
      params: { salonId: String(salonId), bundleId: String(bundle.id), name: bundle.name, price: String(bundle.bundle_price) },
    });
  };

  if (loading || !salon) {
    return <Screen><View style={styles.loading}><ActivityIndicator color={colors.plum} size="small" /><AppText style={styles.loadingText}>Loading salon menu...</AppText></View></Screen>;
  }

  return (
    <Screen>
      <View style={styles.screen}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.content}
          onScroll={({ nativeEvent }) => {
            const nearBottom = nativeEvent.layoutMeasurement.height + nativeEvent.contentOffset.y >= nativeEvent.contentSize.height - 500;
            if (nearBottom) loadMoreServices();
          }}
          scrollEventThrottle={200}
        >
          <View style={styles.topBar}>
            <Pressable onPress={() => router.back()} style={styles.backButton}><Ionicons name="arrow-back" size={21} color={colors.ink} /></Pressable>
            <Pressable onPress={() => setFavorite((v) => !v)} style={styles.favoriteButton}>
              <Ionicons name={favorite ? "heart" : "heart-outline"} size={21} color={favorite ? "#C64B5B" : colors.plum} />
            </Pressable>
          </View>

          <View style={[styles.salonHero, compact && styles.salonHeroCompact]}>
            <View style={[styles.salonLogo, compact && styles.salonLogoCompact]}><Ionicons name="sparkles-outline" size={35} color={colors.plum} /></View>
            <View style={styles.heroCopy}>
              <AppText style={styles.salonName}>{salon.name}</AppText>
              <View style={styles.ratingRow}><Ionicons name="star" size={14} color={colors.champagne} /><AppText style={styles.ratingValue}>4.8</AppText><AppText style={styles.reviewText}>(230 reviews)</AppText></View>
              <View style={styles.locationRow}><Ionicons name="location-outline" size={14} color={colors.muted} /><AppText style={styles.location} numberOfLines={1}>{salon.address_line1 || salon.city || "Location available"}{salon.city && salon.address_line1 ? ` · ${salon.city}` : ""}</AppText></View>
              <View style={styles.openRow}><View style={styles.greenDot} /><AppText style={styles.openLabel}>Open</AppText><AppText style={styles.dotSep}>·</AppText><AppText style={styles.closeLabel}>Closes at {salon.closing_time}</AppText></View>
            </View>
          </View>

          <View style={styles.tabs}>
            <Pressable onPress={() => setTab("services")} style={[styles.tab, tab === "services" && styles.tabActive]}><AppText style={[styles.tabText, tab === "services" && styles.tabTextActive]}>Services</AppText></Pressable>
            <Pressable onPress={() => setTab("bundles")} style={[styles.tab, tab === "bundles" && styles.tabActive]}><AppText style={[styles.tabText, tab === "bundles" && styles.tabTextActive]}>Bundles</AppText></Pressable>
            {/* <View style={styles.tab}><AppText style={styles.tabText}>About</AppText></View> */}
            {/* <View style={styles.tab}><AppText style={styles.tabText}>Reviews</AppText></View> */}
          </View>

          {/* <View style={styles.offerCard}>
            <View style={styles.offerIcon}><Ionicons name="pricetag" size={21} color={colors.champagneLight} /></View>
            <View style={styles.offerCopy}><AppText style={styles.offerTitle}>Special offers</AppText><AppText style={styles.offerSubtitle}>Ask the salon about current discounts</AppText></View>
            <Ionicons name="chevron-forward" size={20} color={colors.champagneLight} />
          </View> */}

          {tab === "services" ? (
            <>
              <View style={styles.sectionHeader}><View><AppText style={styles.sectionTitle}>Popular services</AppText><AppText style={styles.sectionSubtitle}>{services.length} services available at this salon</AppText></View></View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categories}>
                {categories.map((item) => <Pressable key={item} onPress={() => setCategory(item)} style={[styles.categoryChip, category === item && styles.categoryActive]}><AppText style={[styles.categoryText, category === item && styles.categoryTextActive]}>{item}</AppText></Pressable>)}
              </ScrollView>
              <View style={styles.serviceList}>
                {visibleServices.map((service) => (
                  <View key={service.id} style={[styles.serviceCard, compact && styles.serviceCardCompact]}>
                    <View style={styles.serviceIcon}><Ionicons name={iconFor(service.category)} size={24} color={colors.plum} /></View>
                    <View style={styles.serviceCopy}>
                      <AppText style={styles.serviceName} numberOfLines={2}>{service.name}</AppText>
                      <AppText style={styles.serviceDescription} numberOfLines={2}>{service.description || `${service.category} treatment`}</AppText>
                      <View style={styles.metaRow}><Ionicons name="time-outline" size={13} color={colors.muted} /><AppText style={styles.metaText}>{service.duration_minutes} min</AppText><View style={styles.metaDot} /><AppText style={styles.metaText}>{service.category}</AppText></View>
                      <AppText style={styles.price}>{money(service.price)}</AppText>
                    </View>
                    <Pressable onPress={() => bookService(service)} style={[styles.bookButton, compact && styles.bookButtonCompact]}><AppText style={styles.bookText}>Book</AppText></Pressable>
                  </View>
                ))}
              </View>
              {loadingMore && <View style={styles.loadMore}><ActivityIndicator color={colors.plum} /><AppText style={styles.loadingText}>Loading more services...</AppText></View>}
              {!loading && !servicesHasMore && services.length > 0 && <AppText style={styles.endText}>You have reached the end of the service list.</AppText>}
            </>
          ) : (
            <>
              <View style={styles.sectionHeader}><View><AppText style={styles.sectionTitle}>Signature bundles</AppText><AppText style={styles.sectionSubtitle}>Curated services at a better value</AppText></View></View>
              {bundles.length === 0 ? <View style={styles.empty}><Ionicons name="gift-outline" size={28} color={colors.plum} /><AppText style={styles.emptyTitle}>No bundles available</AppText><AppText style={styles.emptyText}>This salon currently offers individual services.</AppText></View> : <View style={styles.bundleList}>{bundles.map((bundle) => { const saved = Number(bundle.original_price) - Number(bundle.bundle_price); return <View key={bundle.id} style={styles.bundleCard}><View style={styles.bundleHeader}><View style={styles.bundleIcon}><Ionicons name="gift-outline" size={21} color={colors.champagne} /></View><View style={styles.bundleTitleCopy}><AppText style={styles.bundleName}>{bundle.name}</AppText><AppText style={styles.bundleDescription} numberOfLines={2}>{bundle.description || bundle.services.map((s) => s.name).join(" + ")}</AppText></View></View><View style={styles.bundleServices}>{bundle.services.slice(0, 4).map((s) => <View key={s.id} style={styles.miniTag}><AppText style={styles.miniTagText}>{s.name}</AppText></View>)}</View><View style={[styles.bundleBottom, compact && styles.bundleBottomCompact]}><View><View style={styles.bundlePriceRow}><AppText style={styles.bundlePrice}>{money(bundle.bundle_price)}</AppText><AppText style={styles.originalPrice}>{money(bundle.original_price)}</AppText></View><AppText style={styles.saveText}>Save {money(saved)} · {bundle.duration_minutes} min</AppText></View><Pressable onPress={() => bookBundle(bundle)} style={[styles.bookButton, compact && styles.bookButtonCompact]}><AppText style={styles.bookText}>Book</AppText></Pressable></View></View>; })}</View>}
            </>
          )}
        </ScrollView>

        <Pressable style={styles.bottomAction} onPress={() => setTab(tab === "services" ? "bundles" : "services")}>
          <View style={styles.bottomIcon}><Ionicons name={tab === "services" ? "gift-outline" : "cut-outline"} size={20} color={colors.plum} /></View>
          <View style={styles.bottomCopy}><AppText style={styles.bottomTitle}>{tab === "services" ? "Explore bundles" : "Browse individual services"}</AppText><AppText style={styles.bottomSubtitle}>Choose what works best for you</AppText></View>
          <Ionicons name="chevron-forward" size={22} color={colors.white} />
        </Pressable>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { paddingTop: 10, paddingBottom: 115 },
  topBar: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 14 },
  backButton: { width: 42, height: 42, borderRadius: 14, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border, alignItems: "center", justifyContent: "center" },
  favoriteButton: { width: 42, height: 42, borderRadius: 14, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border, alignItems: "center", justifyContent: "center" },
  salonHero: { flexDirection: "row", alignItems: "center", marginBottom: 18 },
  salonHeroCompact: { alignItems: "flex-start" },
  salonLogo: { width: 92, height: 92, borderRadius: 24, backgroundColor: colors.ivoryDeep, alignItems: "center", justifyContent: "center" },
  salonLogoCompact: { width: 76, height: 76, borderRadius: 20 },
  heroCopy: { flex: 1, minWidth: 0, paddingLeft: 14 },
  salonName: { color: colors.ink, fontSize: 21, fontWeight: "900", lineHeight: 26 },
  ratingRow: { flexDirection: "row", alignItems: "center", gap: 5, marginTop: 6 },
  ratingValue: { color: colors.ink, fontSize: 11, fontWeight: "900" },
  reviewText: { color: colors.muted, fontSize: 10 },
  locationRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 7 },
  location: { flex: 1, color: colors.muted, fontSize: 10 },
  openRow: { flexDirection: "row", alignItems: "center", gap: 5, marginTop: 6 },
  greenDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.success },
  openLabel: { color: colors.success, fontSize: 10, fontWeight: "800" },
  dotSep: { color: colors.muted, fontSize: 10 },
  closeLabel: { color: colors.muted, fontSize: 10 },
  tabs: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: colors.border, marginBottom: 14 },
  tab: { flex: 1, minHeight: 44, alignItems: "center", justifyContent: "center", borderBottomWidth: 2, borderBottomColor: "transparent" },
  tabActive: { borderBottomColor: colors.plum },
  tabText: { color: colors.muted, fontSize: 11, fontWeight: "800" },
  tabTextActive: { color: colors.plum },
  offerCard: { backgroundColor: colors.plum, borderRadius: radius.lg, padding: 13, flexDirection: "row", alignItems: "center", marginBottom: 20, ...shadows.card },
  offerIcon: { width: 42, height: 42, borderRadius: 14, backgroundColor: colors.plumSoft, alignItems: "center", justifyContent: "center" },
  offerCopy: { flex: 1, paddingHorizontal: 11 },
  offerTitle: { color: colors.white, fontSize: 12, fontWeight: "900" },
  offerSubtitle: { color: "#D8CADC", fontSize: 9, marginTop: 3 },
  sectionHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 8 },
  sectionTitle: { color: colors.ink, fontSize: 18, fontWeight: "900" },
  sectionSubtitle: { color: colors.muted, fontSize: 10, marginTop: 3 },
  categories: { gap: 7, paddingVertical: 9, paddingBottom: 14 },
  categoryChip: { paddingHorizontal: 12, height: 35, borderRadius: 12, backgroundColor: colors.ivoryDeep, borderWidth: 1, borderColor: colors.border, alignItems: "center", justifyContent: "center" },
  categoryActive: { backgroundColor: colors.plum, borderColor: colors.plum },
  categoryText: { color: colors.plum, fontSize: 10, fontWeight: "800" },
  categoryTextActive: { color: colors.champagneLight },
  serviceList: { gap: 9 },
  serviceCard: { backgroundColor: colors.white, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, padding: 11, flexDirection: "row", alignItems: "center", ...shadows.card },
  serviceCardCompact: { flexWrap: "wrap", alignItems: "flex-start" },
  serviceIcon: { width: 54, height: 68, borderRadius: 16, backgroundColor: colors.ivoryDeep, alignItems: "center", justifyContent: "center" },
  serviceCopy: { flex: 1, minWidth: 0, paddingHorizontal: 10 },
  serviceName: { color: colors.ink, fontSize: 13, fontWeight: "900" },
  serviceDescription: { color: colors.muted, fontSize: 9, lineHeight: 14, marginTop: 3 },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 5 },
  metaText: { color: colors.muted, fontSize: 8 },
  metaDot: { width: 3, height: 3, borderRadius: 2, backgroundColor: colors.muted, marginHorizontal: 2 },
  price: { color: colors.plum, fontSize: 13, fontWeight: "900", marginTop: 5 },
  bookButton: { minWidth: 58, height: 38, paddingHorizontal: 11, borderRadius: 13, backgroundColor: colors.plum, alignItems: "center", justifyContent: "center" },
  bookButtonCompact: { flex: 1, width: "100%", marginTop: 10 },
  bookText: { color: colors.white, fontSize: 10, fontWeight: "900" },
  bundleList: { gap: 10 },
  bundleCard: { backgroundColor: "#FFF7ED", borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, padding: 14, ...shadows.card },
  bundleHeader: { flexDirection: "row", alignItems: "center" },
  bundleIcon: { width: 48, height: 48, borderRadius: 15, backgroundColor: colors.plum, alignItems: "center", justifyContent: "center" },
  bundleTitleCopy: { flex: 1, paddingLeft: 10 },
  bundleName: { color: colors.ink, fontSize: 14, fontWeight: "900" },
  bundleDescription: { color: colors.muted, fontSize: 9, lineHeight: 14, marginTop: 3 },
  bundleServices: { flexDirection: "row", flexWrap: "wrap", gap: 5, marginTop: 11 },
  miniTag: { backgroundColor: colors.ivoryDeep, borderRadius: 8, paddingHorizontal: 7, paddingVertical: 5 },
  miniTagText: { color: colors.plum, fontSize: 8, fontWeight: "800" },
  bundleBottom: { flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between", marginTop: 13 },
  bundleBottomCompact: { flexDirection: "column", alignItems: "stretch", gap: 10 },
  bundlePriceRow: { flexDirection: "row", alignItems: "baseline", gap: 6 },
  bundlePrice: { color: colors.plum, fontSize: 15, fontWeight: "900" },
  originalPrice: { color: colors.muted, fontSize: 9, textDecorationLine: "line-through" },
  saveText: { color: colors.success, fontSize: 9, marginTop: 3, fontWeight: "700" },
  empty: { backgroundColor: colors.white, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, padding: 28, alignItems: "center" },
  emptyTitle: { color: colors.ink, fontSize: 15, fontWeight: "900", marginTop: 8 },
  emptyText: { color: colors.muted, fontSize: 10, marginTop: 4 },
  bottomAction: { position: "absolute", left: 0, right: 0, bottom: 10, minHeight: 64, borderRadius: 19, backgroundColor: colors.plum, padding: 10, flexDirection: "row", alignItems: "center", ...shadows.card },
  bottomIcon: { width: 44, height: 44, borderRadius: 14, backgroundColor: colors.champagneLight, alignItems: "center", justifyContent: "center" },
  bottomCopy: { flex: 1, paddingHorizontal: 10 },
  bottomTitle: { color: colors.white, fontSize: 11, fontWeight: "900" },
  bottomSubtitle: { color: "#D8CADC", fontSize: 8, marginTop: 2 },
  loading: { flex: 1, alignItems: "center", justifyContent: "center", gap: 9 },
  loadingText: { color: colors.muted, fontSize: 12 },
  loadMore: { alignItems: "center", justifyContent: "center", gap: 7, paddingVertical: 18 },
  endText: { color: colors.muted, fontSize: 10, textAlign: "center", paddingVertical: 10 },
});
