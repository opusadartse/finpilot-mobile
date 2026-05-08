import { useCallback, useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput } from "react-native";
import { ScreenWrap } from "@/components/ScreenWrap";
import { GlassCard } from "@/components/GlassCard";
import { addPayment, getCards, getPayments } from "@/lib/db";
import Colors from "@/constants/Colors";
import { useColorScheme } from "@/components/useColorScheme";
import Animated, { FadeInDown, useAnimatedStyle, useSharedValue, withSpring } from "react-native-reanimated";
import { useFocusEffect } from "@react-navigation/native";
import * as Haptics from "expo-haptics";

export default function PaymentsScreen() {
  const scheme = useColorScheme() ?? "dark";
  const c = Colors[scheme];
  const [cards, setCards] = useState(() => getCards());
  const [payments, setPayments] = useState(() => getPayments());
  const [cardId, setCardId] = useState<number>(cards[0]?.id ?? 0);
  const [amount, setAmount] = useState("50");
  const glow = useSharedValue(0);
  const glowStyle = useAnimatedStyle(() => ({
    transform: [{ scale: withSpring(glow.value ? 0.98 : 1) }],
    opacity: withSpring(glow.value ? 0.9 : 1),
  }));

  useFocusEffect(
    useCallback(() => {
      const c = getCards();
      setCards(c);
      if (c.length && !c.find((x) => x.id === cardId)) setCardId(c[0].id);
      setPayments(getPayments());
    }, [cardId])
  );

  const selectedCard = useMemo(() => cards.find((x) => x.id === cardId), [cards, cardId]);

  return (
    <ScreenWrap>
      <Text style={[styles.title, { color: c.text }]}>Payments</Text>
      <Text style={[styles.subtitle, { color: c.tabIconDefault }]}>Record, track, and reduce balances in real time</Text>

      <Animated.View entering={FadeInDown.delay(80)}>
      <GlassCard>
        <Text style={[styles.label, { color: c.tabIconDefault }]}>Record payment</Text>
        <Text style={[styles.small, { color: c.text }]}>
          Card: {selectedCard?.name ?? "None selected"}
        </Text>
        <TextInput
          value={amount}
          onChangeText={setAmount}
          keyboardType="decimal-pad"
          style={[styles.input, { color: c.text, borderColor: c.border }]}
          placeholder="$ amount"
          placeholderTextColor={c.tabIconDefault}
        />
        <Animated.View style={glowStyle}>
        <Pressable
          onPressIn={() => (glow.value = 1)}
          onPressOut={() => (glow.value = 0)}
          style={[styles.btn, { backgroundColor: c.accentPositive, shadowColor: c.accentPositive }]}
          onPress={() => {
            const v = Number(amount);
            if (!cardId || !Number.isFinite(v) || v <= 0) return;
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            addPayment(cardId, v, new Date().toISOString());
            setCards(getCards());
            setPayments(getPayments());
          }}
        >
          <Text style={styles.btnText}>Apply Payment</Text>
        </Pressable>
        </Animated.View>

        <Text style={[styles.small, { color: c.tabIconDefault, marginTop: 10 }]}>Quick card select</Text>
        {cards.map((card) => (
          <Pressable
            key={card.id}
            onPress={() => {
              Haptics.selectionAsync();
              setCardId(card.id);
            }}
            style={[
              styles.cardPick,
              { borderColor: c.border, backgroundColor: card.id === cardId ? "rgba(47,128,255,0.20)" : "transparent" },
            ]}
          >
            <Text style={{ color: c.text, fontWeight: "700" }}>{card.name}</Text>
          </Pressable>
        ))}
      </GlassCard>
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(140)}>
      <GlassCard style={{ marginTop: 10 }}>
        <Text style={[styles.label, { color: c.tabIconDefault }]}>History</Text>
        {payments.slice(0, 12).map((p) => (
          <Text key={p.id} style={[styles.row, { color: c.text }]}>
            {new Date(p.paid_at).toLocaleDateString()} • {p.card_name} • ${p.amount.toFixed(2)} • left ${p.balance_after.toFixed(2)}
          </Text>
        ))}
      </GlassCard>
      </Animated.View>
    </ScreenWrap>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 28, fontWeight: "800", marginTop: 10, marginLeft: 6 },
  subtitle: { fontSize: 13, marginTop: 2, marginBottom: 2, marginLeft: 6, fontWeight: "600" },
  label: { fontSize: 12, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.7 },
  small: { marginTop: 8, fontSize: 13, fontWeight: "600" },
  input: {
    marginTop: 10,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
  },
  btn: {
    marginTop: 10,
    borderRadius: 12,
    alignItems: "center",
    paddingVertical: 11,
    shadowOpacity: 0.45,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 7 },
    elevation: 7,
  },
  btnText: { color: "white", fontSize: 14, fontWeight: "800" },
  cardPick: { marginTop: 8, borderWidth: 1, borderRadius: 12, paddingHorizontal: 10, paddingVertical: 9 },
  row: { marginTop: 8, fontSize: 13, lineHeight: 18 },
});

