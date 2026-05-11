import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

const sections = [
  {
    title: "Credit Cards",
    content:
      "Use the Credit Cards section to track balances, APR, utilization, and monthly purchases. Add each card manually and monitor how your balances affect your estimated score. Purchases added during the month automatically increase your card balance and utilization percentage. Payments reduce the remaining balance in real time.",
  },
  {
    title: "Plans",
    content:
      "Plans help you organize payoff goals and monthly targets. Create custom payment strategies to reduce balances faster, avoid interest, and stay on track. You can compare different payment approaches and monitor your progress over time.",
  },
  {
    title: "Loans & Promotions",
    content:
      "Track personal loans, balance transfers, and promotional 0% APR offers. FinPilot alerts you when promotions are ending soon so you can avoid high interest charges. Monitor monthly targets and remaining payoff time in one place.",
  },
  {
    title: "Payment History",
    content:
      "Payment History stores every payment recorded inside the app. You can review previous payments, remaining balances after each payment, and overall payoff progress. This section helps you stay organized and verify payment activity over time.",
  },
  {
    title: "Reminders",
    content:
      "Create payment reminders for cards and loans. Choose repeat monthly reminders, due dates, and notes. FinPilot can automatically suggest payment amounts based on minimum payments, full payments, or interest-free payoff goals.",
  },
  {
    title: "Simulator",
    content:
      "The Simulator estimates how different actions may affect your credit profile. Test utilization changes, opening new accounts, reducing balances, increasing limits, or paying off debt before making real financial decisions.",
  },
  {
    title: "Insights",
    content:
      "Insights analyzes your utilization, debt levels, account age, APR exposure, and overall risk profile. Depending on your selected strategy (Conservative, Balanced, or Aggressive), FinPilot provides different recommendations to help improve your financial position.",
  },
  {
    title: "Estimated Credit Score",
    content:
      "FinPilot provides an estimated score based on the information entered in the app. This is not an official FICO or credit bureau score. It is designed to help visualize trends and understand how financial behavior may impact your profile over time.",
  },
  {
    title: "Security & Privacy",
    content:
      "FinPilot does not require Social Security Numbers, bank logins, or full credit card numbers. Users should never store sensitive personal information inside the app. All data entered is managed locally by the user and should be used responsibly.",
  },
];

export default function HowToUseScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const toggleSection = (index: number) => {
    if (openIndex === index) {
      setOpenIndex(null);
    } else {
      setOpenIndex(index);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={["top", "left", "right", "bottom"]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: 32 + insets.bottom }]}
        keyboardShouldPersistTaps="handled"
      >
        <Pressable
          onPress={() => router.back()}
          style={styles.back}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <Text style={styles.backText}>← Back</Text>
        </Pressable>

        <View style={styles.headerCard}>
          <Text style={styles.headerTitle}>HOW TO USE</Text>
          <Text style={styles.headerSubtitle}>Learn how every part of FinPilot works</Text>
        </View>

        <View style={styles.infoCard}>
          <Text style={styles.welcomeTitle}>Welcome to FinPilot</Text>

          <Text style={styles.welcomeText}>
            FinPilot helps you track balances, utilization, loans, payments, reminders, and estimated credit score
            activity in one place.
          </Text>

          <Text style={styles.versionText}>Version 1.2</Text>
        </View>

        {sections.map((section, index) => {
          const isOpen = openIndex === index;

          return (
            <View key={section.title} style={styles.sectionCard}>
              <Pressable
                style={({ pressed }) => [styles.sectionButton, pressed && styles.sectionButtonPressed]}
                onPress={() => toggleSection(index)}
              >
                <Text style={styles.sectionTitle}>{section.title}</Text>

                <Ionicons name={isOpen ? "chevron-up" : "chevron-down"} size={24} color="#24344D" />
              </Pressable>

              {isOpen ? (
                <View style={styles.contentContainer}>
                  <Text style={styles.contentText}>{section.content}</Text>
                </View>
              ) : null}
            </View>
          );
        })}

        <View style={styles.footerCard}>
          <Text style={styles.footerText}>
            FinPilot is designed for educational and organizational purposes. Always verify financial decisions
            independently.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F4F5F9",
  },
  back: {
    alignSelf: "flex-start",
    marginBottom: 8,
    paddingVertical: 6,
  },
  backText: {
    fontSize: 16,
    fontWeight: "800",
    color: "#3F4D63",
  },
  scrollContent: {
    padding: 20,
  },
  headerCard: {
    backgroundColor: "#44556F",
    borderRadius: 28,
    paddingVertical: 34,
    paddingHorizontal: 24,
    marginBottom: 20,
  },
  headerTitle: {
    color: "#FFFFFF",
    fontSize: 36,
    fontWeight: "900",
    textAlign: "center",
  },
  headerSubtitle: {
    color: "#E5E7EB",
    fontSize: 18,
    fontWeight: "700",
    textAlign: "center",
    marginTop: 10,
    lineHeight: 24,
  },
  infoCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 26,
    padding: 24,
    marginBottom: 20,
  },
  welcomeTitle: {
    fontSize: 28,
    fontWeight: "900",
    color: "#111827",
    marginBottom: 14,
  },
  welcomeText: {
    fontSize: 18,
    lineHeight: 28,
    color: "#5B6475",
    fontWeight: "600",
  },
  versionText: {
    marginTop: 20,
    fontSize: 18,
    fontWeight: "800",
    color: "#24344D",
  },
  sectionCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    marginBottom: 18,
    overflow: "hidden",
  },
  sectionButton: {
    paddingVertical: 24,
    paddingHorizontal: 22,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  sectionButtonPressed: {
    opacity: 0.92,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: "900",
    color: "#111827",
    flex: 1,
    paddingRight: 16,
  },
  contentContainer: {
    paddingHorizontal: 22,
    paddingBottom: 24,
  },
  contentText: {
    fontSize: 17,
    lineHeight: 29,
    color: "#5B6475",
    fontWeight: "600",
  },
  footerCard: {
    marginTop: 10,
    marginBottom: 24,
    padding: 24,
    borderRadius: 24,
    backgroundColor: "#FFFFFF",
  },
  footerText: {
    fontSize: 16,
    lineHeight: 26,
    color: "#6B7280",
    textAlign: "center",
    fontWeight: "600",
  },
});
