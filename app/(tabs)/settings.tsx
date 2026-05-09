import { Alert, BackHandler, Platform, Pressable, StyleSheet, Text } from "react-native";
import { ScreenWrap } from "@/components/ScreenWrap";
import { GlassCard } from "@/components/GlassCard";
import { useFocusEffect } from "@react-navigation/native";
import { useCallback, useState } from "react";
import { getRiskProfile, setRiskProfile, type RiskProfileSetting } from "@/lib/db";

export default function SettingsScreen() {
  const [riskProfile, setRiskProfileState] = useState<RiskProfileSetting>(() => getRiskProfile());
  useFocusEffect(
    useCallback(() => {
      setRiskProfileState(getRiskProfile());
    }, [])
  );

  const exitApp = () => {
    Alert.alert("Exit FinPilot", "Created Bye Sam Faz 2026", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Exit",
        style: "destructive",
        onPress: () => {
          if (Platform.OS === "android") {
            BackHandler.exitApp();
          } else {
            Alert.alert("iOS Notice", "Apple does not allow apps to programmatically close. Swipe up to exit.");
          }
        },
      },
    ]);
  };

  const profileOptions: Array<{ id: RiskProfileSetting; label: string }> = [
    { id: "conservative", label: "Conservative" },
    { id: "balanced", label: "Balanced" },
    { id: "aggressive", label: "Aggressive" },
  ];

  return (
    <ScreenWrap>
      <Text style={styles.title}>About This App</Text>

      <GlassCard style={styles.riskCard}>
        <Text style={styles.cardTitle}>Risk Profile</Text>
        <Text style={styles.copy}>
          Choose how strict FinPilot should be when calculating risk across utilization, APR, credit limit, and account age.
        </Text>
        {profileOptions.map((option) => (
          <Pressable
            key={option.id}
            onPress={() => {
              setRiskProfile(option.id);
              setRiskProfileState(option.id);
            }}
            style={[styles.profileBtn, riskProfile === option.id ? styles.profileBtnActive : undefined]}
          >
            <Text style={[styles.profileText, riskProfile === option.id ? styles.profileTextActive : undefined]}>
              {option.label}
            </Text>
          </Pressable>
        ))}
      </GlassCard>

      <GlassCard style={styles.infoCard}>
        <Text style={styles.cardTitle}>Why FinPilot Exists</Text>
        <Text style={styles.copy}>
          FinPilot helps users improve credit management by tracking credit cards, utilization, loans, monthly payments, and 0% APR promotions in one intelligent financial dashboard.
        </Text>
        <Text style={styles.list}>• Track balances and utilization</Text>
        <Text style={styles.list}>• Manage loans and APR promotions</Text>
        <Text style={styles.list}>• Monitor estimated credit score impact</Text>
        <Text style={styles.list}>• Organize monthly payment priorities</Text>
        <Text style={styles.list}>• Avoid interest charges intelligently</Text>
        <Text style={styles.list}>• View financial analytics in real time</Text>
      </GlassCard>

      <GlassCard style={styles.devCard}>
        <Text style={styles.devKicker}>Designed & Developed By</Text>
        <Text style={styles.devTitle}>Sam Faz Corporation</Text>
        <Text style={styles.devYear}>2026</Text>
      </GlassCard>

      <Pressable style={styles.exitBtn} onPress={exitApp}>
        <Text style={styles.exitText}>Exit App</Text>
      </Pressable>
    </ScreenWrap>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 30, fontWeight: "900", color: "#0F172A", textAlign: "center", marginTop: 4, marginBottom: 4 },
  riskCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    padding: 18,
    borderWidth: 1,
    borderColor: "#DBEAFE",
    shadowColor: "#2563EB",
    shadowOpacity: 0.08,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 7 },
  },
  infoCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 28,
    padding: 24,
    borderWidth: 1,
    borderColor: "#E4E9F2",
    shadowColor: "#2563EB",
    shadowOpacity: 0.08,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
  },
  cardTitle: { fontSize: 24, fontWeight: "900", color: "#0F172A", marginBottom: 10, letterSpacing: -0.2 },
  copy: { fontSize: 17, lineHeight: 31, color: "#334155", fontWeight: "600", marginBottom: 12 },
  profileBtn: {
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 8,
    backgroundColor: "#FFFFFF",
  },
  profileBtnActive: {
    borderColor: "#2563EB",
    backgroundColor: "#DBEAFE",
  },
  profileText: { fontSize: 14, fontWeight: "700", color: "#334155" },
  profileTextActive: { color: "#1D4ED8" },
  list: { fontSize: 15, color: "#334155", fontWeight: "600", marginBottom: 8 },
  devCard: {
    backgroundColor: "#0F172A",
    borderRadius: 30,
    padding: 26,
  },
  devKicker: {
    fontSize: 14,
    color: "#93C5FD",
    fontWeight: "700",
    letterSpacing: 1.2,
    textTransform: "uppercase",
  },
  devTitle: { marginTop: 8, fontSize: 30, fontWeight: "900", color: "#FFFFFF" },
  devYear: { marginTop: 4, fontSize: 18, fontWeight: "800", color: "#CBD5E1" },
  exitBtn: {
    marginTop: 10,
    borderRadius: 14,
    paddingVertical: 13,
    alignItems: "center",
    backgroundColor: "#2563EB",
  },
  exitText: { color: "white", fontWeight: "800", fontSize: 15 },
});

