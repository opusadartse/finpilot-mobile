import { PropsWithChildren } from "react";
import { ScrollView, StyleSheet } from "react-native";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import Colors from "@/constants/Colors";
import { useColorScheme } from "@/components/useColorScheme";
import { SafeAreaView } from "react-native-safe-area-context";

export function ScreenWrap({ children }: PropsWithChildren) {
  const scheme = useColorScheme() ?? "dark";
  const c = Colors[scheme];
  const tabBarHeight = useBottomTabBarHeight();
  return (
    <SafeAreaView edges={["top", "left", "right"]} style={[styles.root, { backgroundColor: c.background }]}>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: tabBarHeight + 40 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      >
        {children}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { padding: 16, gap: 12, paddingBottom: 34 },
});

