import { useCallback, useMemo, useState } from "react";
import { Alert, Modal, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { ScreenWrap } from "@/components/ScreenWrap";
import { GlassCard } from "@/components/GlassCard";
import { addCard, addPayment, deleteCard, getCards, updateCard } from "@/lib/db";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useFocusEffect } from "@react-navigation/native";

export default function CardsScreen() {
  const [cards, setCards] = useState(() => getCards());
  const [cardView, setCardView] = useState<"new" | "current">("new");
  const [editCardId, setEditCardId] = useState<number | null>(null);
  const [paymentCardId, setPaymentCardId] = useState<number | null>(null);
  const [paymentAmount, setPaymentAmount] = useState("0");
  const [paymentBanner, setPaymentBanner] = useState("");
  const [addSuccessBanner, setAddSuccessBanner] = useState("");

  const [name, setName] = useState("");
  const [accountOpenDate, setAccountOpenDate] = useState("");
  const [balance, setBalance] = useState("");
  const [limit, setLimit] = useState("");
  const [apr, setApr] = useState("");

  const editingCard = useMemo(() => cards.find((c) => c.id === editCardId) ?? null, [cards, editCardId]);
  const paymentCard = useMemo(() => cards.find((c) => c.id === paymentCardId) ?? null, [cards, paymentCardId]);

  const reloadCards = useCallback(() => {
    setCards(getCards());
  }, []);

  useFocusEffect(
    useCallback(() => {
      reloadCards();
    }, [reloadCards])
  );

  const toMonthYear = useCallback((iso: string) => {
    const d = new Date(iso);
    if (!Number.isFinite(d.getTime())) return "";
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    return `${mm}/${d.getFullYear()}`;
  }, []);
  const toIsoFromMonthYear = useCallback((value: string) => {
    const m = value.match(/^(\d{2})\/(\d{4})$/);
    if (!m) return null;
    const month = Number(m[1]);
    const year = Number(m[2]);
    if (month < 1 || month > 12) return null;
    return new Date(year, month - 1, 1).toISOString();
  }, []);
  const cleanMonthYear = useCallback((value: string) => {
    const digits = value.replace(/\D/g, "").slice(0, 6);
    if (digits.length <= 2) return digits;
    return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  }, []);

  const openEditModal = useCallback((id: number) => {
    const card = getCards().find((c) => c.id === id);
    if (!card) return;
    setEditCardId(card.id);
    setName(card.name);
    setAccountOpenDate(toMonthYear(card.opening_date));
    setBalance(String(card.current_balance));
    setLimit(String(card.credit_limit));
    setApr(String(card.apr));
  }, [toMonthYear]);

  const clearForm = useCallback(() => {
    setEditCardId(null);
    setName("");
    setAccountOpenDate("");
    setBalance("");
    setLimit("");
    setApr("");
  }, []);

  const cleanMoney = useCallback((value: string) => value.replace(/[^0-9.]/g, ""), []);
  const cleanPercent = useCallback((value: string) => value.replace(/[^0-9.]/g, ""), []);
  const formatMoney = useCallback((value: string) => {
    const n = Number(value);
    return Number.isFinite(n) ? n.toFixed(2) : "0.00";
  }, []);
  const formatPercent = useCallback((value: string) => {
    const n = Number(value);
    return Number.isFinite(n) ? n.toFixed(2) : "0.00";
  }, []);

  const saveNew = useCallback(() => {
    if (!name.trim()) {
      Alert.alert("Missing Name", "Please enter a card name.");
      return;
    }
    const openingDateIso = toIsoFromMonthYear(accountOpenDate);
    if (!openingDateIso) {
      Alert.alert("Invalid Date", "Please enter Account Open Date as MM/YYYY.");
      return;
    }
    addCard({
      name: name.trim(),
      credit_limit: Number(limit) || 0,
      current_balance: Number(balance) || 0,
      apr: Number(apr) || 0,
      min_payment: 35,
      due_date: new Date(Date.now() + 7 * 86400000).toISOString(),
      opening_date: openingDateIso,
    });
    clearForm();
    reloadCards();
    setAddSuccessBanner("Credit card added successfully");
    setTimeout(() => setAddSuccessBanner(""), 1400);
  }, [name, accountOpenDate, limit, balance, apr, toIsoFromMonthYear, clearForm, reloadCards]);

  const saveEdit = useCallback(() => {
    if (!editCardId) return;
    const openingDateIso = toIsoFromMonthYear(accountOpenDate);
    if (!openingDateIso) {
      Alert.alert("Invalid Date", "Please enter Account Open Date as MM/YYYY.");
      return;
    }
    updateCard(editCardId, {
      name: name.trim(),
      current_balance: Number(balance) || 0,
      credit_limit: Number(limit) || 0,
      apr: Number(apr) || 0,
      opening_date: openingDateIso,
    });
    reloadCards();
    setEditCardId(null);
    Alert.alert("Updated", "Card updated successfully.");
  }, [editCardId, name, accountOpenDate, balance, limit, apr, toIsoFromMonthYear, reloadCards]);

  const confirmDelete = useCallback((id: number) => {
    Alert.alert("Delete Card", "Are you sure you want to delete this card?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => {
          deleteCard(id);
          reloadCards();
          if (editCardId === id) clearForm();
        },
      },
    ]);
  }, [reloadCards, editCardId, clearForm]);

  return (
    <ScreenWrap>
      <View style={styles.headerBanner}>
        <Text style={styles.headerTitle}>CREDIT CARD</Text>
        <Text style={styles.headerSubtitle}>Track balance, utilization and APR</Text>
      </View>

      <View style={styles.segmentWrap}>
        <Pressable onPress={() => setCardView("new")} style={[styles.segmentBtn, cardView === "new" ? styles.segmentBtnActive : undefined]}>
          <Text style={[styles.segmentText, { color: cardView === "new" ? "#FFFFFF" : "#4B5563" }]}>New Card</Text>
        </Pressable>
        <Pressable onPress={() => setCardView("current")} style={[styles.segmentBtn, cardView === "current" ? styles.segmentBtnActive : undefined]}>
          <Text style={[styles.segmentText, { color: cardView === "current" ? "#FFFFFF" : "#4B5563" }]}>Current Cards</Text>
        </Pressable>
      </View>

      {cardView === "new" ? (
      <Animated.View entering={FadeInDown.delay(60)}>
      <GlassCard style={styles.formCard}>
        <Text style={styles.formHeading}>Create New Credit Card</Text>
        {addSuccessBanner ? <Text style={styles.banner}>{addSuccessBanner}</Text> : null}
        <Text style={styles.fieldLabel}>Card Name</Text>
        <TextInput value={name} onChangeText={setName} placeholder="Amex Gold" placeholderTextColor="#9CA3AF" style={styles.input} />

        <Text style={styles.fieldLabel}>Account Open Date (MM/YYYY)</Text>
        <TextInput
          value={accountOpenDate}
          onChangeText={(v) => setAccountOpenDate(cleanMonthYear(v))}
          placeholder="08/2022"
          keyboardType="number-pad"
          placeholderTextColor="#9CA3AF"
          style={styles.input}
        />

        <Text style={styles.fieldLabel}>Current Balance ($)</Text>
        <View style={styles.moneyWrap}>
          <Text style={styles.prefix}>$</Text>
          <TextInput
            value={balance}
            onChangeText={(v) => setBalance(cleanMoney(v))}
            onBlur={() => setBalance(formatMoney(balance))}
            placeholder="5322.00"
            keyboardType="decimal-pad"
            placeholderTextColor="#9CA3AF"
            style={styles.moneyInput}
          />
        </View>

        <Text style={styles.fieldLabel}>Credit Limit ($)</Text>
        <View style={styles.moneyWrap}>
          <Text style={styles.prefix}>$</Text>
          <TextInput
            value={limit}
            onChangeText={(v) => setLimit(cleanMoney(v))}
            onBlur={() => setLimit(formatMoney(limit))}
            placeholder="3000.00"
            keyboardType="decimal-pad"
            placeholderTextColor="#9CA3AF"
            style={styles.moneyInput}
          />
        </View>

        <Text style={styles.fieldLabel}>APR (%)</Text>
        <View style={styles.moneyWrap}>
          <Text style={styles.prefix}>%</Text>
          <TextInput
            value={apr}
            onChangeText={(v) => setApr(cleanPercent(v))}
            onBlur={() => setApr(formatPercent(apr))}
            placeholder="22.99"
            keyboardType="decimal-pad"
            placeholderTextColor="#9CA3AF"
            style={styles.moneyInput}
          />
        </View>
        <View style={styles.addRow}>
          <Pressable onPress={saveNew} style={styles.addBtn}>
            <Text style={styles.addBtnText}>Add Credit Card</Text>
          </Pressable>
        </View>
        <Text style={styles.tip}>Cards are saved locally and sync immediately on this device.</Text>
      </GlassCard>
      </Animated.View>
      ) : null}

      {cardView === "current" ? cards.map((card) => {
        const util = card.credit_limit > 0 ? card.current_balance / card.credit_limit : 0;
        return (
          <Animated.View key={card.id} entering={FadeInDown.delay(80)}>
          <GlassCard style={styles.cardContainer}>
            <View style={styles.cardNamePill}>
              <Text style={styles.cardName}>{card.name}</Text>
            </View>
            <View style={styles.metricGrid}>
              <View style={styles.metricItem}>
                <Text style={styles.metricLabel}>Balance</Text>
                <Text style={styles.metricValue}>${card.current_balance.toFixed(2)}</Text>
              </View>
              <View style={styles.metricItem}>
                <Text style={styles.metricLabel}>Credit Limit</Text>
                <Text style={styles.metricValue}>${card.credit_limit.toFixed(2)}</Text>
              </View>
              <View style={styles.metricItem}>
                <Text style={styles.metricLabel}>APR</Text>
                <Text style={styles.metricValue}>{card.apr.toFixed(2)}%</Text>
              </View>
              <View style={styles.metricItem}>
                <Text style={styles.metricLabel}>Opened</Text>
                <Text style={styles.metricValue}>{toMonthYear(card.opening_date) || "--/----"}</Text>
              </View>
            </View>
            <Text style={[styles.util, { color: util < 0.3 ? "#16A34A" : "#C62828" }]}>
              Utilization {Math.round(util * 100)}%
            </Text>
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: `${Math.max(0, Math.min(100, util * 100))}%` }]} />
            </View>
            <View style={styles.cardActionPanel}>
              <View style={styles.cardActionRow}>
                <Pressable
                  onPress={() => {
                    setPaymentCardId(card.id);
                    setPaymentAmount(Math.max(0, card.current_balance * 0.25).toFixed(2));
                  }}
                  style={({ pressed }) => [styles.cardActionBtn, pressed ? styles.cardActionBtnPressed : undefined]}
                >
                  <Text style={styles.cardActionText}>Make Payment</Text>
                </Pressable>
                <Pressable
                  onPress={() => openEditModal(card.id)}
                  style={({ pressed }) => [styles.cardActionBtn, pressed ? styles.cardActionBtnPressed : undefined]}
                >
                  <Text style={styles.cardActionText}>Edit</Text>
                </Pressable>
                <Pressable
                  onPress={() => confirmDelete(card.id)}
                  style={({ pressed }) => [styles.cardActionBtn, pressed ? styles.cardActionBtnPressed : undefined]}
                >
                  <Text style={styles.cardActionText}>Delete</Text>
                </Pressable>
              </View>
            </View>
            <View style={styles.cardDivider} />
          </GlassCard>
          </Animated.View>
        );
      }) : null}
      {paymentBanner ? <Text style={styles.banner}>{paymentBanner}</Text> : null}

      <Modal visible={!!editingCard} transparent animationType="slide" onRequestClose={clearForm}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Edit Card</Text>
            {editingCard ? (
              <>
                <Text style={styles.fieldLabel}>Card Name</Text>
                <TextInput value={name} onChangeText={setName} style={styles.input} />
                <Text style={styles.fieldLabel}>Account Open Date (MM/YYYY)</Text>
                <TextInput
                  value={accountOpenDate}
                  onChangeText={(v) => setAccountOpenDate(cleanMonthYear(v))}
                  style={styles.input}
                  keyboardType="number-pad"
                />
                <Text style={styles.fieldLabel}>Current Balance ($)</Text>
                <TextInput value={balance} onChangeText={(v) => setBalance(cleanMoney(v))} style={styles.input} keyboardType="decimal-pad" />
                <Text style={styles.fieldLabel}>Credit Limit ($)</Text>
                <TextInput value={limit} onChangeText={(v) => setLimit(cleanMoney(v))} style={styles.input} keyboardType="decimal-pad" />
                <Text style={styles.fieldLabel}>APR (%)</Text>
                <TextInput value={apr} onChangeText={(v) => setApr(cleanPercent(v))} style={styles.input} keyboardType="decimal-pad" />
              </>
            ) : null}
            <View style={styles.modalActionRow}>
              <Pressable onPress={clearForm} style={styles.modalCancel}><Text style={styles.modalCancelText}>Cancel</Text></Pressable>
              <Pressable onPress={saveEdit} style={styles.modalSave}><Text style={styles.actionText}>Save</Text></Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={!!paymentCard} transparent animationType="fade" onRequestClose={() => setPaymentCardId(null)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Make Card Payment</Text>
            <Text style={styles.modalLine}>Card: {paymentCard?.name ?? "-"}</Text>
            <Text style={styles.modalLine}>Remaining Balance: ${paymentCard?.current_balance.toFixed(2) ?? "0.00"}</Text>
            <Text style={styles.modalLine}>
              Recommended Payment: ${paymentCard ? Math.max(paymentCard.min_payment, paymentCard.current_balance * 0.3).toFixed(2) : "0.00"}
            </Text>
            <Text style={styles.fieldLabel}>Payment Amount</Text>
            <TextInput value={paymentAmount} onChangeText={(v) => setPaymentAmount(cleanMoney(v))} keyboardType="decimal-pad" style={styles.input} />
            <View style={styles.modalActionRow}>
              <Pressable onPress={() => setPaymentCardId(null)} style={styles.modalCancel}><Text style={styles.modalCancelText}>Cancel</Text></Pressable>
              <Pressable
                onPress={() => {
                  const amount = Number(paymentAmount);
                  if (!paymentCardId || !Number.isFinite(amount) || amount <= 0) {
                    Alert.alert("Invalid Payment", "Enter a valid payment amount.");
                    return;
                  }
                  addPayment(paymentCardId, amount, new Date().toISOString());
                  setPaymentCardId(null);
                  reloadCards();
                  setPaymentBanner("Payment Applied Successfully");
                  setTimeout(() => setPaymentBanner(""), 1400);
                }}
                style={styles.modalSave}
              >
                <Text style={styles.actionText}>Apply Payment</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </ScreenWrap>
  );
}

