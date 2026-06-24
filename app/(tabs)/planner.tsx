import { StyleSheet, Text } from "react-native";
import { ScreenWrap } from "@/components/ScreenWrap";
import { GlassCard } from "@/components/GlassCard";
import { getCards } from "@/lib/db";
import Colors from "@/constants/Colors";
import { useColorScheme } from "@/components/useColorScheme";

export default function PlannerScreen() {
  const scheme = useColorScheme() ?? "dark";
  const c = Colors[scheme];
  const cards = getCards();
  const totalDebt = cards.reduce((s, x) => s + x.current_balance, 0);
  const minPay = cards.reduce((s, x) => s + x.min_payment, 0);

  const budget = Math.max(minPay + 140, 220);
  const estMonthsSnowball = Math.max(1, Math.ceil(totalDebt / budget));
  const estMonthsAvalanche = Math.max(1, Math.ceil(totalDebt / (budget * 1.08)));

  return (
    <ScreenWrap>
      <GlassCard style={styles.headerBanner}>
        <Text style={styles.headerTitle}>PAYOFF PLANNER</Text>
        <Text style={styles.headerSubtitle}>Compare payoff strategies with clean monthly targets</Text>
      </GlassCard>
      <GlassCard>
        <Text style={[styles.k, { color: c.tabIconDefault }]}>Monthly Budget</Text>
        <Text style={[styles.v, { color: c.text }]}>${budget.toFixed(0)}</Text>
      </GlassCard>
      <GlassCard>
        <Text style={[styles.plan, { color: "#111827" }]}>Snowball</Text>
        <Text style={[styles.copy, { color: c.tabIconDefault }]}>
          Focus smallest balance first for momentum.
        </Text>
        <Text style={[styles.months, { color: c.text }]}>{estMonthsSnowball} months</Text>
      </GlassCard>
      <GlassCard>
        <Text style={[styles.plan, { color: "#111827" }]}>Avalanche</Text>
        <Text style={[styles.copy, { color: c.tabIconDefault }]}>
          Focus highest APR first to reduce total interest.
        </Text>
        <Text style={[styles.months, { color: c.text }]}>{estMonthsAvalanche} months</Text>
      </GlassCard>
    </ScreenWrap>
  );
}

const styles = StyleSheet.create({
  headerBanner: { backgroundColor: "#3F4D63", borderColor: "#3F4D63" },
  headerTitle: { fontSize: 28, fontWeight: "900", color: "#FFFFFF", textAlign: "center", letterSpacing: 0.5 },
  headerSubtitle: { marginTop: 6, fontSize: 13, color: "rgba(255,255,255,0.86)", textAlign: "center", fontWeight: "600" },
  k: { fontSize: 12, fontWeight: "700", textTransform: "uppercase" },
  v: { marginTop: 6, fontSize: 30, fontWeight: "800" },
  plan: { fontSize: 18, fontWeight: "800" },
  copy: { marginTop: 6, fontSize: 13 },
  months: { marginTop: 10, fontSize: 26, fontWeight: "800" },
});

