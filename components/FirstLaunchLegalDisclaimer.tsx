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
import { setLegalDisclaimerAccepted } from "@/lib/db";

type Props = {
  onAccepted: () => void;
};

export function FirstLaunchLegalDisclaimer({ onAccepted }: Props) {
  const insets = useSafeAreaInsets();
  const [accepted, setAccepted] = useState(false);
  const [saving, setSaving] = useState(false);
  const submitLock = useRef(false);

  const toggleAccept = useCallback(() => {
    Haptics.selectionAsync();
    setAccepted((v) => !v);
  }, []);

  const handleContinue = useCallback(() => {
    if (!accepted || submitLock.current) return;
    submitLock.current = true;
    setSaving(true);
    try {
      setLegalDisclaimerAccepted(true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      onAccepted();
    } finally {
      submitLock.current = false;
      setSaving(false);
    }
  }, [accepted, onAccepted]);

  const footerBottom = Math.max(insets.bottom, 12) + 8;

  return (
    <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
      <StatusBar style="light" />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: 16 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.pageTitle}>Legal Disclaimer</Text>
        <Text style={styles.body}>{LEGAL_DISCLAIMER_BODY}</Text>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: footerBottom }]}>
        <Pressable
          onPress={toggleAccept}
          style={styles.checkboxRow}
          accessibilityRole="checkbox"
          accessibilityState={{ checked: accepted }}
        >
          <View style={[styles.checkboxOuter, accepted && styles.checkboxOuterOn]}>
            {accepted ? (
              <Ionicons name="checkmark" size={16} color="#0F172A" />
            ) : null}
          </View>
          <Text style={styles.checkboxLabel}>I accept the Terms & Conditions</Text>
        </Pressable>

        <Pressable
          onPress={handleContinue}
          disabled={!accepted || saving}
          style={({ pressed }) => [
            styles.continueBtn,
            (!accepted || saving) && styles.continueBtnDisabled,
            pressed && accepted && !saving && styles.continueBtnPressed,
          ]}
        >
          {saving ? (
            <ActivityIndicator color="#F8FAFC" />
          ) : (
            <Text style={[styles.continueText, (!accepted || saving) && styles.continueTextDisabled]}>Continue</Text>
          )}
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#0F172A",
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 22,
    paddingTop: 12,
  },
  pageTitle: {
    fontSize: 28,
    fontWeight: "900",
    color: "#F8FAFC",
    marginBottom: 18,
    letterSpacing: 0.3,
  },
  body: {
    fontSize: 15,
    lineHeight: 26,
    fontWeight: "600",
    color: "#94A3B8",
  },
  footer: {
    paddingHorizontal: 22,
    paddingTop: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "rgba(148,163,184,0.35)",
    backgroundColor: "#0F172A",
  },
  checkboxRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 18,
    paddingVertical: 4,
  },
  checkboxOuter: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: "#64748B",
    backgroundColor: "transparent",
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxOuterOn: {
    borderColor: "#94A3B8",
    backgroundColor: "#E2E8F0",
  },
  checkboxLabel: {
    flex: 1,
    fontSize: 16,
    fontWeight: "700",
    color: "#E2E8F0",
    lineHeight: 22,
  },
  continueBtn: {
    minHeight: 54,
    borderRadius: 16,
    backgroundColor: "#3F4D63",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
    borderWidth: 1,
    borderColor: "#475569",
  },
  continueBtnDisabled: {
    backgroundColor: "#1E293B",
    borderColor: "#334155",
    opacity: 0.55,
  },
  continueBtnPressed: {
    opacity: 0.92,
  },
  continueText: {
    fontSize: 17,
    fontWeight: "900",
    color: "#F8FAFC",
    letterSpacing: 0.4,
  },
  continueTextDisabled: {
    color: "#64748B",
  },
});