const styles = StyleSheet.create({
  headerBanner: {
    borderRadius: 20,
    paddingVertical: 22,
    paddingHorizontal: 20,
    backgroundColor: "#3F4D63",
    shadowColor: "#0F172A",
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
  headerTitle: { color: "white", fontSize: 29, fontWeight: "900", textAlign: "center", letterSpacing: 0.5 },
  headerSubtitle: { marginTop: 8, color: "rgba(255,255,255,0.86)", fontSize: 14, fontWeight: "600", textAlign: "center" },
  segmentWrap: {
    flexDirection: "row",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 14,
    padding: 4,
    marginBottom: 8,
    gap: 6,
    backgroundColor: "#FFFFFF",
    shadowColor: "#111827",
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
  },
  segmentBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 44,
    paddingVertical: 10,
    backgroundColor: "#FFFFFF",
  },
  segmentBtnActive: {
    backgroundColor: "#273444",
    borderColor: "#273444",
  },
  segmentText: { fontSize: 15, fontWeight: "800" },
  formCard: { marginBottom: 6 },
  formHeading: { fontSize: 24, fontWeight: "800", color: "#111827" },
  fieldLabel: { marginTop: 10, fontSize: 15, fontWeight: "700", color: "#111827" },
  input: {
    marginTop: 6,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    borderColor: "#D1D5DB",
    backgroundColor: "#FFFFFF",
    color: "#111827",
  },
  moneyWrap: { marginTop: 6, position: "relative", justifyContent: "center" },
  prefix: { position: "absolute", left: 12, zIndex: 2, fontSize: 15, fontWeight: "700", color: "#4B5563" },
  moneyInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 12,
    paddingLeft: 28,
    paddingRight: 10,
    paddingVertical: 12,
    fontSize: 16,
    borderColor: "#D1D5DB",
    backgroundColor: "#FFFFFF",
    color: "#111827",
  },
  addRow: { marginTop: 14 },
  addBtn: { backgroundColor: "#3F4D63", borderWidth: 1, borderColor: "#3F4D63", borderRadius: 12, alignItems: "center", paddingVertical: 13 },
  addBtnText: { color: "#FFFFFF", fontSize: 16, fontWeight: "800" },
  tip: { marginTop: 8, color: "#4B5563", fontSize: 13, fontWeight: "600" },
  cardContainer: { marginTop: 12, paddingBottom: 16, borderRadius: 18 },
  cardNamePill: { alignSelf: "flex-start", backgroundColor: "#EEF2F6", borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1, borderColor: "#D1D5DB" },
  cardName: { fontSize: 14, fontWeight: "800", color: "#111827" },
  metricGrid: { flexDirection: "row", justifyContent: "space-between", gap: 8, marginTop: 12 },
  metricItem: { flex: 1 },
  metricLabel: { fontSize: 12, fontWeight: "700", color: "#4B5563" },
  metricValue: { marginTop: 4, fontSize: 15, fontWeight: "700", color: "#111827" },
  util: { marginTop: 10, fontWeight: "700", fontSize: 14 },
  progressTrack: { height: 10, borderRadius: 999, backgroundColor: "#E5E7EB", marginTop: 8, overflow: "hidden" },
  progressFill: { height: "100%", backgroundColor: "#334155" },
  /** Outer shell matches segment control: rounded white tray */
  cardActionPanel: {
    marginTop: 18,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 14,
    padding: 6,
    backgroundColor: "#FFFFFF",
    shadowColor: "#111827",
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
  },
  cardActionRow: { flexDirection: "row", gap: 8, alignItems: "stretch" },
  /** Same language as inactive segment pills: white + outline; black border per banking spec */
  cardActionBtn: {
    flex: 1,
    minHeight: 48,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    paddingHorizontal: 8,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#111827",
  },
  cardActionBtnPressed: { opacity: 0.88, backgroundColor: "#F9FAFB" },
  cardActionText: { color: "#111827", fontSize: 14.5, fontWeight: "800", textAlign: "center", letterSpacing: 0.15 },
  actionText: { color: "#111827", fontSize: 14, fontWeight: "800" },
  cardDivider: { marginTop: 10, height: 1, backgroundColor: "#E5E7EB" },
  banner: {
    marginTop: 10,
    alignSelf: "center",
    backgroundColor: "#EEF2F6",
    color: "#334155",
    fontSize: 12,
    fontWeight: "800",
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    overflow: "hidden",
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "center",
    padding: 22,
  },
  modalCard: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 16,
  },
  modalTitle: { fontSize: 22, fontWeight: "800", marginBottom: 4, color: "#111827" },
  modalLine: { fontSize: 14, color: "#4B5563", marginBottom: 6, fontWeight: "600" },
  modalActionRow: { marginTop: 14, flexDirection: "row", gap: 10 },
  modalCancel: { flex: 1, borderRadius: 10, borderWidth: 1, borderColor: "#D1D5DB", alignItems: "center", paddingVertical: 10 },
  modalCancelText: { color: "#4B5563", fontWeight: "700", fontSize: 14 },
  modalSave: { flex: 1, borderRadius: 10, borderWidth: 1, borderColor: "#D1D5DB", backgroundColor: "#FFFFFF", alignItems: "center", paddingVertical: 10 },
});

