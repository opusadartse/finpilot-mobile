import { useCallback, useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useRouter } from "expo-router";
import { ScreenWrap } from "@/components/ScreenWrap";
import { GlassCard } from "@/components/GlassCard";
import {
  dashboardSummary,
  getCards,
  getLoanPayments,
  getPayments,
  getReminders,
  getRiskProfile,
  getUserBaseScore,
} from "@/lib/db";
import { calculateRisk, computeDynamicScore, getRiskBand, getRiskColor } from "@/lib/score";
import Colors from "@/constants/Colors";
import { useColorScheme } from "@/components/useColorScheme";
import { useFocusEffect } from "@react-navigation/native";

export default function DashboardScreen() {
  const router = useRouter();
  const scheme = useColorScheme() ?? "dark";
  const c = Colors[scheme];
  const [cards, setCards] = useState(() => getCards());
  const [summary, setSummary] = useState(() => dashboardSummary());
  const [baseScore, setBaseScore] = useState(() => getUserBaseScore());
  const [reminders, setReminders] = useState(() => getReminders());
  const [riskProfile, setRiskProfile] = useState(() => getRiskProfile());
  useFocusEffect(
    useCallback(() => {
      setCards(getCards());
      setSummary(dashboardSummary());
      setBaseScore(getUserBaseScore());
      setReminders(getReminders());
      setRiskProfile(getRiskProfile());
    }, [])
  );
  const totalDebt = summary.totalDebt;
  const totalCredit = summary.totalCredit;
  const util = totalCredit > 0 ? summary.cardDebt / totalCredit : 0;
  const scoreModel = useMemo(
    () =>
      computeDynamicScore(
        baseScore,
        cards,
        summary.loans,
        getPayments(),
        getLoanPayments()
      ),
    [baseScore, cards, summary.loans]
  );
  const trendAnchor = scoreModel.currentScore ?? 690;
  const trend = [0, 1, 2, 3, 4, 5].map((x) => ({
    x,
    y: Math.max(300, Math.min(850, trendAnchor - 22 + x * 6)),
  }));
  const trendPalette = ["#DBEAFE", "#BFDBFE", "#93C5FD", "#60A5FA", "#3B82F6", "#2563EB"];
  const riskModel = useMemo(() => {
    if (!cards.length) {
      const risk = calculateRisk(util * 100, 0, 0, 0, riskProfile);
      return { risk, band: getRiskBand(risk), color: getRiskColor(risk) };
    }
    const totals = cards.reduce(
      (acc, card) => {
        const ageYears = Math.max(0, (Date.now() - new Date(card.opening_date).getTime()) / (1000 * 60 * 60 * 24 * 365));
        return {
          limit: acc.limit + card.credit_limit,
          aprWeighted: acc.aprWeighted + card.apr * card.credit_limit,
          ageWeighted: acc.ageWeighted + ageYears * card.credit_limit,
        };
      },
      { limit: 0, aprWeighted: 0, ageWeighted: 0 }
    );
    const avgApr = totals.limit > 0 ? totals.aprWeighted / totals.limit : 0;
    const avgAge = totals.limit > 0 ? totals.ageWeighted / totals.limit : 0;
    const risk = calculateRisk(util * 100, avgAge, totals.limit, avgApr, riskProfile);
    return { risk, band: getRiskBand(risk), color: getRiskColor(risk) };
  }, [cards, util, riskProfile]);
  const reminderStats = useMemo(() => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const tomorrow = new Date(today.getTime() + 86400000);
    const toDay = (iso: string) => {
      const d = new Date(iso);
      return new Date(d.getFullYear(), d.getMonth(), d.getDate());
    };
    const overdue = reminders.filter((r) => r.is_paid === 0 && toDay(r.due_date).getTime() < today.getTime()).length;
    const dueTomorrow = reminders.filter((r) => r.is_paid === 0 && toDay(r.due_date).getTime() === tomorrow.getTime()).length;
    const dueSoon = reminders.filter((r) => {
      if (r.is_paid === 1) return false;
      const diff = (toDay(r.due_date).getTime() - today.getTime()) / 86400000;
      return diff >= 0 && diff <= 3;
    }).length;
    return { overdue, dueTomorrow, dueSoon };
  }, [reminders]);

  return (
    <ScreenWrap>
      <View style={styles.headerWrap}>
        <Text style={[styles.title, { color: c.text }]}>Credit Card Loans</Text>
        <Text style={[styles.sub, { color: c.tabIconDefault }]}>Created by Sam Faz Corporation 2026</Text>
      </View>

      <View style={styles.row}>
      <Animated.View entering={FadeInDown.delay(80)} style={styles.stat}>
        <GlassCard style={styles.statCard}>
          <Text style={[styles.k, { color: c.tabIconDefault }]}>Debt</Text>
          <Text style={[styles.v, { color: c.text }]}>${totalDebt.toFixed(0)}</Text>
          <Text style={[styles.note, { color: c.tabIconDefault }]}>
            Cards ${summary.cardDebt.toFixed(0)} • Loans ${summary.loanDebt.toFixed(0)}
          </Text>
        </GlassCard>
      </Animated.View>
      <Animated.View entering={FadeInDown.delay(140)} style={styles.stat}>
        <GlassCard style={styles.statCard}>
          <Text style={[styles.k, { color: c.tabIconDefault }]}>Utilization</Text>
          <Text style={[styles.v, { color: "#2563EB" }]}>{Math.round(util * 100)}%</Text>
          <Text style={[styles.note, { color: c.tabIconDefault }]}>Cards {summary.cards.length} • Loans {summary.loans.length}</Text>
        </GlassCard>
      </Animated.View>
      </View>

      <Animated.View entering={FadeInDown.delay(220)}>
        <GlassCard style={styles.scoreCard}>
          <View style={styles.scoreRow}>
            <View style={styles.scoreLeft}>
              <Text style={[styles.k, { color: c.tabIconDefault }]}>Estimated Score</Text>
              <Text
                style={[
                  styles.pos,
                  {
                    color:
                      scoreModel.baseScore === null
                        ? c.tabIconDefault
                        : scoreModel.totalAdjustment >= 0
                          ? c.accentPositive
                          : "#DC2626",
                  },
                ]}
              >
                {scoreModel.baseScore === null
                  ? "Set your score in Simulator"
                  : `${scoreModel.totalAdjustment >= 0 ? "+" : ""}${scoreModel.totalAdjustment} activity`}
              </Text>
            </View>
            <Text style={[styles.scoreCompact, { color: c.text }]}>
              {scoreModel.currentScore ?? "—"}
            </Text>
          </View>
          <Text style={[styles.riskLine, { color: riskModel.color }]}>
            Risk {riskModel.risk} · {riskModel.band.replace("_", " ").toUpperCase()} · {riskProfile.toUpperCase()}
          </Text>
        </GlassCard>
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(280)}>
        <GlassCard style={styles.trendCard}>
          <Text style={[styles.trendTitle, { color: c.text }]}>Score Trend</Text>
          <View style={styles.sparkWrap}>
            {trend.map((p) => (
              <View
                key={p.x}
                style={[
                  styles.sparkCol,
                  {
                    height: Math.max(18, (p.y - 300) / 3.2),
                    backgroundColor: trendPalette[p.x] ?? "#2563EB",
                  },
                ]}
              />
            ))}
          </View>
        </GlassCard>
      </Animated.View>

      {summary.endingSoonCount > 0 ? (
        <Animated.View entering={FadeInDown.delay(340)}>
          <GlassCard style={styles.alertCard}>
            <Text style={styles.alertTitle}>Interest-Free Alert</Text>
            <Text style={[styles.alert, { color: c.text }]}>
              {summary.endingSoonCount} promotion(s) ending soon. Increase monthly loan payments to avoid APR charges.
            </Text>
            {summary.endingSoonLoans.map((loan) => (
              <Text key={loan.id} style={[styles.loanRow, { color: "#7C2D12" }]}>
                {loan.name} • {loan.monthsLeft} mo • ${loan.balance.toFixed(0)} left
              </Text>
            ))}
            <Pressable style={styles.linkBtn} onPress={() => router.push("/(tabs)/loans")}>
              <Text style={styles.linkText}>Open Loans & Promotions</Text>
            </Pressable>
          </GlassCard>
        </Animated.View>
      ) : null}

      <Animated.View entering={FadeInDown.delay(380)}>
        <GlassCard style={[styles.reminderCard, reminderStats.overdue > 0 ? styles.reminderCardUrgent : undefined]}>
          <Text style={[styles.reminderTitle, { color: c.text }]}>Payment Reminders</Text>
          <Text style={[styles.reminderLine, { color: reminderStats.overdue > 0 ? "#B91C1C" : c.tabIconDefault }]}>
            {reminderStats.overdue > 0 ? `${reminderStats.overdue} overdue` : "No overdue reminders"}
          </Text>
          <Text style={[styles.reminderLine, { color: c.tabIconDefault }]}>
            {reminderStats.dueTomorrow > 0 ? `${reminderStats.dueTomorrow} due tomorrow` : "None due tomorrow"}
          </Text>
          <Text style={[styles.reminderLine, { color: c.tabIconDefault }]}>
            {reminderStats.dueSoon} due in the next 3 days
          </Text>
          <Pressable style={styles.linkBtn} onPress={() => router.push("/reminders" as any)}>
            <Text style={styles.linkText}>Open Reminders</Text>
          </Pressable>
        </GlassCard>
      </Animated.View>
    </ScreenWrap>
  );
}

