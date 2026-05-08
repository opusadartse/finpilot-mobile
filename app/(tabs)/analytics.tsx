import { useCallback, useMemo, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { ScreenWrap } from "@/components/ScreenWrap";
import { GlassCard } from "@/components/GlassCard";
import {
  getCards,
  getLoanPayments,
  getLoans,
  getPayments,
  getUserBaseScore,
} from "@/lib/db";
import { computeDynamicScore } from "@/lib/score";
import Colors from "@/constants/Colors";
import { useColorScheme } from "@/components/useColorScheme";
import { useFocusEffect } from "@react-navigation/native";
import Animated, { FadeInDown } from "react-native-reanimated";

export default function AnalyticsScreen() {
  const scheme = useColorScheme() ?? "dark";
  const c = Colors[scheme];

  const [cards, setCards] = useState(() => getCards());
  const [loans, setLoans] = useState(() => getLoans());
  const [baseScore, setBaseScore] = useState(() => getUserBaseScore());

  useFocusEffect(
    useCallback(() => {
      setCards(getCards());
      setLoans(getLoans());
      setBaseScore(getUserBaseScore());
    }, [])
  );

  const scoreModel = useMemo(
    () =>
      computeDynamicScore(baseScore, cards, loans, getPayments(), getLoanPayments()),
    [baseScore, cards, loans]
  );

  const payments = getPayments().slice(0, 8).reverse();
  const data = payments.map((p, idx) => ({ x: idx + 1, y: p.amount }));

  const factorLines = [
    { label: "Utilization", ...scoreModel.factors.utilization },
    { label: "Payments", ...scoreModel.factors.paymentHistory },
    { label: "Account age", ...scoreModel.factors.accountAge },
    { label: "Loans", ...scoreModel.factors.loans },
    { label: "Available credit", ...scoreModel.factors.availableCredit },
  ];

  return (
    <ScreenWrap>
      <Text style={[styles.title, { color: c.text }]}>Analytics</Text>

      <Animated.View entering={FadeInDown.delay(60)}>
        <GlassCard style={styles.scoreOverview}>
          <Text style={[styles.k, { color: c.tabIconDefault }]}>Estimated score</Text>
          <View style={styles.scoreBigRow}>
            <Text style={[styles.scoreBig, { color: c.text }]}>
              {scoreModel.currentScore ?? "—"}
            </Text>
            <View style={{ flex: 1 }}>
              <Text style={[styles.scoreMeta, { color: c.tabIconDefault }]}>
                Base {scoreModel.baseScore ?? "—"} · Activity{" "}
                <Text
                  style={{
                    fontWeight: "900",
                    color:
                      scoreModel.baseScore === null
                        ? c.tabIconDefault
                        : scoreModel.totalAdjustment >= 0
                          ? c.accentPositive
                          : "#DC2626",
                  }}
                >
                  {scoreModel.baseScore === null ? "—" : `${scoreModel.totalAdjustment >= 0 ? "+" : ""}${scoreModel.totalAdjustment}`}
                </Text>
              </Text>
              <Text style={[styles.scoreHint, { color: c.tabIconDefault }]}>
                Current = base + dynamic adjustments from your data.
              </Text>
            </View>
          </View>
          <Text style={[styles.subHead, { color: c.text }]}>Score factor impacts</Text>
          {factorLines.map((row, i) => (
            <View key={row.label} style={[styles.factorRow, { borderColor: c.border }]}>
              <Text style={[styles.factorLabel, { color: c.text }]}>{row.label}</Text>
              <Text
                style={[
                  styles.factorPts,
                  { color: row.impact >= 0 ? c.accentPositive : "#DC2626" },
                ]}
              >
                {row.impact >= 0 ? "+" : ""}
                {row.impact}
              </Text>
            </View>
          ))}
        </GlassCard>
      </Animated.View>

      <GlassCard>
        <Text style={[styles.k, { color: c.tabIconDefault }]}>Payment trend</Text>
        <View style={styles.barWrap}>
          {data.map((d) => (
            <View key={d.x} style={styles.barItem}>
              <View
                style={{
                  width: 16,
                  borderRadius: 8,
                  height: Math.max(8, d.y / 8),
                  backgroundColor: c.tint,
                }}
              />
            </View>
          ))}
        </View>
      </GlassCard>
      <GlassCard>
        <Text style={[styles.k, { color: c.tabIconDefault }]}>Recent Payments</Text>
        {payments.map((p) => (
          <Text key={p.id} style={[styles.row, { color: c.text }]}>
            {new Date(p.paid_at).toLocaleDateString()} • {p.card_name} • ${p.amount.toFixed(0)}
          </Text>
        ))}
      </GlassCard>
    </ScreenWrap>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 26, fontWeight: "800" },
  k: { fontSize: 12, fontWeight: "700", textTransform: "uppercase", marginBottom: 8 },
  row: { fontSize: 14, marginBottom: 8 },
  barWrap: { height: 190, flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between" },
  barItem: { flex: 1, alignItems: "center" },
  scoreOverview: { paddingVertical: 18 },
  scoreBigRow: { flexDirection: "row", alignItems: "center", gap: 14, marginBottom: 14 },
  scoreBig: { fontSize: 44, fontWeight: "900", minWidth: 108 },
  scoreMeta: { fontSize: 13, fontWeight: "600", lineHeight: 19 },
  scoreHint: { marginTop: 4, fontSize: 12, fontWeight: "600" },
  subHead: { fontSize: 15, fontWeight: "800", marginBottom: 8, marginTop: 4 },
  factorRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 8,
  },
  factorLabel: { fontSize: 14, fontWeight: "700" },
  factorPts: { fontSize: 15, fontWeight: "900" },
});
