import { Pressable, ScrollView, StyleSheet, Text } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

const BODY = `This application is designed for educational and financial organization purposes only.

We do not provide financial, banking, lending, legal, or credit repair advice.

Users are responsible for any information entered into the application.

Do NOT enter:
• Full credit card numbers
• Bank passwords
• Social security numbers
• Sensitive financial credentials

This app does not require real credit card account access.

The developer is not responsible for:
• User financial decisions
• Incorrect data entered
• Loss of funds
• Credit score changes
• Identity theft
• Misuse of the application
• Third-party access to user-entered data

All score simulations are estimates only and are not official FICO®, Experian®, Equifax®, or TransUnion® scores.

By using this app, users accept full responsibility for how they use the application.`;

export default function LegalDisclaimerScreen() {
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

        <Text style={styles.pageTitle}>Legal & Disclaimer</Text>
        <Text style={styles.body}>{BODY}</Text>
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
    marginBottom: 18,
    letterSpacing: 0.2,
  },
  body: {
    fontSize: 15,
    lineHeight: 26,
    fontWeight: "600",
    color: "#64748B",
  },
});
