import AsyncStorage from "@react-native-async-storage/async-storage";
import { LEGAL_ACCEPTANCE_STORAGE_KEY } from "@/constants/legalDisclaimer";
import { getLegalDisclaimerAccepted as getLegalDisclaimerAcceptedFromDb } from "@/lib/db";

/**
 * Primary persistence for first-launch disclaimer (AsyncStorage).
 * Migrates from legacy SQLite row once if AsyncStorage was never set.
 */
export async function isLegalDisclaimerAccepted(): Promise<boolean> {
  try {
    const stored = await AsyncStorage.getItem(LEGAL_ACCEPTANCE_STORAGE_KEY);
    if (stored !== null) {
      return stored === "true";
    }
    const legacy = getLegalDisclaimerAcceptedFromDb();
    if (legacy) {
      await AsyncStorage.setItem(LEGAL_ACCEPTANCE_STORAGE_KEY, "true");
    }
    return legacy;
  } catch {
    return getLegalDisclaimerAcceptedFromDb();
  }
}

export async function persistLegalDisclaimerAccepted(accepted: boolean): Promise<void> {
  await AsyncStorage.setItem(LEGAL_ACCEPTANCE_STORAGE_KEY, accepted ? "true" : "false");
}
