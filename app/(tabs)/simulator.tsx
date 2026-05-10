import { useCallback, useMemo, useState } from "react";
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { ScreenWrap } from "@/components/ScreenWrap";
import { GlassCard } from "@/components/GlassCard";
import {
  getCards,
  getLoans,
  getLoanPayments,
  getPayments,
  getRiskProfile,
  getUserBaseScore,
  setUserBaseScore,
} from "@/lib/db";
import {
  calculateRisk,
  getRiskBand,
  getRiskColor,
  projectScenarioScore,
  type ScoreScenario,
} from "@/lib/score";
import Colors from "@/constants/Colors";
import { useColorScheme } from "@/components/useColorScheme";
import Animated, { FadeInDown, useAnimatedStyle, useSharedValue, withSpring } from "react-native-reanimated";
import { useFocusEffect } from "@react-navigation/native";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";

const scenarios: { id: ScoreScenario; label: string }[] = [
  { id: "open_new_card", label: "Open new card" },
  { id: "pay_down", label: "Pay down balance" },
  { id: "util_up", label: "Utilization up" },
  { id: "util_down", label: "Utilization down" },
  { id: "missed_payment", label: "Missed payment" },
];

const scenarioIcons: Record<ScoreScenario, keyof typeof Ionicons.glyphMap> = {
  base: "analytics-outline",
  open_new_card: "card-outline",
  pay_down: "arrow-down-circle-outline",
  util_up: "trending-up-outline",
  util_down: "trending-down-outline",
  missed_payment: "alert-circle-outline",
};

