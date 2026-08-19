import React, { useCallback, useEffect, useState } from "react";
import { Alert, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Screen } from "@/components/Screen";
import { AppButton } from "@/components/AppButton";
import { getApiErrorMessage } from "@/lib/api";
import { colors, radius, shadows } from "@/constants/theme";
import { getWallet, getWalletTransactions, topUpWallet, Wallet, WalletTransaction } from "@/services/wallet";

const money = (v: unknown) => `PKR ${Number(v ?? 0).toLocaleString("en-PK", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;

export default function WalletScreen() {
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [adding, setAdding] = useState(false);

  const load = useCallback(async () => {
    try { const [w, tx] = await Promise.all([getWallet(), getWalletTransactions()]); setWallet(w); setTransactions(tx); }
    catch (e) { Alert.alert("Wallet", getApiErrorMessage(e)); }
    finally { setLoading(false); setRefreshing(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  async function addMoney() {
    const value = Number(amount);
    if (!Number.isFinite(value) || value <= 0) { Alert.alert("Invalid amount", "Enter an amount greater than zero."); return; }
    try { setAdding(true); await topUpWallet(value); setAmount(""); await load(); Alert.alert("Success", `${money(value)} was added to your wallet.`); }
    catch (e) { Alert.alert("Top-up failed", getApiErrorMessage(e)); }
    finally { setAdding(false); }
  }

  return <Screen>
    <ScrollView contentContainerStyle={styles.content} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={colors.plum} />}>
      <Text style={styles.kicker}>YOUR MONEY</Text>
      <Text style={styles.title}>My wallet</Text>
      <Text style={styles.subtitle}>A simple way to pay for your salon visits.</Text>

      <View style={styles.balance}>
        <View style={styles.balanceTop}><Text style={styles.label}>CURRENT BALANCE</Text><Ionicons name="wallet-outline" size={29} color={colors.champagne} /></View>
        <Text style={styles.amount}>{loading ? "Loading..." : money(wallet?.balance)}</Text>
        <AppButton title="＋ Add money" variant="secondary" onPress={() => setAmount("1000")} style={styles.addButton} />
      </View>

      <View style={styles.card}>
        <View style={styles.cardHeader}><View><Text style={styles.sectionTitle}>Add money</Text><Text style={styles.hint}>Top up your wallet before your next visit.</Text></View><View style={styles.cardIcon}><Ionicons name="add" size={19} color={colors.plum} /></View></View>
        <TextInput value={amount} onChangeText={setAmount} placeholder="Enter amount" keyboardType="decimal-pad" placeholderTextColor={colors.muted} style={styles.input} />
        <View style={styles.quickRow}>{[500, 1000, 2000].map(v => <Pressable key={v} onPress={() => setAmount(String(v))} style={styles.quick}><Text style={styles.quickText}>PKR {v.toLocaleString()}</Text></Pressable>)}</View>
        <AppButton title={adding ? "Adding..." : "Add money"} onPress={addMoney} disabled={adding} style={{ marginTop: 3 }} />
      </View>

      <View style={styles.sectionHeader}><View><Text style={styles.sectionTitle}>Transaction history</Text><Text style={styles.hint}>Your recent wallet activity</Text></View><Text style={styles.viewAll}>Recent</Text></View>
      {transactions.length === 0 ? <View style={styles.empty}><Ionicons name="receipt-outline" size={25} color={colors.plum} /><Text style={styles.emptyTitle}>No transactions yet</Text><Text style={styles.hint}>Wallet activity will appear here.</Text></View> : transactions.map(tx => {
        const positive = Number(tx.amount) >= 0;
        return <View key={tx.id} style={styles.transaction}>
          <View style={[styles.txIcon, { backgroundColor: positive ? "#EAF5EF" : "#FBEDEC" }]}><Ionicons name={positive ? "arrow-down-outline" : "arrow-up-outline"} size={18} color={positive ? colors.success : colors.danger} /></View>
          <View style={{ flex: 1 }}><Text style={styles.txTitle}>{tx.description || tx.transaction_type}</Text><Text style={styles.txMeta}>{new Date(tx.created_at).toLocaleDateString("en-PK", { day: "numeric", month: "short", year: "numeric" })}</Text></View>
          <Text style={[styles.txAmount, positive ? styles.credit : styles.debit]}>{positive ? "+" : "-"}{money(Math.abs(Number(tx.amount)))}</Text>
        </View>;
      })}
    </ScrollView>
  </Screen>;
}

const styles = StyleSheet.create({
  content: { paddingVertical: 22, paddingBottom: 50 },
  kicker: { color: colors.champagne, fontSize: 10, fontWeight: "900", letterSpacing: 1.3 },
  title: { color: colors.ink, fontSize: 29, fontWeight: "900", marginTop: 4 },
  subtitle: { color: colors.muted, fontSize: 13, lineHeight: 19, marginTop: 5, marginBottom: 19 },
  balance: { backgroundColor: colors.plum, borderRadius: radius.xl, padding: 21, marginBottom: 16, overflow: "hidden", ...shadows.card },
  balanceTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  label: { color: "#D8CADC", fontSize: 9, fontWeight: "900", letterSpacing: 1 },
  amount: { color: colors.white, fontSize: 31, fontWeight: "900", marginTop: 8, marginBottom: 13 },
  addButton: { alignSelf: "flex-start" },
  card: { backgroundColor: colors.white, borderRadius: radius.lg, padding: 17, borderWidth: 1, borderColor: colors.border, marginBottom: 24, ...shadows.card },
  cardHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  cardIcon: { width: 38, height: 38, borderRadius: 13, backgroundColor: colors.ivoryDeep, alignItems: "center", justifyContent: "center" },
  sectionTitle: { color: colors.ink, fontSize: 17, fontWeight: "900" },
  hint: { color: colors.muted, fontSize: 10, lineHeight: 16, marginTop: 2 },
  input: { height: 50, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, paddingHorizontal: 14, marginTop: 13, fontSize: 14, color: colors.ink },
  quickRow: { flexDirection: "row", gap: 8, marginVertical: 10 },
  quick: { flex: 1, minHeight: 40, borderRadius: 12, backgroundColor: colors.ivoryDeep, alignItems: "center", justifyContent: "center" },
  quickText: { color: colors.plum, fontSize: 10, fontWeight: "900" },
  sectionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 },
  viewAll: { color: colors.champagne, fontSize: 10, fontWeight: "900" },
  empty: { backgroundColor: colors.white, borderRadius: radius.lg, padding: 22, borderWidth: 1, borderColor: colors.border, alignItems: "center" },
  emptyTitle: { fontWeight: "900", fontSize: 15, color: colors.ink, marginTop: 8 },
  transaction: { backgroundColor: colors.white, borderRadius: radius.md, padding: 13, marginBottom: 8, flexDirection: "row", alignItems: "center", borderWidth: 1, borderColor: colors.border },
  txIcon: { width: 38, height: 38, borderRadius: 13, alignItems: "center", justifyContent: "center", marginRight: 10 },
  txTitle: { color: colors.ink, fontWeight: "800", fontSize: 12 },
  txMeta: { color: colors.muted, fontSize: 9, marginTop: 4 },
  txAmount: { fontWeight: "900", fontSize: 11 },
  credit: { color: colors.success },
  debit: { color: colors.danger },
});
