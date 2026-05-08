import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import 'react-native-reanimated';
import { initDb } from "@/lib/db";

import { useColorScheme } from '@/components/useColorScheme';

export {
  // Catch any errors thrown by the Layout component.
  ErrorBoundary,
} from 'expo-router';

export const unstable_settings = {
  // Ensure that reloading on `/modal` keeps a back button present.
  initialRouteName: '(tabs)',
};

export default function RootLayout() {
  const [loaded, error] = useFonts({
    Inter: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });

  // Expo Router uses Error Boundaries to catch errors in the navigation tree.
  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    if (loaded) {
      initDb();
    }
  }, [loaded]);

  if (!loaded) {
    return <View style={styles.startupBlank} />;
  }

  return <RootLayoutNav />;
}

function RootLayoutNav() {
  const colorScheme = useColorScheme();
  const [showIntro, setShowIntro] = useState(true);
  const opacity = useRef(new Animated.Value(0)).current;
  const p1 = useRef(new Animated.Value(0)).current;
  const p2 = useRef(new Animated.Value(0)).current;
  const p3 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(opacity, { toValue: 1, duration: 650, useNativeDriver: true }).start();
    const float = (v: Animated.Value, delay: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.timing(v, { toValue: 1, duration: 2600, delay, useNativeDriver: true }),
          Animated.timing(v, { toValue: 0, duration: 2600, useNativeDriver: true }),
        ])
      ).start();
    float(p1, 0);
    float(p2, 500);
    float(p3, 1000);
    const timeout = setTimeout(() => {
      Animated.timing(opacity, { toValue: 0, duration: 450, useNativeDriver: true }).start(() => setShowIntro(false));
    }, 10000);
    return () => clearTimeout(timeout);
  }, [opacity, p1, p2, p3]);

  const dismissIntro = () => {
    Animated.timing(opacity, { toValue: 0, duration: 350, useNativeDriver: true }).start(() => setShowIntro(false));
  };

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <View style={{ flex: 1 }}>
        <Stack>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        </Stack>
        {showIntro ? (
          <Pressable onPress={dismissIntro} style={introStyles.wrap}>
            <Animated.View style={[introStyles.overlay, { opacity }]}>
              <Animated.View style={[introStyles.particle, introStyles.p1, { opacity: p1.interpolate({ inputRange: [0, 1], outputRange: [0.2, 0.55] }), transform: [{ translateY: p1.interpolate({ inputRange: [0, 1], outputRange: [0, -14] }) }] }]} />
              <Animated.View style={[introStyles.particle, introStyles.p2, { opacity: p2.interpolate({ inputRange: [0, 1], outputRange: [0.15, 0.45] }), transform: [{ translateY: p2.interpolate({ inputRange: [0, 1], outputRange: [0, -10] }) }] }]} />
              <Animated.View style={[introStyles.particle, introStyles.p3, { opacity: p3.interpolate({ inputRange: [0, 1], outputRange: [0.18, 0.5] }), transform: [{ translateY: p3.interpolate({ inputRange: [0, 1], outputRange: [0, -12] }) }] }]} />
              <View style={introStyles.card}>
                <Text style={introStyles.kicker}>SMART CREDIT MANAGEMENT</Text>
                <Text style={introStyles.byline}>DESIGNED & DEVELOPED BY</Text>
                <View style={introStyles.titleWrap}>
                  <View style={introStyles.titleGlow} />
                  <Text style={introStyles.title}>FinPilot</Text>
                </View>
                <Text style={introStyles.body}>
                  Improve your credit score, track cards, and manage promotions intelligently.
                </Text>
                <Text style={introStyles.footer}>2026</Text>
                <Text style={introStyles.footerSubtle}>Designed & Developed by Sam Faz Corporation 2026</Text>
                <Pressable onPress={dismissIntro} style={introStyles.ctaWrap}>
                  <LinearGradient colors={["#0F172A", "#1E3A8A"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={introStyles.cta}>
                    <Text style={introStyles.ctaText}>Tap To Continue</Text>
                  </LinearGradient>
                </Pressable>
              </View>
            </Animated.View>
          </Pressable>
        ) : null}
      </View>
    </ThemeProvider>
  );
}

const styles = StyleSheet.create({
  startupBlank: {
    flex: 1,
    backgroundColor: "#031126",
  },
});

const introStyles = StyleSheet.create({
  wrap: { ...StyleSheet.absoluteFillObject },
  overlay: {
    flex: 1,
    backgroundColor: "#031126",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
    paddingVertical: 52,
  },
  card: {
    backgroundColor: "#0F172A",
    borderRadius: 30,
    paddingHorizontal: 30,
    paddingVertical: 34,
    width: "100%",
    maxWidth: 480,
    borderWidth: 1,
    borderColor: "rgba(37,99,235,0.28)",
    shadowColor: "#2563EB",
    shadowOpacity: 0.25,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 10 },
  },
  kicker: {
    marginTop: -8,
    fontSize: 18,
    fontWeight: "900",
    letterSpacing: 3,
    color: "#2563EB",
    textTransform: "uppercase",
    textAlign: "center",
  },
  byline: { marginTop: 22, fontSize: 14, color: "#93C5FD", fontWeight: "700", letterSpacing: 1.2, textTransform: "uppercase", textAlign: "center" },
  titleWrap: { marginTop: 20, alignItems: "center", justifyContent: "center" },
  titleGlow: {
    position: "absolute",
    width: 320,
    height: 74,
    borderRadius: 999,
    backgroundColor: "rgba(37,99,235,0.22)",
    shadowColor: "#2563EB",
    shadowOpacity: 0.5,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 0 },
  },
  title: { fontSize: 28, fontWeight: "900", color: "#FFFFFF", textAlign: "center" },
  body: { marginTop: 26, fontSize: 15, color: "#CBD5E1", fontWeight: "600", textAlign: "center", lineHeight: 26 },
  footer: { marginTop: 18, fontSize: 16, color: "#CBD5E1", fontWeight: "800", textAlign: "center" },
  footerSubtle: { marginTop: 10, fontSize: 12, color: "#64748B", fontWeight: "600", textAlign: "center" },
  ctaWrap: { marginTop: 30, borderRadius: 22, overflow: "hidden" },
  cta: {
    height: 64,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  ctaText: { color: "white", fontSize: 26, fontWeight: "900", letterSpacing: -0.5 },
  particle: {
    position: "absolute",
    borderRadius: 999,
    backgroundColor: "rgba(37,99,235,0.4)",
    shadowColor: "#2563EB",
    shadowOpacity: 0.35,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 0 },
  },
  p1: { width: 10, height: 10, top: "22%", left: "18%" },
  p2: { width: 6, height: 6, top: "28%", right: "22%" },
  p3: { width: 8, height: 8, bottom: "20%", right: "28%" },
});