export default function SimulatorScreen() {
  const router = useRouter();
  const scheme = useColorScheme() ?? "dark";
  const c = Colors[scheme];

  const [cards, setCards] = useState(() => getCards());
  const [loans, setLoans] = useState(() => getLoans());
  const [cardPayments, setCardPayments] = useState(() => getPayments());
  const [loanPayments, setLoanPayments] = useState(() => getLoanPayments());
  const [baseScore, setBaseScore] = useState<number | null>(() => getUserBaseScore());
  const [riskProfile, setRiskProfile] = useState(() => getRiskProfile());

  const [scenario, setScenario] = useState<ScoreScenario>("open_new_card");
  const [scoreModalOpen, setScoreModalOpen] = useState(false);
  const [scoreDraft, setScoreDraft] = useState("");
  const [scoreError, setScoreError] = useState("");

  const glow = useSharedValue(0);
  const glowStyle = useAnimatedStyle(() => ({
    transform: [{ scale: withSpring(glow.value ? 0.98 : 1) }],
    opacity: withSpring(glow.value ? 0.92 : 1),
  }));

  useFocusEffect(
    useCallback(() => {
      setCards(getCards());
      setLoans(getLoans());
      setCardPayments(getPayments());
      setLoanPayments(getLoanPayments());
      setBaseScore(getUserBaseScore());
      setRiskProfile(getRiskProfile());
    }, [])
  );

  const projection = useMemo(
    () => projectScenarioScore(baseScore, cards, loans, cardPayments, loanPayments, scenario),
    [baseScore, cards, loans, cardPayments, loanPayments, scenario]
  );

  const adjustmentShift =
    projection.projected.totalAdjustment - projection.baseline.totalAdjustment;
  const riskModel = useMemo(() => {
    if (!cards.length) {
      const risk = calculateRisk(projection.baseline.utilization * 100, 0, 0, 0, riskProfile);
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
    const risk = calculateRisk(
      projection.baseline.utilization * 100,
      avgAge,
      totals.limit,
      avgApr,
      riskProfile
    );
    return { risk, band: getRiskBand(risk), color: getRiskColor(risk) };
  }, [cards, projection.baseline.utilization, riskProfile]);

  const openScoreModal = () => {
    setScoreDraft(baseScore !== null ? String(baseScore) : "");
    setScoreError("");
    setScoreModalOpen(true);
    Haptics.selectionAsync();
  };

  const saveBaseScore = () => {
    const n = Number.parseInt(scoreDraft.replace(/[^\d]/g, ""), 10);
    if (!Number.isFinite(n) || n < 300 || n > 850) {
      setScoreError("Enter a whole number between 300 and 850.");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }
    setUserBaseScore(n);
    setBaseScore(getUserBaseScore());
    setScoreModalOpen(false);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const factorRows = [
    {
      title: "Utilization impact",
      impact: projection.baseline.factors.utilization.impact,
      summary: projection.baseline.factors.utilization.summary,
    },
    {
      title: "Payment history impact",
      impact: projection.baseline.factors.paymentHistory.impact,
      summary: projection.baseline.factors.paymentHistory.summary,
    },
    {
      title: "Account age impact",
      impact: projection.baseline.factors.accountAge.impact,
      summary: projection.baseline.factors.accountAge.summary,
    },
    {
      title: "Loan impact",
      impact: projection.baseline.factors.loans.impact,
      summary: projection.baseline.factors.loans.summary,
    },
    {
      title: "Available credit impact",
      impact: projection.baseline.factors.availableCredit.impact,
      summary: projection.baseline.factors.availableCredit.summary,
    },
  ];

  return (
    <ScreenWrap>
      <View style={styles.headerBanner}>
        <Text style={styles.headerTitle}>CREDIT SIMULATOR</Text>
        <Text style={styles.headerSubtitle}>Model estimated score movement before making decisions</Text>
      </View>

      <Animated.View entering={FadeInDown.delay(40)}>
        <GlassCard>
          <Pressable
            onPress={() => {
              Haptics.selectionAsync();
              router.push("/(tabs)/payments");
            }}
            style={[styles.linkRow, { borderColor: c.border }]}
          >
            <View style={styles.rowLeft}>
              <Ionicons name="wallet-outline" size={18} color="#374151" />
              <Text style={[styles.linkTitle, { color: c.text }]}>My Payments</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#6B7280" />
          </Pressable>

          <Pressable
            onPress={openScoreModal}
            style={[styles.primaryOutlineBtn, { borderColor: "#DADADA" }]}
          >
            <View style={styles.rowLeft}>
              <Ionicons name="help-circle-outline" size={18} color="#374151" />
              <Text style={[styles.primaryOutlineText, { color: "#111827" }]}>
                What&apos;s Your Current Credit Score?
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#6B7280" />
          </Pressable>

          <Text style={[styles.baseHint, { color: c.tabIconDefault }]}>
            {baseScore !== null ? (
              <>
                Base score saved: <Text style={{ fontWeight: "800", color: c.text }}>{baseScore}</Text>
                {" · "}
                Activity adjustment{" "}
                <Text
                  style={{
                    fontWeight: "800",
                    color:
                      projection.baseline.totalAdjustment >= 0 ? c.accentPositive : "#DC2626",
                  }}
                >
                  {projection.baseline.totalAdjustment >= 0 ? "+" : ""}
                  {projection.baseline.totalAdjustment}
                </Text>
              </>
            ) : (
              "Enter your real score once — FinPilot estimates changes from your activity."
            )}
          </Text>
        </GlassCard>
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(55)}>
        <GlassCard style={{ marginTop: 10 }}>
          <Text style={[styles.label, { color: c.tabIconDefault }]}>Estimated result</Text>
          {baseScore !== null ? (
            <Text style={[styles.score, { color: c.text }]}>
              {projection.baseline.currentScore} → {projection.projected.currentScore}
            </Text>
          ) : (
            <Text style={[styles.scoreMuted, { color: c.tabIconDefault }]}>
              Set a base score to see FICO-style totals. Scenario adjustment shift:{" "}
              <Text style={{ fontWeight: "900", color: c.text }}>
                {adjustmentShift >= 0 ? "+" : ""}
                {adjustmentShift}
              </Text>
            </Text>
          )}
          {baseScore !== null ? (
            <Text
              style={[
                styles.delta,
                { color: projection.diff >= 0 ? c.accentPositive : "#DC2626" },
              ]}
            >
              {projection.diff >= 0 ? "+" : ""}
              {projection.diff}
            </Text>
          ) : (
            <Text style={[styles.deltaHint, { color: c.tabIconDefault }]}>
              Points shown after you save your real score (300–850).
            </Text>
          )}
          <Text
            style={[
              styles.pill,
              {
                color:
                  baseScore === null
                    ? c.tabIconDefault
                    : projection.diff >= 0
                      ? c.accentPositive
                      : "#DC2626",
              },
            ]}
          >
            {baseScore === null
              ? "Save a base score to quantify point changes"
              : projection.diff >= 0
                ? "Positive movement expected"
                : "Short-term drop expected"}
          </Text>
          <Text style={[styles.reason, { color: c.tabIconDefault }]}>{projection.reason}</Text>
          <View style={[styles.riskPill, { borderColor: riskModel.color, backgroundColor: `${riskModel.color}1A` }]}>
            <Text style={[styles.riskPillText, { color: riskModel.color }]}>
              Risk Score {riskModel.risk} · {riskModel.band.replace("_", " ").toUpperCase()} · {riskProfile.toUpperCase()}
            </Text>
          </View>
        </GlassCard>
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(70)}>
        <GlassCard style={{ marginTop: 2 }}>
          <Text style={[styles.label, { color: c.tabIconDefault }]}>Scenario</Text>
          <View style={styles.outlineMenuItem}>
            <View style={styles.rowLeft}>
              <Ionicons name="speedometer-outline" size={18} color="#374151" />
              <Text style={styles.menuText}>Credit Simulator</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#6B7280" />
          </View>
          {scenarios.map((s) => (
            <Animated.View key={s.id} style={scenario === s.id ? glowStyle : undefined}>
              <Pressable
                onPressIn={() => (glow.value = 1)}
                onPressOut={() => (glow.value = 0)}
                onPress={() => {
                  Haptics.selectionAsync();
                  setScenario(s.id);
                }}
                style={[
                  styles.outlineMenuItem,
                  scenario === s.id ? styles.menuActive : undefined,
                ]}
              >
                <View style={styles.rowLeft}>
                  <Ionicons name={scenarioIcons[s.id]} size={18} color="#374151" />
                  <Text style={styles.menuText}>{s.label}</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color="#6B7280" />
              </Pressable>
            </Animated.View>
          ))}
        </GlassCard>
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(110)}>
        <GlassCard style={{ marginTop: 10 }}>
          <Text style={[styles.label, { color: c.tabIconDefault }]}>Score Factors</Text>
          <Text style={[styles.factorIntro, { color: c.tabIconDefault }]}>
            Dynamic adjustments applied to your base score from real account behavior.
          </Text>
          {factorRows.map((row, i) => (
            <Animated.View
              key={row.title}
              entering={FadeInDown.delay(80 + i * 45)}
              style={[styles.factorBlock, { borderColor: c.border }]}
            >
              <View style={styles.factorHeader}>
                <Text style={[styles.factorTitle, { color: c.text }]}>{row.title}</Text>
                <Text
                  style={[
                    styles.factorImpact,
                    { color: row.impact >= 0 ? c.accentPositive : "#DC2626" },
                  ]}
                >
                  {row.impact >= 0 ? "+" : ""}
                  {row.impact}
                </Text>
              </View>
              <Text style={[styles.factorSummary, { color: c.tabIconDefault }]}>{row.summary}</Text>
            </Animated.View>
          ))}
        </GlassCard>
      </Animated.View>

      <Modal visible={scoreModalOpen} animationType="fade" transparent>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={styles.modalBackdrop}
        >
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setScoreModalOpen(false)} />
          <Animated.View entering={FadeInDown.duration(280)} style={styles.modalCardWrap}>
            <GlassCard style={styles.modalCard}>
              <Text style={[styles.modalTitle, { color: c.text }]}>Your credit score</Text>
              <Text style={[styles.modalSub, { color: c.tabIconDefault }]}>
                Enter your current score (300–850). This becomes your base for all estimates.
              </Text>
              <TextInput
                value={scoreDraft}
                onChangeText={(t) => {
                  setScoreDraft(t.replace(/[^\d]/g, ""));
                  setScoreError("");
                }}
                keyboardType="number-pad"
                maxLength={3}
                placeholder="e.g. 720"
                placeholderTextColor={c.tabIconDefault}
                style={[styles.modalInput, { color: c.text, borderColor: c.border }]}
              />
              {scoreError ? <Text style={styles.modalErr}>{scoreError}</Text> : null}
              <View style={styles.modalActions}>
                <Pressable onPress={() => setScoreModalOpen(false)} style={styles.modalGhost}>
                  <Text style={[styles.modalGhostText, { color: c.tabIconDefault }]}>Cancel</Text>
                </Pressable>
                <Pressable onPress={saveBaseScore} style={styles.modalSaveWrap}>
                  <LinearGradient
                    colors={["#3F4D63", "#334155"]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.modalSave}
                  >
                    <Text style={styles.modalSaveText}>Save score</Text>
                  </LinearGradient>
                </Pressable>
              </View>
            </GlassCard>
          </Animated.View>
        </KeyboardAvoidingView>
      </Modal>
    </ScreenWrap>
  );
}

