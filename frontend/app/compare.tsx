import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { Screen } from "@/components/Screen";
import { Bundle, getBundles, getSalon, getServices, Salon, Service } from "@/services/catalog";
import { getApiErrorMessage } from "@/lib/api";
import { colors, radius, shadows } from "@/constants/theme";
import { AppText } from "@/components/Typography";

const money = (value: unknown) => `PKR ${Number(value ?? 0).toLocaleString("en-PK", { maximumFractionDigits: 0 })}`;
const number = (value: unknown) => Number(value ?? 0);

const SALON_IMAGES = [
  "https://images.unsplash.com/photo-1560066984-138dadb4c035?auto=format&fit=crop&w=900&q=85",
  "https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?auto=format&fit=crop&w=900&q=85",
];

const SERVICE_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  haircut: "cut-outline",
  "hair-color": "color-palette-outline",
  "hair-style": "sparkles-outline",
  facial: "happy-outline",
  manicure: "hand-left-outline",
  pedicure: "footsteps-outline",
  makeup: "brush-outline",
  waxing: "remove-outline",
  massage: "body-outline",
};

const SERVICE_RULES: Array<[string, RegExp]> = [
  ["haircut", /\bhair ?cut\b/],
  ["hair-color", /\bcolor\b|\bcolour\b|\bhighlights?\b|\bbalayage\b/],
  ["hair-style", /\bstyle\b|\bblow ?dry\b|\bblowdry\b/],
  ["facial", /\bfacial\b|\bskin treatment\b/],
  ["manicure", /\bmanicure\b/],
  ["pedicure", /\bpedicure\b/],
  ["makeup", /\bmake ?up\b/],
  ["waxing", /\bwax(ing)?\b/],
  ["massage", /\bmassage\b/],
];

function canonicalKey(value: string) {
  return value
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/\b(full|classic|premium|professional|signature|express|basic|standard|deluxe|deep|complete|women's|womens|men's|mens|ladies|gentlemen)\b/g, "")
    .replace(/\b(make[ -]?up)\b/g, "makeup")
    .replace(/\b(styl(e|ing))\b/g, "style")
    .replace(/\b(cut|hair[ -]?cut)\b/g, "haircut")
    .replace(/\b(colour|coloring|colouring)\b/g, "color")
    .replace(/\b(facial|facials)\b/g, "facial")
    .replace(/\b(man[iy]cure)\b/g, "manicure")
    .replace(/\b(pedicure|pedicures)\b/g, "pedicure")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function commonServiceId(service: Service) {
  const text = `${canonicalKey(service.name)} ${canonicalKey(service.category)}`;
  return SERVICE_RULES.find(([, pattern]) => pattern.test(text))?.[0] ?? canonicalKey(service.name);
}

function commonServiceLabel(service: Service) {
  const labels: Record<string, string> = {
    haircut: "Haircut & Styling",
    "hair-color": "Hair Coloring",
    "hair-style": "Hair Styling",
    facial: "Facial",
    manicure: "Manicure",
    pedicure: "Pedicure",
    makeup: "Makeup",
    waxing: "Waxing",
    massage: "Massage",
  };
  return labels[commonServiceId(service)] || service.name;
}

function serviceKey(service: Service) {
  return commonServiceId(service);
}

function bundleKey(bundle: Bundle) {
  return canonicalKey(bundle.name);
}

type SalonData = { salon: Salon; services: Service[]; bundles: Bundle[] };
type Section = "overview" | "services" | "bundles";

