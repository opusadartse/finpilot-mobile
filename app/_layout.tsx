import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, View } from "react-native";
import { DarkTheme, DefaultTheme, ThemeProvider } from "@react-navigation/native";
import { Stack } from "expo-router";
import "react-native-reanimated";
import { initDb } from "@/lib/db";
import { isLegalDisclaimerAccepted } from "@/lib/legalAcceptance";
import { FirstLaunchLegalDisclaimer } from "@/components/FirstLaunchLegalDisclaimer";

import { useColorScheme } from "@/components/useColorScheme";

/** DB before first paint — avoids any deferral for dashboard reads */
initDb();

export { ErrorBoundary } from "expo-router";

export const unstable_settings = {
  initialRouteName: "(tabs)",
};

type Gate = "loading" | "disclaimer" | "app";

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [gate, setGate] = useState<Gate>("loading");

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const accepted = await isLegalDisclaimerAccepted();
      if (!cancelled) {
        setGate(accepted ? "app" : "disclaimer");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleDisclaimerAccepted = useCallback(() => {
    setGate("app");
  }, []);

  if (gate === "loading") {
    return (
      <View style={{ flex: 1, backgroundColor: "#0F172A", alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator size="large" color="#94A3B8" />
      </View>
    );
  }

  if (gate === "disclaimer") {
    return <FirstLaunchLegalDisclaimer onAccepted={handleDisclaimerAccepted} />;
  }

  return (
    <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="how-to-use" />
      </Stack>
    </ThemeProvider>
  );
}
