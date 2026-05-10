import { Pressable, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { ScreenWrap } from "@/components/ScreenWrap";

export default function HowToUseScreen() {
  const router = useRouter();

  return (
    <ScreenWrap>
      <Pressable onPress={() => router.back()} style={styles.back} accessibilityRole="button" accessibilityLabel="Go back">
        <Text style={styles.backText}>← Back</Text>
      </Pressable>

      <Text style={styles.title}>How to use FinPilot</Text>

      <View style={styles.block}>
        <Text style={styles.heading}>Credit cards</Text>
        <Text style={styles.body}>Add cards under Credit Card → New Card. Switch to Current Cards to track balances, utilization, payments, and edits.</Text>
      </View>

      <View style={styles.block}>
        <Text style={styles.heading}>Loans & promotions</Text>
        <Text style={styles.body}>Record installment balances and promotional APR windows so payoff targets stay accurate.</Text>
      </View>

      <View style={styles.block}>
        <Text style={styles.heading}>Planner & simulator</Text>
        <Text style={styles.body}>Use the planner for upcoming obligations and the simulator to explore score scenarios — estimates only.</Text>
      </View>
    </ScreenWrap>
  );
}

const styles = StyleSheet.create({
  back: { alignSelf: "flex-start", paddingVertical: 4 },
  backText: { fontSize: 16, fontWeight: "700", color: "#3F4D63" },
  title: { fontSize: 26, fontWeight: "900", color: "#111827", letterSpacing: 0.2 },
  block: { gap: 8 },
  heading: { fontSize: 16, fontWeight: "800", color: "#111827" },
  body: { fontSize: 15, fontWeight: "600", color: "#4B5563", lineHeight: 22 },
});
