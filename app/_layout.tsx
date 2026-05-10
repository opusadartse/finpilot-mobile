import { DarkTheme, DefaultTheme, ThemeProvider } from "@react-navigation/native";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import "react-native-reanimated";
import { initDb } from "@/lib/db";

import { useColorScheme } from "@/components/useColorScheme";

/** DB before first paint — avoids any deferral for dashboard reads */
initDb();

/** No fade-out when native splash hands off to React (instant transition). */
SplashScreen.setOptions({ fade: false, duration: 0 });

export { ErrorBoundary } from "expo-router";

export const unstable_settings = {
  initialRouteName: "(tabs)",
};

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="how-to-use" />
        <Stack.Screen name="legal-disclaimer" />
      </Stack>
    </ThemeProvider>
  );
}
