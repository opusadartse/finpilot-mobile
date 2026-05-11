import { getLegalDisclaimerAccepted, setLegalDisclaimerAccepted } from "@/lib/db";

/**
 * First-launch disclaimer acceptance — persisted in SQLite `app_settings` only
 * (same storage as the rest of the app; survives reinstall only when DB is restored).
 */
export function isLegalDisclaimerAccepted(): boolean {
  return getLegalDisclaimerAccepted();
}

export function persistLegalDisclaimerAccepted(accepted: boolean): void {
  setLegalDisclaimerAccepted(accepted);
}
