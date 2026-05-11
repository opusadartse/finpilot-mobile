import { useCallback, useRef, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { StatusBar } from "expo-status-bar";
import { LEGAL_DISCLAIMER_BODY } from "@/constants/legalDisclaimer";
import { persistLegalDisclaimerAccepted } from "@/lib/legalAcceptance";

type Props = {
  onAccepted: () => void;
};

export function FirstLaunchLegalDisclaimer({ onAccepted }: Props) {
  const insets = useSafeAreaInsets();
  const [agreed, setAgreed] = useState(false);
  const [saving, setSaving] = useState(false);
  const submitLock = useRef(false);

  const toggleAgree = useCallback(() => {
    Haptics.selectionAsync();
    setAgreed((v) => !v);
  }, []);

  const handleContinue = useCallback(() => {
    if (!agreed || submitLock.current) return;
    submitLock.current = true;
    setSaving(true);
    try {
      persistLegalDisclaimerAccepted(true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      onAccepted();
    } finally {
      submitLock.current = false;
      setSaving(false);
    }
  }, [agreed, onAccepted]);

  const footerPadBottom = Math.max(insets.bottom, 14);

  return (
    <SafeAreaView style={styles.safe} edges={["top", "left", "right", "bottom"]}>
      <StatusBar style="dark" />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        bounces={false}
        alwaysBounceVertical={false}
        overScrollMode="never"
      >
        <View style={styles.heroBand}>
          <Text style={styles.pageTitle}>Legal Disclaimer & Terms</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.body}>{LEGAL_DISCLAIMER_BODY}</Text>
        </View>
      </ScrollView>

      <View style={[styles.stickyFooter, { paddingBottom: footerPadBottom }]}>
        <Pressable
          onPress={toggleAgree}
          style={styles.checkboxRow}
          accessibilityRole="checkbox"
          accessibilityState={{ checked: agreed }}
        >
          <View style={[styles.checkboxOuter, agreed && styles.checkboxOuterOn]}>
            {agreed ? <Ionicons name="checkmark" size={16} color="#FFFFFF" /> : null}
          </View>
          <Text style={styles.checkboxLabel}>I agree to the Terms & Disclaimer</Text>
        </Pressable>

        <Pressable
          onPress={handleContinue}
          disabled={!agreed || saving}
          style={({ pressed }) => [
            styles.continueBtn,
            (!agreed || saving) && styles.continueBtnDisabled,
            pressed && agreed && !saving && styles.continueBtnPressed,
          ]}
        >
          {saving ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={[styles.continueText, (!agreed || saving) && styles.continueTextDisabled]}>Continue</Text>
          )}
        </Pressable>

        <Text style={styles.versionFooter}>Version 1.1</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#F1F5F9",
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 20,
    flexGrow: 1,
  },
  heroBand: {
    backgroundColor: "#3F4D63",
    borderRadius: 20,
    paddingVertical: 22,
    paddingHorizontal: 18,
    marginBottom: 16,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#3F4D63",
  },
  pageTitle: {
    fontSize: 22,
    fontWeight: "900",
    color: "#FFFFFF",
    textAlign: "center",
    letterSpacing: 0.2,
    lineHeight: 28,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    shadowColor: "#0F172A",
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  body: {
    fontSize: 15,
    lineHeight: 24,
    fontWeight: "500",
    color: "#334155",
    textAlign: "left",
  },
  stickyFooter: {
    paddingHorizontal: 20,
    paddingTop: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "#E2E8F0",
    backgroundColor: "#FFFFFF",
  },
  checkboxRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 14,
    paddingVertical: 4,
  },
  checkboxOuter: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: "#94A3B8",
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxOuterOn: {
    borderColor: "#3F4D63",
    backgroundColor: "#3F4D63",
  },
  checkboxLabel: {
    flex: 1,
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
    lineHeight: 22,
  },
  continueBtn: {
    minHeight: 52,
    borderRadius: 16,
    backgroundColor: "#3F4D63",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
    borderWidth: 1,
    borderColor: "#3F4D63",
  },
  continueBtnDisabled: {
    backgroundColor: "#CBD5E1",
    borderColor: "#CBD5E1",
    opacity: 0.85,
  },
  continueBtnPressed: {
    opacity: 0.92,
  },
  continueText: {
    fontSize: 17,
    fontWeight: "800",
    color: "#FFFFFF",
    letterSpacing: 0.3,
  },
  continueTextDisabled: {
    color: "#64748B",
  },
  versionFooter: {
    marginTop: 14,
    textAlign: "center",
    fontSize: 12,
    fontWeight: "600",
    color: "#94A3B8",
    letterSpacing: 0.2,
  },
});
