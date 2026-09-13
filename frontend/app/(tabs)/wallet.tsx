import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Alert, RefreshControl, ScrollView, StyleSheet, TextInput, View, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { Screen } from "@/components/Screen";
import { getApiErrorMessage } from "@/lib/api";
import { colors, radius, shadows } from "@/constants/theme";
import { getWalletTransactions, WalletTransaction } from "@/services/wallet";
import { AppText } from "@/components/Typography";

const money = (v: unknown) =>
  `PKR ${Number(v ?? 0).toLocaleString("en-PK", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;

export default function WalletScreen() {
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const tx = await getWalletTransactions();
      setTransactions(tx);
    } catch (e) {
      Alert.alert("Transaction history", getApiErrorMessage(e));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filteredTransactions = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return transactions;

    return transactions.filter((tx) => {
      const values = [
        tx.description,
        tx.transaction_type,
        tx.transaction_reference,
        tx.status,
        tx.booking_id?.toString(),
        tx.amount?.toString(),
      ];
      return values.some((value) => String(value ?? "").toLowerCase().includes(query));
    });
  }, [transactions, search]);

  return (
    <Screen>
      <View style={styles.container}>
        <View style={styles.header}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Go back"
            onPress={() => router.back()}
            style={styles.backButton}
          >
            <Ionicons name="arrow-back" size={21} color={colors.ink} />
          </Pressable>
          <View style={styles.headerText}>
            <AppText style={styles.title}>Transaction history</AppText>
            <AppText style={styles.subtitle}>Your recent wallet activity</AppText>
          </View>
        </View>

        <View style={styles.searchWrap}>
          <Ionicons name="search-outline" size={19} color={colors.muted} />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search transactions"
            placeholderTextColor={colors.muted}
            style={styles.searchInput}
            returnKeyType="search"
            clearButtonMode="while-editing"
          />
          {search.length > 0 && (
            <Pressable onPress={() => setSearch("")} hitSlop={8}>
              <Ionicons name="close-circle" size={18} color={colors.muted} />
            </Pressable>
          )}
        </View>

        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                load();
              }}
              tintColor={colors.plum}
            />
          }
        >
          {loading ? (
            <View style={styles.empty}>
              <AppText style={styles.emptyTitle}>Loading transactions...</AppText>
            </View>
          ) : filteredTransactions.length === 0 ? (
            <View style={styles.empty}>
              <Ionicons name="receipt-outline" size={26} color={colors.plum} />
              <AppText style={styles.emptyTitle}>
                {search.trim() ? "No matching transactions" : "No transactions yet"}
              </AppText>
              <AppText style={styles.emptyHint}>
                {search.trim()
                  ? "Try a different search term."
                  : "Wallet activity will appear here."}
              </AppText>
            </View>
          ) : (
            filteredTransactions.map((tx) => {
              const positive = Number(tx.amount) >= 0;
              return (
                <View key={tx.id} style={styles.transaction}>
                  <View
                    style={[
                      styles.txIcon,
                      { backgroundColor: positive ? "#EAF5EF" : "#FBEDEC" },
                    ]}
                  >
                    <Ionicons
                      name={positive ? "arrow-down-outline" : "arrow-up-outline"}
                      size={18}
                      color={positive ? colors.success : colors.danger}
                    />
                  </View>
                  <View style={styles.txContent}>
                    <AppText style={styles.txTitle} numberOfLines={2}>
                      {tx.description || tx.transaction_type}
                    </AppText>
                    <AppText style={styles.txMeta}>
                      {new Date(tx.created_at).toLocaleDateString("en-PK", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </AppText>
                  </View>
                  <AppText style={[styles.txAmount, positive ? styles.credit : styles.debit]}>
                    {positive ? "+" : "-"}
                    {money(Math.abs(Number(tx.amount)))}
                  </AppText>
                </View>
              );
            })
          )}
        </ScrollView>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingTop: 8,
    paddingBottom: 14,
  },
  backButton: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
    ...shadows.card,
  },
  headerText: { flex: 1, minWidth: 0 },
  title: { color: colors.ink, fontSize: 21, fontWeight: "900" },
  subtitle: { color: colors.muted, fontSize: 11, marginTop: 3 },
  searchWrap: {
    height: 48,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: 14,
    marginBottom: 14,
  },
  searchInput: {
    flex: 1,
    minWidth: 0,
    height: 46,
    marginLeft: 9,
    color: colors.ink,
    fontSize: 13,
  },
  content: { paddingBottom: 30 },
  empty: {
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    padding: 28,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    marginTop: 4,
  },
  emptyTitle: { fontWeight: "900", fontSize: 15, color: colors.ink, marginTop: 8 },
  emptyHint: { color: colors.muted, fontSize: 11, marginTop: 5, textAlign: "center" },
  transaction: {
    backgroundColor: colors.white,
    borderRadius: radius.md,
    padding: 13,
    marginBottom: 8,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.border,
  },
  txIcon: {
    width: 38,
    height: 38,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  txContent: { flex: 1, minWidth: 0, paddingRight: 8 },
  txTitle: { color: colors.ink, fontWeight: "800", fontSize: 12 },
  txMeta: { color: colors.muted, fontSize: 9, marginTop: 4 },
  txAmount: { fontWeight: "900", fontSize: 11, flexShrink: 0 },
  credit: { color: colors.success },
  debit: { color: colors.danger },
});