const styles = StyleSheet.create({
  headerBanner: {
    borderRadius: 20,
    paddingVertical: 22,
    paddingHorizontal: 20,
    backgroundColor: "#3F4D63",
    marginTop: 4,
  },
  headerTitle: { fontSize: 28, fontWeight: "900", color: "#FFFFFF", textAlign: "center", letterSpacing: 0.5 },
  headerSubtitle: { fontSize: 14, marginTop: 8, color: "rgba(255,255,255,0.86)", textAlign: "center", fontWeight: "600" },
  label: { fontSize: 12, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.7 },
  linkRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 14,
    marginBottom: 12,
    borderColor: "#DADADA",
    backgroundColor: "#FFFFFF",
    shadowColor: "#111827",
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  rowLeft: { flexDirection: "row", alignItems: "center", gap: 10 },
  linkTitle: { fontSize: 16, fontWeight: "800" },
  primaryOutlineBtn: {
    borderWidth: 1,
    borderRadius: 18,
    paddingVertical: 14,
    paddingHorizontal: 14,
    alignItems: "center",
    justifyContent: "space-between",
    flexDirection: "row",
    marginBottom: 10,
    backgroundColor: "#FFFFFF",
    borderColor: "#DADADA",
    shadowColor: "#111827",
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  primaryOutlineText: { fontSize: 15, fontWeight: "800" },
  baseHint: { fontSize: 13, lineHeight: 19, fontWeight: "600" },
  outlineMenuItem: {
    marginTop: 8,
    borderWidth: 1,
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderColor: "#DADADA",
    backgroundColor: "#FFFFFF",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    shadowColor: "#111827",
    shadowOpacity: 0.03,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  menuText: { color: "#111827", fontWeight: "700", fontSize: 15 },
  menuActive: { backgroundColor: "#F8FAFC", borderColor: "#CBD5E1" },
  factorIntro: { fontSize: 13, marginBottom: 10, lineHeight: 18, fontWeight: "600" },
  factorBlock: {
    marginTop: 10,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 14,
    borderWidth: 1,
    backgroundColor: "#FFFFFF",
  },
  factorHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  factorTitle: { fontSize: 14, fontWeight: "800", flex: 1, paddingRight: 10 },
  factorImpact: { fontSize: 16, fontWeight: "900" },
  factorSummary: { marginTop: 6, fontSize: 12, lineHeight: 17, fontWeight: "600" },
  score: { marginTop: 8, fontSize: 38, fontWeight: "800" },
  scoreMuted: { marginTop: 8, fontSize: 16, lineHeight: 24, fontWeight: "600" },
  delta: { marginTop: 4, fontSize: 22, fontWeight: "800" },
  deltaHint: { marginTop: 6, fontSize: 13, fontWeight: "600" },
  pill: { marginTop: 2, fontSize: 12, fontWeight: "700" },
  reason: { marginTop: 6, fontSize: 13, lineHeight: 18 },
  riskPill: {
    marginTop: 10,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    alignSelf: "flex-start",
  },
  riskPillText: { fontSize: 12, fontWeight: "800" },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(15,23,42,0.55)",
    justifyContent: "center",
    padding: 22,
  },
  modalCardWrap: { width: "100%", maxWidth: 440, alignSelf: "center" },
  modalCard: { paddingVertical: 22 },
  modalTitle: { fontSize: 22, fontWeight: "900", textAlign: "center" },
  modalSub: { marginTop: 8, fontSize: 13, lineHeight: 19, textAlign: "center", fontWeight: "600" },
  modalInput: {
    marginTop: 16,
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 20,
    fontWeight: "700",
  },
  modalErr: { marginTop: 8, color: "#DC2626", fontWeight: "700", fontSize: 13 },
  modalActions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 18,
    alignItems: "center",
    justifyContent: "flex-end",
  },
  modalGhost: { paddingVertical: 10, paddingHorizontal: 12 },
  modalGhostText: { fontWeight: "700", fontSize: 15 },
  modalSaveWrap: { borderRadius: 14, overflow: "hidden" },
  modalSave: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 14,
    alignItems: "center",
  },
  modalSaveText: { color: "#FFFFFF", fontWeight: "900", fontSize: 16 },
});
