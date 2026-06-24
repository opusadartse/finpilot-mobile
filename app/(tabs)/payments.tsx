import { useCallback, useMemo, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { ScreenWrap } from "@/components/ScreenWrap";
import { GlassCard } from "@/components/GlassCard";
import { getPayments } from "@/lib/db";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useFocusEffect } from "@react-navigation/native";

function formatPaidAt(iso: string) {
  const d = new Date(iso);
  if (!Number.isFinite(d.getTime())) return "—";
  return d.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

export default function PaymentsScreen() {
  const [payments, setPayments] = useState(() => getPayments());

  useFocusEffect(
    useCallback(() => {
      setPayments(getPayments());
    }, [])
  );

  const sorted = useMemo(
    () => [...payments].sort((a, b) => new Date(b.paid_at).getTime() - new Date(a.paid_at).getTime()),
    [payments]
  );

  return (
    <ScreenWrap>
      <GlassCard style={styles.headerBanner}>
        <Text style={styles.headerTitle}>PAYMENT HISTORY</Text>
        <Text style={styles.headerSubtitle}>Payments applied from Credit Cards → Make Payment</Text>
      </GlassCard>

      <Animated.View entering={FadeInDown.delay(70)}>
        <GlassCard style={styles.listCard}>
          {sorted.length === 0 ? (
            <Text style={styles.empty}>No payments yet. Apply a payment from the Credit Cards tab.</Text>
          ) : (
            sorted.map((p, index) => (
              <View key={p.id} style={[styles.row, index > 0 ? styles.rowBorder : undefined]}>
                <View style={styles.rowTop}>
                  <Text style={styles.cardName} numberOfLines={1}>
                    {p.card_name}
                  </Text>
                  <Text style={styles.dateText}>{formatPaidAt(p.paid_at)}</Text>
                </View>
                <View style={styles.rowBottom}>
                  <View style={styles.metric}>
                    <Text style={styles.metricLabel}>Amount paid</Text>
                    <Text style={styles.metricValue}>${p.amount.toFixed(2)}</Text>
                  </View>
                  <View style={styles.metric}>
                    <Text style={styles.metricLabel}>Balance after</Text>
                    <Text style={styles.metricValue}>${p.balance_after.toFixed(2)}</Text>
                  </View>
                </View>
              </View>
            ))
          )}
        </GlassCard>
      </Animated.View>
    </ScreenWrap>
  );
}

const styles = StyleSheet.create({
  headerBanner: { backgroundColor: "#3F4D63", borderColor: "#3F4D63", marginBottom: 4 },
  headerTitle: { color: "#FFFFFF", fontSize: 26, fontWeight: "900", textAlign: "center", letterSpacing: 0.4 },
  headerSubtitle: {
    color: "rgba(255,255,255,0.88)",
    marginTop: 8,
    textAlign: "center",
    fontWeight: "600",
    fontSize: 14,
    lineHeight: 20,
    paddingHorizontal: 8,
  },
  listCard: { paddingVertical: 6, paddingHorizontal: 4 },
  empty: {
    textAlign: "center",
    color: "#64748B",
    fontWeight: "600",
    fontSize: 15,
    lineHeight: 22,
    paddingVertical: 28,
    paddingHorizontal: 16,
  },
  row: { paddingVertical: 14, paddingHorizontal: 12 },
  rowBorder: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: "#E5E7EB" },
  rowTop: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: 12 },
  cardName: { flex: 1, fontSize: 17, fontWeight: "900", color: "#111827", letterSpacing: 0.2 },
  dateText: { fontSize: 12, fontWeight: "700", color: "#64748B", textAlign: "right", maxWidth: "46%" },
  rowBottom: { flexDirection: "row", marginTop: 12, gap: 16 },
  metric: { flex: 1 },
  metricLabel: { fontSize: 12, fontWeight: "700", color: "#64748B", letterSpacing: 0.2 },
  metricValue: { marginTop: 4, fontSize: 16, fontWeight: "800", color: "#111827" },
});