export default function CompareScreen() {
  const params = useLocalSearchParams<{ salonIds?: string }>();
  const salonIds = useMemo(
    () => (params.salonIds || "").split(",").map(Number).filter(Boolean).slice(0, 2),
    [params.salonIds],
  );

  const [data, setData] = useState<SalonData[]>([]);
  const [loading, setLoading] = useState(true);
  const [imageErrors, setImageErrors] = useState<Record<number, boolean>>({});
  const [open, setOpen] = useState<Record<Section, boolean>>({ overview: true, services: true, bundles: true });

  useEffect(() => {
    if (salonIds.length !== 2) {
      setLoading(false);
      return;
    }

    (async () => {
      try {
        setLoading(true);
        const result = await Promise.all(
          salonIds.map(async (salonId) => {
            const [salon, services, bundles] = await Promise.all([
              getSalon(salonId),
              getServices(salonId),
              getBundles(salonId),
            ]);
            return { salon, services, bundles };
          }),
        );
        setData(result);
      } catch (e) {
        Alert.alert("Compare salons", getApiErrorMessage(e), [{ text: "Back", onPress: () => router.back() }]);
      } finally {
        setLoading(false);
      }
    })();
  }, [salonIds]);

  const serviceRows = useMemo(() => {
    const map = new Map<string, { label: string; category: string; values: (Service | undefined)[] }>();

    data.forEach((item, salonIndex) => {
      item.services.forEach((service) => {
        const key = serviceKey(service);
        const row = map.get(key) || {
          label: commonServiceLabel(service),
          category: service.category,
          values: Array(data.length).fill(undefined),
        };
        row.values[salonIndex] = service;
        map.set(key, row);
      });
    });

    return Array.from(map.values()).sort((a, b) => a.label.localeCompare(b.label));
  }, [data]);

  const bundleRows = useMemo(() => {
    const map = new Map<string, { label: string; values: (Bundle | undefined)[] }>();

    data.forEach((item, salonIndex) => {
      item.bundles.forEach((bundle) => {
        const key = bundleKey(bundle);
        const row = map.get(key) || {
          label: bundle.name,
          values: Array(data.length).fill(undefined),
        };
        row.values[salonIndex] = bundle;
        map.set(key, row);
      });
    });

    return Array.from(map.values()).sort((a, b) => a.label.localeCompare(b.label));
  }, [data]);

  function toggle(section: Section) {
    setOpen((current) => ({ ...current, [section]: !current[section] }));
  }

  function goToSalon(salonId: number) {
    router.push(`/salon/${salonId}`);
  }

  function bookService(salonId: number, service: Service) {
    router.push({
      pathname: "/booking",
      params: {
        salonId: String(salonId),
        serviceIds: String(service.id),
        name: service.name,
        price: String(service.price),
      },
    });
  }

  function bookBundle(salonId: number, bundle: Bundle) {
    router.push({
      pathname: "/booking",
      params: {
        salonId: String(salonId),
        bundleId: String(bundle.id),
        name: bundle.name,
        price: String(bundle.bundle_price),
      },
    });
  }

  if (salonIds.length !== 2) {
    return (
      <Screen>
        <View style={styles.center}>
          <View style={styles.emptyIcon}>
            <Ionicons name="git-compare-outline" size={28} color={colors.plum} />
          </View>
          <AppText style={styles.emptyTitle}>Choose two salons</AppText>
          <AppText style={styles.emptyText}>Comparison is designed for two salons so pricing and services stay easy to scan.</AppText>
          <Pressable style={styles.primaryButton} onPress={() => router.back()}>
            <AppText style={styles.primaryText}>Back to salons</AppText>
          </Pressable>
        </View>
      </Screen>
    );
  }

  if (loading) {
    return (
      <Screen>
        <View style={styles.center}>
          <ActivityIndicator color={colors.plum} />
          <AppText style={styles.loadingText}>Building your comparison...</AppText>
        </View>
      </Screen>
    );
  }

  const renderSection = (
    key: Section,
    title: string,
    subtitle: string,
    icon: keyof typeof Ionicons.glyphMap,
    content: React.ReactNode,
  ) => (
    <View style={styles.sectionCard}>
      <Pressable onPress={() => toggle(key)} style={styles.sectionHeader}>
        <View style={styles.sectionIcon}>
          <Ionicons name={icon} size={20} color={colors.plum} />
        </View>
        <View style={styles.sectionCopy}>
          <AppText style={styles.sectionTitle}>{title}</AppText>
          <AppText style={styles.sectionSubtitle}>{subtitle}</AppText>
        </View>
        <Ionicons name={open[key] ? "chevron-up" : "chevron-down"} size={20} color={colors.ink} />
      </Pressable>
      {open[key] ? content : null}
    </View>
  );

  return (
    <Screen>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
        stickyHeaderIndices={[]}
      >
        <View style={styles.navbar}>
          <Pressable onPress={() => router.back()} style={styles.backButton} hitSlop={6}>
            <Ionicons name="chevron-back" size={21} color={colors.plum} />
          </Pressable>
          <View style={styles.navTitleWrap}>
            <AppText style={styles.navTitle}>Compare Salons</AppText>
            <AppText style={styles.navSubtitle}>Find the perfect salon for your beauty needs</AppText>
          </View>
          <View style={styles.navActions}>
            <Pressable style={styles.navActionIcon} hitSlop={6}>
              <Ionicons name="heart-outline" size={23} color={colors.plum} />
            </Pressable>
            <Pressable style={styles.navActionIcon} hitSlop={6}>
              <Ionicons name="share-outline" size={22} color={colors.plum} />
            </Pressable>
          </View>
        </View>

        <View style={styles.salonPair}>
          {data.map((item, index) => {
            const imageFailed = imageErrors[item.salon.id];
            return (
              <Pressable key={item.salon.id} onPress={() => goToSalon(item.salon.id)} style={styles.salonCard}>
                <View style={styles.salonImageWrap}>
                  {imageFailed ? (
                    <View style={styles.imageFallback}>
                      <Ionicons name="sparkles-outline" size={30} color={colors.plum} />
                    </View>
                  ) : (
                    <Image
                      source={{ uri: SALON_IMAGES[index] }}
                      style={styles.salonImage}
                      resizeMode="cover"
                      onError={() => setImageErrors((current) => ({ ...current, [item.salon.id]: true }))}
                    />
                  )}
                  <View style={styles.favoriteCircle}>
                    <Ionicons name="heart-outline" size={19} color={colors.plum} />
                  </View>
                </View>
                <View style={styles.salonCardBody}>
                  <AppText style={styles.salonCardName} numberOfLines={2}>{item.salon.name}</AppText>
                  <View style={styles.infoLine}>
                    <Ionicons name="business-outline" size={15} color={colors.muted} />
                    <AppText style={styles.infoText}>Salon services & packages</AppText>
                  </View>
                  <View style={styles.infoLine}>
                    <Ionicons name="location-outline" size={15} color={colors.muted} />
                    <AppText style={styles.infoText} numberOfLines={1}>{item.salon.address_line1 || item.salon.city || "Location not provided"}</AppText>
                  </View>
                  <View style={styles.openLine}>
                    <View style={styles.openDot} />
                    <AppText style={styles.openText}>{item.salon.is_active ? "Active" : "Unavailable"}</AppText>
                    <AppText style={styles.openSeparator}>·</AppText>
                    <AppText style={styles.infoText}>Open {item.salon.opening_time} – {item.salon.closing_time}</AppText>
                  </View>
                </View>
              </Pressable>
            );
          })}
        </View>

        {renderSection(
          "overview",
          "Overview",
          "Key information at a glance",
          "stats-chart-outline",
          <View style={styles.overviewBox}>
            <View style={styles.overviewLabels}>
              <View style={styles.overviewHeaderSpacer} />
              {[
                ["business-outline", "Status"],
                ["location-outline", "Location"],
                ["time-outline", "Working Hours"],
                ["cut-outline", "Total Services"],
                ["gift-outline", "Total Bundles"],
                ["pricetag-outline", "Starting Price"],
              ].map(([icon, label]) => (
                <View key={label} style={styles.overviewLabelRow}>
                  <Ionicons name={icon as keyof typeof Ionicons.glyphMap} size={17} color={colors.plumSoft} />
                  <AppText style={styles.overviewLabel}>{label}</AppText>
                </View>
              ))}
            </View>
            {data.map((item, index) => {
              const startPrice = item.services.length ? Math.min(...item.services.map((service) => number(service.price))) : 0;
              return (
                <View key={item.salon.id} style={[styles.overviewColumn, index === 0 && styles.overviewWinnerColumn]}>
                  <View style={styles.overviewBadgeSpacer} />
                  <AppText style={styles.overviewValue}>{item.salon.is_active ? "Active" : "Unavailable"}</AppText>
                  <AppText style={styles.overviewValue} numberOfLines={2}>{item.salon.city || item.salon.address_line1 || "Not provided"}</AppText>
                  <AppText style={styles.overviewValue}>{item.salon.opening_time} – {item.salon.closing_time}</AppText>
                  <AppText style={styles.overviewValue}>{item.services.length}</AppText>
                  <AppText style={styles.overviewValue}>{item.bundles.length}</AppText>
                  <View style={styles.priceRow}>
                    <AppText style={styles.overviewPrice}>{startPrice ? money(startPrice) : "—"}</AppText>
                    {index === 1 ? <View style={styles.lowerPriceBadge}><AppText style={styles.lowerPriceText}>Lower Price</AppText></View> : null}
                  </View>
                </View>
              );
            })}
          </View>,
        )}

        {renderSection(
          "services",
          "Popular Services",
          "Compare prices and duration for common services",
          "cut-outline",
          <View style={styles.sectionBody}>
            {serviceRows.length === 0 ? (
              <AppText style={styles.noData}>No common services are available to compare.</AppText>
            ) : (
              serviceRows.map((row) => {
                const prices = row.values.map((service) => (service ? number(service.price) : null)).filter((value): value is number => value !== null);
                const best = prices.length === 2 ? Math.min(...prices) : null;
                const icon = SERVICE_ICONS[commonServiceId(row.values.find(Boolean) as Service)] || "sparkles-outline";

                return (
                  <View key={`${row.category}-${row.label}`} style={styles.compareRow}>
                    <View style={styles.serviceInfo}>
                      <View style={styles.serviceIcon}>
                        <Ionicons name={icon} size={20} color={colors.plum} />
                      </View>
                      <View style={styles.serviceCopy}>
                        <AppText style={styles.serviceName} numberOfLines={1}>{row.label}</AppText>
                        <AppText style={styles.serviceDescription} numberOfLines={1}>
                          {row.label === "Haircut & Styling" ? "Cut, wash and style" : "Beauty care service"}
                        </AppText>
                      </View>
                    </View>
                    {row.values.map((service, index) => {
                      const isBest = Boolean(service && best !== null && number(service.price) === best);
                      return (
                        <View key={data[index].salon.id} style={[styles.valueCell, isBest && styles.valueCellBest]}>
                          {service ? (
                            <>
                              <AppText style={[styles.cellPrice, isBest && styles.cellPriceBest]}>{money(service.price)}</AppText>
                              <View style={styles.durationRow}>
                                <Ionicons name="time-outline" size={13} color={colors.muted} />
                                <AppText style={styles.cellMeta}>{service.duration_minutes} min</AppText>
                              </View>
                              {isBest ? (
                                <View style={styles.bestBadge}>
                                  <AppText style={styles.bestBadgeText}>Better Value</AppText>
                                </View>
                              ) : null}
                            </>
                          ) : (
                            <AppText style={styles.unavailable}>Not offered</AppText>
                          )}
                        </View>
                      );
                    })}
                  </View>
                );
              })
            )}
          </View>,
        )}

        {renderSection(
          "bundles",
          "Bundles",
          "Compare salon packages and savings",
          "gift-outline",
          <View style={styles.sectionBody}>
            {bundleRows.length === 0 ? (
              <AppText style={styles.noData}>No bundles are available to compare.</AppText>
            ) : (
              bundleRows.map((row) => {
                const prices = row.values.map((bundle) => (bundle ? number(bundle.bundle_price) : null)).filter((value): value is number => value !== null);
                const best = prices.length === 2 ? Math.min(...prices) : null;
                return (
                  <View key={row.label} style={styles.compareRow}>
                    <View style={styles.serviceInfo}>
                      <View style={styles.bundleIcon}>
                        <Ionicons name="gift-outline" size={20} color={colors.plum} />
                      </View>
                      <View style={styles.serviceCopy}>
                        <AppText style={styles.serviceName} numberOfLines={1}>{row.label}</AppText>
                        <AppText style={styles.serviceDescription} numberOfLines={1}>Salon package & savings</AppText>
                      </View>
                    </View>
                    {row.values.map((bundle, index) => {
                      const isBest = Boolean(bundle && best !== null && number(bundle.bundle_price) === best);
                      const savings = bundle ? number(bundle.original_price) - number(bundle.bundle_price) : 0;
                      return (
                        <View key={data[index].salon.id} style={[styles.valueCell, styles.bundleCell, isBest && styles.valueCellBest]}>
                          {bundle ? (
                            <>
                              <AppText style={[styles.cellPrice, isBest && styles.cellPriceBest]}>{money(bundle.bundle_price)}</AppText>
                              <AppText style={styles.originalPrice}>{money(bundle.original_price)}</AppText>
                              <View style={styles.bundleMetaRow}>
                                <AppText style={styles.saveText}>Save {money(savings)}</AppText>
                                {isBest ? <View style={styles.bestBadge}><AppText style={styles.bestBadgeText}>Better Value</AppText></View> : null}
                              </View>
                              <AppText style={styles.cellMeta}>{bundle.duration_minutes} min</AppText>
                            </>
                          ) : (
                            <AppText style={styles.unavailable}>Not offered</AppText>
                          )}
                        </View>
                      );
                    })}
                  </View>
                );
              })
            )}
          </View>,
        )}

        <View style={styles.footerActions}>
          <Pressable style={styles.detailsButton} onPress={() => goToSalon(data[0].salon.id)}>
            <AppText style={styles.detailsButtonText}>View Salon Details</AppText>
          </Pressable>
          <Pressable style={styles.bookButton} onPress={() => goToSalon(data[0].salon.id)}>
            <AppText style={styles.bookButtonText}>Book Now</AppText>
            <Ionicons name="arrow-forward" size={20} color={colors.white} />
          </Pressable>
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { paddingTop: 8, paddingBottom: 28 },
  backButton: { width: 42, height: 42, borderRadius: 15, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border, alignItems: "center", justifyContent: "center" },
  navbar: { flexDirection: "row", alignItems: "center", marginBottom: 14 },
  navIcon: { width: 38, height: 38, alignItems: "center", justifyContent: "center" },
  navTitleWrap: { flex: 1, alignItems: "center", paddingHorizontal: 4 },
  navTitle: { color: colors.ink, fontSize: 20, fontWeight: "900" },
  navSubtitle: { color: colors.muted, fontSize: 9, marginTop: 2, textAlign: "center" },
  navActions: { flexDirection: "row", gap: 4 },
  navActionIcon: { width: 35, height: 35, alignItems: "center", justifyContent: "center" },

  salonPair: { flexDirection: "row", gap: 10, marginBottom: 14 },
  salonCard: { flex: 1, overflow: "hidden", backgroundColor: colors.white, borderRadius: 18, borderWidth: 1, borderColor: colors.border, ...shadows.card },
  salonImageWrap: { height: 126, position: "relative", backgroundColor: colors.ivoryDeep },
  salonImage: { width: "100%", height: "100%" },
  imageFallback: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.ivoryDeep },
  topRatedBadge: { position: "absolute", top: 9, left: 9, backgroundColor: colors.white, borderRadius: 12, paddingHorizontal: 8, paddingVertical: 6, flexDirection: "row", alignItems: "center", gap: 5 },
  topRatedText: { color: colors.plum, fontSize: 8, fontWeight: "900" },
  favoriteCircle: { position: "absolute", top: 8, right: 8, width: 34, height: 34, borderRadius: 17, backgroundColor: colors.white, alignItems: "center", justifyContent: "center" },
  salonCardBody: { padding: 11 },
  salonCardName: { color: colors.ink, fontSize: 15, lineHeight: 18, fontWeight: "900", minHeight: 36 },
  ratingLine: { flexDirection: "row", alignItems: "center", marginTop: 6, gap: 4 },
  ratingNumber: { color: colors.ink, fontSize: 10, fontWeight: "900" },
  reviewText: { color: colors.muted, fontSize: 8 },
  infoLine: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 7 },
  infoText: { flex: 1, color: colors.muted, fontSize: 8, lineHeight: 12 },
  openLine: { flexDirection: "row", alignItems: "center", marginTop: 7, gap: 5 },
  openDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.success },
  openText: { color: colors.success, fontSize: 8, fontWeight: "900" },
  openSeparator: { color: colors.muted, fontSize: 8 },

  sectionCard: { backgroundColor: colors.white, borderRadius: 19, borderWidth: 1, borderColor: colors.border, overflow: "hidden", marginBottom: 12, ...shadows.card },
  sectionHeader: { minHeight: 64, paddingHorizontal: 11, flexDirection: "row", alignItems: "center" },
  sectionIcon: { width: 42, height: 42, borderRadius: 15, backgroundColor: "#F4EDE4", alignItems: "center", justifyContent: "center" },
  sectionCopy: { flex: 1, paddingHorizontal: 10 },
  sectionTitle: { color: colors.ink, fontSize: 15, fontWeight: "900" },
  sectionSubtitle: { color: colors.muted, fontSize: 8, marginTop: 3 },

  overviewBox: { borderTopWidth: 1, borderTopColor: colors.border, flexDirection: "row", padding: 8 },
  overviewLabels: { width: 112 },
  overviewHeaderSpacer: { height: 38 },
  overviewLabelRow: { height: 36, flexDirection: "row", alignItems: "center", gap: 7 },
  overviewLabel: { color: colors.ink, fontSize: 9, fontWeight: "600" },
  overviewColumn: { flex: 1, borderLeftWidth: 1, borderLeftColor: colors.border, alignItems: "center", paddingHorizontal: 6 },
  overviewWinnerColumn: { backgroundColor: "#F8F2FB", borderRadius: 13 },
  betterRatedBadge: { height: 28, flexDirection: "row", alignItems: "center", gap: 4 },
  betterRatedText: { color: colors.plum, fontSize: 8, fontWeight: "800" },
  overviewBadgeSpacer: { height: 28 },
  overviewValue: { height: 36, width: "100%", textAlign: "center", textAlignVertical: "center", color: colors.ink, fontSize: 9, borderTopWidth: 1, borderTopColor: colors.border },
  priceRow: { height: 36, width: "100%", alignItems: "center", justifyContent: "center", borderTopWidth: 1, borderTopColor: colors.border, gap: 3 },
  overviewPrice: { color: colors.ink, fontSize: 10, fontWeight: "900" },
  lowerPriceBadge: { backgroundColor: "#E9F5E9", borderRadius: 8, paddingHorizontal: 6, paddingVertical: 3 },
  lowerPriceText: { color: colors.success, fontSize: 6.5, fontWeight: "900" },

  sectionBody: { borderTopWidth: 1, borderTopColor: colors.border },
  compareRow: { flexDirection: "row", minHeight: 88, borderBottomWidth: 1, borderBottomColor: colors.border },
  serviceInfo: { width: 116, padding: 9, flexDirection: "row", alignItems: "center" },
  serviceIcon: { width: 36, height: 36, borderRadius: 11, backgroundColor: "#F6EDE8", alignItems: "center", justifyContent: "center" },
  bundleIcon: { width: 36, height: 36, borderRadius: 11, backgroundColor: "#F2EAF5", alignItems: "center", justifyContent: "center" },
  serviceCopy: { flex: 1, paddingLeft: 7 },
  serviceName: { color: colors.ink, fontSize: 9, fontWeight: "900" },
  serviceDescription: { color: colors.muted, fontSize: 7, lineHeight: 10, marginTop: 3 },
  valueCell: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 5, borderLeftWidth: 1, borderLeftColor: colors.border },
  valueCellBest: { backgroundColor: "#F8F3FA" },
  cellPrice: { color: colors.ink, fontSize: 10, fontWeight: "900" },
  cellPriceBest: { color: colors.plum },
  durationRow: { flexDirection: "row", alignItems: "center", gap: 3, marginTop: 4 },
  cellMeta: { color: colors.muted, fontSize: 7 },
  bestBadge: { marginTop: 5, backgroundColor: "#E9F5E9", borderRadius: 7, paddingHorizontal: 6, paddingVertical: 3 },
  bestBadgeText: { color: colors.success, fontSize: 6.5, fontWeight: "900" },
  unavailable: { color: colors.muted, fontSize: 8, fontWeight: "700" },
  bundleCell: { paddingVertical: 7 },
  originalPrice: { color: colors.muted, fontSize: 7, textDecorationLine: "line-through", marginTop: 3 },
  bundleMetaRow: { alignItems: "center", marginTop: 4 },
  saveText: { color: colors.danger, fontSize: 7, fontWeight: "800" },
  noData: { color: colors.muted, fontSize: 9, padding: 14 },

  footerActions: { flexDirection: "row", gap: 10, marginTop: 2 },
  detailsButton: { flex: 1, height: 54, borderRadius: 17, borderWidth: 1.3, borderColor: colors.plum, backgroundColor: colors.white, alignItems: "center", justifyContent: "center" },
  detailsButtonText: { color: colors.plum, fontSize: 10, fontWeight: "900" },
  bookButton: { flex: 1, height: 54, borderRadius: 17, backgroundColor: colors.plum, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 12 },
  bookButtonText: { color: colors.white, fontSize: 10, fontWeight: "900" },

  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 30 },
  emptyIcon: { width: 62, height: 62, borderRadius: 21, backgroundColor: colors.ivoryDeep, alignItems: "center", justifyContent: "center", marginBottom: 12 },
  emptyTitle: { color: colors.ink, fontSize: 17, fontWeight: "900" },
  emptyText: { color: colors.muted, fontSize: 10, lineHeight: 16, textAlign: "center", marginTop: 6, marginBottom: 16, maxWidth: 260 },
  primaryButton: { backgroundColor: colors.plum, borderRadius: 14, paddingHorizontal: 20, height: 44, alignItems: "center", justifyContent: "center" },
  primaryText: { color: colors.white, fontSize: 10, fontWeight: "900" },
  loadingText: { color: colors.muted, fontSize: 10, marginTop: 9 },
});
