import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

const SECTIONS: { title: string; bullets: string[] }[] = [
  {
    title: "Credit Cards",
    bullets: [
      "Track balances, APR, utilization, and account age.",
      "Add your credit cards manually.",
      "Monitor how balances affect your score.",
    ],
  },
  {
    title: "Loans & Promotions",
    bullets: [
      "Track 0% APR promotions and loan balances.",
      "Monitor payoff goals and expiration dates.",
    ],
  },
  {
    title: "Payment Reminders",
    bullets: ["Stay on top of due dates.", "Mark payments as paid.", "Prevent missed payments."],
  },
  {
    title: "Credit Simulator",
    bullets: [
      "Test financial scenarios before making decisions.",
      "Simulate utilization changes, new cards, loans, and payments.",
      "View estimated score movement and risk changes.",
    ],
  },
  {
    title: "Analytics",
    bullets: ["Review utilization trends and score factors.", "Understand what affects your profile most."],
  },
  {
    title: "Risk Score",
    bullets: [
      "Lower scores indicate healthier credit behavior.",
      "Higher scores indicate increased financial exposure.",
    ],
  },
];

export default function HowToUseScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const bottomPad = 24 + insets.bottom;

  return (
    <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: bottomPad }]}
        showsVerticalScrollIndicator={false}
      >
        <Pressable onPress={() => router.back()} style={styles.backRow} hitSlop={12}>
          <Ionicons name="chevron-back" size={22} color="#111827" />
          <Text style={styles.backText}>Back</Text>
        </Pressable>

        <Text style={styles.pageTitle}>How To Use This App</Text>

        {SECTIONS.map((section) => (
          <View key={section.title} style={styles.section}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            {section.bullets.map((line) => (
              <Text key={line} style={styles.bullet}>
                • {line}
              </Text>
            ))}
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#F3F5F8" },
  scroll: { paddingHorizontal: 20, paddingTop: 8 },
  backRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginBottom: 16,
    alignSelf: "flex-start",
  },
  backText: { fontSize: 16, fontWeight: "700", color: "#111827" },
  pageTitle: {
    fontSize: 26,
    fontWeight: "900",
    color: "#111827",
    marginBottom: 20,
    letterSpacing: 0.2,
  },
  section: { marginBottom: 22 },
  sectionTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: "#111827",
    marginBottom: 8,
  },
  bullet: {
    fontSize: 15,
    lineHeight: 24,
    fontWeight: "600",
    color: "#64748B",
    marginBottom: 6,
    paddingLeft: 4,
  },
});
