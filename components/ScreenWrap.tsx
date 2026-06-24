import { PropsWithChildren } from "react";
import { ScrollView, StyleSheet } from "react-native";
import Colors from "@/constants/Colors";
import { useColorScheme } from "@/components/useColorScheme";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

export function ScreenWrap({ children }: PropsWithChildren) {
  const scheme = useColorScheme() ?? "dark";
  const c = Colors[scheme];
  const insets = useSafeAreaInsets();
  return (
    <SafeAreaView edges={["top", "left", "right"]} style={[styles.root, { backgroundColor: c.background }]}>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: 24 + insets.bottom }]}
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
  content: { padding: 20, gap: 16 },
});

