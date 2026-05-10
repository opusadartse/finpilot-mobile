import { useCallback, useState } from "react";
import { DarkTheme, DefaultTheme, ThemeProvider } from "@react-navigation/native";
import { Stack } from "expo-router";
import "react-native-reanimated";
import { getLegalDisclaimerAccepted, initDb } from "@/lib/db";
import { FirstLaunchLegalDisclaimer } from "@/components/FirstLaunchLegalDisclaimer";

import { useColorScheme } from "@/components/useColorScheme";

/** DB before first paint — avoids any deferral for dashboard reads */
initDb();

export { ErrorBoundary } from "expo-router";

export const unstable_settings = {
  initialRouteName: "(tabs)",
};

type Gate = "disclaimer" | "app";

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [gate, setGate] = useState<Gate>(() => (getLegalDisclaimerAccepted() ? "app" : "disclaimer"));

  const handleDisclaimerAccepted = useCallback(() => {
    setGate("app");
  }, []);

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