const styles = StyleSheet.create({
  headerWrap: { alignItems: "center", marginBottom: 4, marginTop: 2 },
  title: { fontSize: 34, fontWeight: "900", letterSpacing: 0.2, textAlign: "center" },
  sub: { fontSize: 14, marginTop: 6, marginBottom: 4, textAlign: "center", fontWeight: "600" },
  row: { flexDirection: "row", gap: 12 },
  stat: { flex: 1 },
  statCard: { paddingVertical: 20 },
  scoreCard: { paddingVertical: 22 },
  trendCard: { paddingVertical: 20 },
  alertCard: { paddingVertical: 18, backgroundColor: "#FFF7ED", borderColor: "#FED7AA" },
  reminderCard: { paddingVertical: 18 },
  reminderCardUrgent: { backgroundColor: "#FEF2F2", borderColor: "#FECACA" },
  k: { fontSize: 14, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.75 },
  v: { fontSize: 40, fontWeight: "900", marginTop: 8 },
  note: { marginTop: 8, fontSize: 13, fontWeight: "600" },
  scoreRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  scoreLeft: { flex: 1, paddingRight: 10 },
  scoreCompact: { fontSize: 48, fontWeight: "900" },
  pos: { marginTop: 6, fontWeight: "800", fontSize: 16 },
  riskLine: { marginTop: 8, fontSize: 13, fontWeight: "800" },
  trendTitle: { fontSize: 24, fontWeight: "800", marginBottom: 12 },
  reminderTitle: { fontSize: 22, fontWeight: "800" },
  reminderLine: { marginTop: 8, fontSize: 15, fontWeight: "700" },
  alertTitle: { fontSize: 24, fontWeight: "900", color: "#B45309" },
  alert: { marginTop: 8, fontSize: 16, lineHeight: 23, fontWeight: "600" },
  loanRow: { marginTop: 8, fontSize: 14, fontWeight: "700" },
  linkBtn: {
    marginTop: 14,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
    backgroundColor: "#2563EB",
    shadowColor: "#2563EB",
    shadowOpacity: 0.22,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 5,
  },
  linkText: { fontSize: 16, fontWeight: "800", color: "#FFFFFF" },
  sparkWrap: {
    height: 182,
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    paddingTop: 2,
  },
  sparkCol: {
    width: 30,
    borderRadius: 14,
  },
});
