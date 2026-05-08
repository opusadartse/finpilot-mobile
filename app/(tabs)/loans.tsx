import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import Animated, { FadeInDown, useAnimatedStyle, useSharedValue, withSpring } from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import DateTimePicker from "@react-native-community/datetimepicker";
import { Ionicons } from "@expo/vector-icons";
import { ScreenWrap } from "@/components/ScreenWrap";
import { GlassCard } from "@/components/GlassCard";
import Colors from "@/constants/Colors";
import { useColorScheme } from "@/components/useColorScheme";
import { addLoan, addLoanPayment, deleteLoan, getCards, getLoanPayments, getLoans, getRemainingMonths, setLoanPurchasesThisMonth, updateLoan } from "@/lib/db";

export default function LoansScreen() {
  const scheme = useColorScheme() ?? "dark";
  const c = Colors[scheme];
  const [loans, setLoans] = useState(() => getLoans());
  const [cards, setCards] = useState(() => getCards());
  const [loanPayments, setLoanPayments] = useState(() => getLoanPayments());
  const [selectedLoanId, setSelectedLoanId] = useState<number>(loans[0]?.id ?? 0);
  const [loanView, setLoanView] = useState<"new" | "current">("new");
  const [paymentAmount, setPaymentAmount] = useState("100");
  const [makePaymentVisible, setMakePaymentVisible] = useState(false);
  const [makePaymentLoanId, setMakePaymentLoanId] = useState<number | null>(null);
  const [makePaymentAmount, setMakePaymentAmount] = useState("");
  const [makePaymentNotes, setMakePaymentNotes] = useState("");
  const [paymentSuccessBanner, setPaymentSuccessBanner] = useState("");
  const [purchasesModalLoanId, setPurchasesModalLoanId] = useState<number | null>(null);
  const [purchasesInput, setPurchasesInput] = useState("0");

  const [name, setName] = useState("");
  const [amountBorrowed, setAmountBorrowed] = useState("4000");
  const [startDate, setStartDate] = useState(new Date(2025, 4, 12));
  const [endDate, setEndDate] = useState(new Date(2026, 4, 12));
  const [expirationDate, setExpirationDate] = useState(new Date(2026, 4, 12));
  const [monthlyTarget, setMonthlyTarget] = useState("");
  const [notes, setNotes] = useState("0% APR promotion");
  const [editingLoanId, setEditingLoanId] = useState<number | null>(null);
  const [pickerField, setPickerField] = useState<"start" | "end" | "expiration" | null>(null);
  const [pickerMode, setPickerMode] = useState<"create" | "edit">("create");
  const [pickerDate, setPickerDate] = useState(new Date());
  const [focusedField, setFocusedField] = useState<"name" | "amount" | "target" | "notes" | null>(null);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editSaved, setEditSaved] = useState(false);
  const [editLoanId, setEditLoanId] = useState<number | null>(null);
  const [editName, setEditName] = useState("");
  const [editAmountBorrowed, setEditAmountBorrowed] = useState("0");
  const [editCurrentBalance, setEditCurrentBalance] = useState("0");
  const [editStartDate, setEditStartDate] = useState(new Date());
  const [editEndDate, setEditEndDate] = useState(new Date());
  const [editExpirationDate, setEditExpirationDate] = useState(new Date());
  const [editMonthlyTarget, setEditMonthlyTarget] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const [priorityVisible, setPriorityVisible] = useState(false);
  const glow = useSharedValue(0);
  const datePress = useSharedValue(0);
  const actionPress = useSharedValue(0);
  const glowStyle = useAnimatedStyle(() => ({
    transform: [{ scale: withSpring(glow.value ? 0.985 : 1) }],
    opacity: withSpring(glow.value ? 0.94 : 1),
  }));
  const datePressStyle = useAnimatedStyle(() => ({
    transform: [{ scale: withSpring(datePress.value ? 0.985 : 1) }],
    opacity: withSpring(datePress.value ? 0.9 : 1),
  }));
  const actionPressStyle = useAnimatedStyle(() => ({
    transform: [{ scale: withSpring(actionPress.value ? 0.985 : 1) }],
    opacity: withSpring(actionPress.value ? 0.92 : 1),
  }));

  const reload = useCallback(() => {
    const next = getLoans();
    setLoans(next);
    setCards(getCards());
    setLoanPayments(getLoanPayments());
    if (next.length && !next.find((l) => l.id === selectedLoanId)) setSelectedLoanId(next[0].id);
  }, [selectedLoanId]);

  useFocusEffect(useCallback(() => reload(), [reload]));

  const selectedLoan = useMemo(() => loans.find((l) => l.id === selectedLoanId), [loans, selectedLoanId]);
  const priorityPlan = useMemo(() => {
    const totalCardBalance = cards.reduce((sum, c) => sum + c.current_balance, 0);
    const cardMinTotal = cards.reduce((sum, c) => sum + c.min_payment, 0);
    const cardRecommended = totalCardBalance > 0 ? Math.max(cardMinTotal, totalCardBalance * 0.3) : 0;
    const sortedPromos = [...loans].sort(
      (a, b) => new Date(a.interest_free_expiration).getTime() - new Date(b.interest_free_expiration).getTime()
    );
    const totalPurchases = sortedPromos.reduce((sum, p) => sum + (p.purchases_this_month || 0), 0);
    const totalMonthlyTargets = sortedPromos.reduce((sum, p) => sum + p.monthly_payment_target, 0);
    return {
      primary: {
        balance: totalCardBalance,
        recommended: cardRecommended,
      },
      totalPurchases,
      totalMonthlyTargets,
      promotions: sortedPromos.map((p) => {
        const monthsLeft = Math.max(1, getRemainingMonths(p.interest_free_expiration));
        const safePayment = p.current_balance / monthsLeft;
        const risk = p.monthly_payment_target + 0.01 < safePayment;
        return {
          ...p,
          monthsLeft,
          safePayment,
          risk,
        };
      }),
    };
  }, [cards, loans]);
  const totals = useMemo(() => {
    const activeCount = loans.filter((l) => l.current_balance > 0).length;
    const totalRemaining = loans.reduce((s, l) => s + l.current_balance, 0);
    const totalMonthly = loans.reduce((s, l) => s + l.monthly_payment_target, 0);
    return { activeCount, totalRemaining, totalMonthly };
  }, [loans]);
  const formatDatePretty = (d: Date) =>
    d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
  const currentMonthLabel = useMemo(
    () => new Date().toLocaleDateString(undefined, { month: "long", year: "numeric" }),
    []
  );
  const monthsPreview = Math.max(1, getRemainingMonths(expirationDate.toISOString()));
  const amountPreview = Number(amountBorrowed) || 0;
  const suggestedMonthly = amountPreview > 0 ? amountPreview / monthsPreview : 0;
  const setFormFromLoan = useCallback((loanId: number) => {
    const loan = loans.find((l) => l.id === loanId);
    if (!loan) return;
    setEditingLoanId(loan.id);
    setSelectedLoanId(loan.id);
    setName(loan.name);
    setAmountBorrowed(String(loan.amount_borrowed));
    setStartDate(new Date(loan.start_date));
    setEndDate(new Date(loan.end_date));
    setExpirationDate(new Date(loan.interest_free_expiration));
    setMonthlyTarget(String(loan.monthly_payment_target));
    setNotes(loan.notes);
  }, [loans]);

  const clearForm = useCallback(() => {
    setEditingLoanId(null);
    setName("");
    setAmountBorrowed("0");
    setStartDate(new Date(2025, 4, 12));
    setEndDate(new Date(2026, 4, 12));
    setExpirationDate(new Date(2026, 4, 12));
    setMonthlyTarget("0");
    setNotes("");
  }, []);

  useEffect(() => {
    if (loanView === "new") {
      clearForm();
    }
  }, [loanView, clearForm]);

  const openDatePicker = useCallback(
    (field: "start" | "end" | "expiration", mode: "create" | "edit" = "create") => {
      Keyboard.dismiss();
      setPickerMode(mode);
      setPickerField(field);
      if (mode === "create") {
        setPickerDate(field === "start" ? startDate : field === "end" ? endDate : expirationDate);
      } else {
        setPickerDate(field === "start" ? editStartDate : field === "end" ? editEndDate : editExpirationDate);
      }
    },
    [startDate, endDate, expirationDate, editStartDate, editEndDate, editExpirationDate]
  );

  const applyPickedDate = useCallback(() => {
    if (!pickerField) return;
    const currentStart = pickerMode === "create" ? startDate : editStartDate;
    const currentEnd = pickerMode === "create" ? endDate : editEndDate;
    const currentExpiration = pickerMode === "create" ? expirationDate : editExpirationDate;
    if (pickerField === "start") {
      if (pickerMode === "create") {
        setStartDate(pickerDate);
        if (currentEnd < pickerDate) setEndDate(pickerDate);
        if (currentExpiration < pickerDate) setExpirationDate(pickerDate);
      } else {
        setEditStartDate(pickerDate);
        if (currentEnd < pickerDate) setEditEndDate(pickerDate);
        if (currentExpiration < pickerDate) setEditExpirationDate(pickerDate);
      }
    } else if (pickerField === "end") {
      if (pickerDate < currentStart) {
        Alert.alert("Invalid End Date", "End Date cannot be before Start Date.");
        return;
      }
      if (pickerMode === "create") {
        setEndDate(pickerDate);
        if (currentExpiration > pickerDate) setExpirationDate(pickerDate);
      } else {
        setEditEndDate(pickerDate);
        if (currentExpiration > pickerDate) setEditExpirationDate(pickerDate);
      }
    } else {
      if (pickerDate < currentStart) {
        Alert.alert("Invalid Expiration", "Interest-free expiration cannot be before Start Date.");
        return;
      }
      if (pickerDate > currentEnd) {
        Alert.alert("Invalid Expiration", "Interest-free expiration cannot be after End Date.");
        return;
      }
      if (pickerMode === "create") {
        setExpirationDate(pickerDate);
      } else {
        setEditExpirationDate(pickerDate);
      }
    }
    setPickerField(null);
  }, [pickerField, pickerDate, pickerMode, startDate, endDate, expirationDate, editStartDate, editEndDate, editExpirationDate]);

  const openEditModal = useCallback(
    (loanId: number) => {
      const loan = loans.find((l) => l.id === loanId);
      if (!loan) return;
      setEditLoanId(loan.id);
      setEditName(loan.name);
      setEditAmountBorrowed(String(loan.amount_borrowed));
      setEditCurrentBalance(String(loan.current_balance));
      setEditStartDate(new Date(loan.start_date));
      setEditEndDate(new Date(loan.end_date));
      setEditExpirationDate(new Date(loan.interest_free_expiration));
      setEditMonthlyTarget(String(loan.monthly_payment_target));
      setEditNotes(loan.notes);
      setEditModalVisible(true);
    },
    [loans]
  );

  const saveEditModal = useCallback(() => {
    if (!editLoanId) return;
    if (!editName.trim()) {
      Alert.alert("Missing Name", "Please enter a loan or promotion name.");
      return;
    }
    if (editEndDate < editStartDate) {
      Alert.alert("Invalid Dates", "End Date cannot be before Start Date.");
      return;
    }
    if (editExpirationDate < editStartDate || editExpirationDate > editEndDate) {
      Alert.alert("Invalid Expiration", "Expiration must be between Start Date and End Date.");
      return;
    }
    const amount = Number(editAmountBorrowed) || 0;
    const balance = Number(editCurrentBalance) || 0;
    if (amount <= 0 || balance < 0) {
      Alert.alert("Invalid Amounts", "Please enter valid total and balance values.");
      return;
    }
    const months = Math.max(1, getRemainingMonths(editExpirationDate.toISOString()));
    const monthly = Number(editMonthlyTarget) || balance / months;
    updateLoan(editLoanId, {
      name: editName.trim(),
      amount_borrowed: amount,
      current_balance: balance,
      start_date: editStartDate.toISOString(),
      end_date: editEndDate.toISOString(),
      interest_free_expiration: editExpirationDate.toISOString(),
      monthly_payment_target: monthly,
      notes: editNotes.trim(),
    });
    setEditSaved(true);
    setTimeout(() => {
      setEditSaved(false);
      setEditModalVisible(false);
    }, 900);
    reload();
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }, [
    editLoanId,
    editName,
    editEndDate,
    editStartDate,
    editExpirationDate,
    editAmountBorrowed,
    editCurrentBalance,
    editMonthlyTarget,
    editNotes,
    reload,
  ]);

  const handleMakePayment = useCallback((loanId: number) => {
    const loan = loans.find((l) => l.id === loanId);
    if (!loan) return;
    setSelectedLoanId(loanId);
    const months = Math.max(1, getRemainingMonths(loan.interest_free_expiration));
    const recommended = loan.current_balance > 0 ? loan.current_balance / months : 0;
    const prefill = loan.monthly_payment_target > 0 ? loan.monthly_payment_target : recommended;
    setMakePaymentLoanId(loanId);
    setMakePaymentAmount(prefill.toFixed(2));
    setMakePaymentNotes("");
    setMakePaymentVisible(true);
  }, [loans]);

  const makePaymentLoan = useMemo(
    () => loans.find((l) => l.id === makePaymentLoanId) ?? null,
    [loans, makePaymentLoanId]
  );

  return (
    <ScreenWrap>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <View pointerEvents="box-none">
      <View style={styles.headerBanner}>
        <Text style={styles.headerTitle}>Loans & Promotions</Text>
        <Text style={styles.headerSubtitle}>Track 0% APR offers and payoff goals</Text>
      </View>

      <View style={[styles.segmentWrap, { borderColor: c.border, backgroundColor: "rgba(255,255,255,0.02)" }]}>
        <Pressable
          onPress={() => setLoanView("new")}
          style={[
            styles.segmentBtn,
            loanView === "new" ? styles.segmentBtnActive : undefined,
            { borderColor: c.border },
          ]}
        >
          <Text style={[styles.segmentText, { color: loanView === "new" ? "#FFFFFF" : c.tabIconDefault }]}>New Loan</Text>
        </Pressable>
        <Pressable
          onPress={() => setLoanView("current")}
          style={[
            styles.segmentBtn,
            loanView === "current" ? styles.segmentBtnActive : undefined,
            { borderColor: c.border },
          ]}
        >
          <Text style={[styles.segmentText, { color: loanView === "current" ? "#FFFFFF" : c.tabIconDefault }]}>
            Current Loans
          </Text>
        </Pressable>
      </View>

      {loanView === "new" ? (
      <Animated.View entering={FadeInDown.delay(70)} key="new-loan-section">
        <GlassCard>
          <Text style={[styles.sectionHeader, { color: c.text }]}>Create New Loan / Promotion</Text>
          <Text style={[styles.sectionLabel, { color: c.tabIconDefault }]}>Add promotion</Text>
          <Text style={[styles.fieldLabel, { color: c.text }]}>Card Name</Text>
          <TextInput
            value={name}
            onChangeText={setName}
            onFocus={() => setFocusedField("name")}
            onBlur={() => setFocusedField(null)}
            placeholder="Enter credit card name"
            placeholderTextColor={c.tabIconDefault}
            returnKeyType="next"
            style={[styles.input, { color: c.text, borderColor: focusedField === "name" ? c.tint : c.border }]}
          />
          <Text style={[styles.fieldLabel, { color: c.text }]}>Amount Borrowed ($)</Text>
          <TextInput
            value={amountBorrowed}
            onChangeText={(v) => setAmountBorrowed(v.replace(/[^0-9.]/g, ""))}
            keyboardType="decimal-pad"
            returnKeyType="done"
            onFocus={() => setFocusedField("amount")}
            onBlur={() => setFocusedField(null)}
            placeholder="4000.00"
            placeholderTextColor={c.tabIconDefault}
            style={[styles.input, { color: c.text, borderColor: focusedField === "amount" ? c.tint : c.border }]}
          />
          <Text style={[styles.fieldLabel, { color: c.text }]}>Promotion Dates</Text>
          <Animated.View style={[styles.chipRow, datePressStyle]}>
            <Pressable
              onPressIn={() => (datePress.value = 1)}
              onPressOut={() => (datePress.value = 0)}
              onPress={() => openDatePicker("start", "create")}
              style={[styles.dateChip, { borderColor: c.border }]}
            >
              <Ionicons name="calendar-outline" size={14} color={c.tint} />
              <Text style={[styles.chipText, { color: c.text }]}>Start {formatDatePretty(startDate)}</Text>
            </Pressable>
            <Pressable
              onPressIn={() => (datePress.value = 1)}
              onPressOut={() => (datePress.value = 0)}
              onPress={() => openDatePicker("end", "create")}
              style={[styles.dateChip, { borderColor: c.border }]}
            >
              <Ionicons name="calendar-outline" size={14} color={c.tint} />
              <Text style={[styles.chipText, { color: c.text }]}>End {formatDatePretty(endDate)}</Text>
            </Pressable>
            <Pressable
              onPressIn={() => (datePress.value = 1)}
              onPressOut={() => (datePress.value = 0)}
              onPress={() => openDatePicker("expiration", "create")}
              style={[styles.dateChip, { borderColor: c.border }]}
            >
              <Ionicons name="alarm-outline" size={14} color={c.tint} />
              <Text style={[styles.chipText, { color: c.text }]}>0% Ends {formatDatePretty(expirationDate)}</Text>
            </Pressable>
          </Animated.View>
          <Text style={[styles.fieldLabel, { color: c.text }]}>Monthly Payment Target ($)</Text>
          <TextInput
            value={monthlyTarget}
            onChangeText={(v) => setMonthlyTarget(v.replace(/[^0-9.]/g, ""))}
            keyboardType="decimal-pad"
            returnKeyType="done"
            onFocus={() => setFocusedField("target")}
            onBlur={() => setFocusedField(null)}
            placeholder={`Auto: ${suggestedMonthly.toFixed(2)}`}
            placeholderTextColor={c.tabIconDefault}
            style={[styles.input, { color: c.text, borderColor: focusedField === "target" ? c.tint : c.border }]}
          />
          <Text style={[styles.fieldLabel, { color: c.text }]}>Notes</Text>
          <TextInput
            value={notes}
            onChangeText={setNotes}
            onFocus={() => setFocusedField("notes")}
            onBlur={() => setFocusedField(null)}
            multiline
            scrollEnabled
            textAlignVertical="top"
            autoCorrect
            spellCheck
            blurOnSubmit={false}
            returnKeyType="default"
            placeholder="Explain terms, fee notes, transfer source, and reminders..."
            placeholderTextColor={c.tabIconDefault}
            style={[styles.notesInput, { color: c.text, borderColor: focusedField === "notes" ? c.tint : c.border }]}
          />
          <Text style={[styles.preview, { color: c.tabIconDefault }]}>
            Months remaining: {monthsPreview} • Recommended monthly payment: ${suggestedMonthly.toFixed(2)}
          </Text>
          <Animated.View style={[glowStyle, actionPressStyle]}>
          <Pressable
            onPressIn={() => {
              glow.value = 1;
              actionPress.value = 1;
            }}
            onPressOut={() => {
              glow.value = 0;
              actionPress.value = 0;
            }}
            onPress={() => {
              if (!name.trim()) {
                Alert.alert("Missing Name", "Please enter a loan or promotion name.");
                return;
              }
              if (endDate < startDate) {
                Alert.alert("Invalid Dates", "End Date cannot be before Start Date.");
                return;
              }
              if (expirationDate < startDate || expirationDate > endDate) {
                Alert.alert("Invalid Expiration", "Expiration must be between Start Date and End Date.");
                return;
              }
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              const amount = Number(amountBorrowed) || 0;
              if (amount <= 0) {
                Alert.alert("Invalid Amount", "Enter a valid borrowed amount greater than 0.");
                return;
              }
              const months = Math.max(1, getRemainingMonths(expirationDate.toISOString()));
              const payload = {
                name: name.trim(),
                amount_borrowed: amount,
                start_date: startDate.toISOString(),
                end_date: endDate.toISOString(),
                interest_free_expiration: expirationDate.toISOString(),
                monthly_payment_target: Number(monthlyTarget) || amount / months,
                notes: notes.trim(),
              };
              if (editingLoanId) {
                updateLoan(editingLoanId, payload);
              } else {
                addLoan(payload);
              }
              clearForm();
              reload();
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            }}
            style={[styles.addBtn, { backgroundColor: c.tint }]}
            hitSlop={8}
          >
            <Text style={styles.addBtnText}>{editingLoanId ? "Save Promotion" : "Add Promotion"}</Text>
          </Pressable>
          </Animated.View>
          {editingLoanId ? (
            <Pressable onPress={clearForm} style={[styles.secondaryBtn, { borderColor: c.border }]}>
              <Text style={[styles.secondaryText, { color: c.tabIconDefault }]}>Cancel Edit</Text>
            </Pressable>
          ) : null}
        </GlassCard>
      </Animated.View>
      ) : (
      <Animated.View entering={FadeInDown.delay(70)} key="current-loans-section">
        <GlassCard>
          <Text style={[styles.sectionHeader, { color: c.text }]}>Current Loans</Text>
          <Text style={[styles.sectionLabel, { color: c.tabIconDefault }]}>Portfolio Summary</Text>
          <Text style={[styles.loanMeta, { color: c.text }]}>Active Loans: {totals.activeCount}</Text>
          <Text style={[styles.loanMeta, { color: c.text }]}>Remaining Balance: ${totals.totalRemaining.toFixed(2)}</Text>
          <Text style={[styles.loanMeta, { color: c.text }]}>Monthly Target Total: ${totals.totalMonthly.toFixed(2)}</Text>
        </GlassCard>
      </Animated.View>
      )}

      {loanView === "current" ? loans.map((loan, idx) => {
        const months = getRemainingMonths(loan.interest_free_expiration);
        const progress = loan.amount_borrowed > 0 ? (loan.amount_borrowed - loan.current_balance) / loan.amount_borrowed : 0;
        const needed = months > 0 ? loan.current_balance / months : loan.current_balance;
        const purchases = loan.purchases_this_month || 0;
        const totalDue = loan.monthly_payment_target + purchases;
        const dangerColor = months <= 1 ? "#ff6b7a" : months <= 3 ? "#f6c553" : c.accentPositive;
        return (
          <Animated.View entering={FadeInDown.delay(120 + idx * 40)} key={loan.id}>
            <GlassCard style={[styles.loanCardWrap, selectedLoanId === loan.id ? styles.loanCardSelected : undefined]}>
              <Pressable
                onPress={() => setSelectedLoanId(loan.id)}
                onLongPress={() =>
                  Alert.alert(loan.name, "Choose an action", [
                    { text: "Edit", onPress: () => openEditModal(loan.id) },
                    {
                      text: "Delete",
                      style: "destructive",
                      onPress: () => {
                        deleteLoan(loan.id);
                        reload();
                      },
                    },
                    { text: "Cancel", style: "cancel" },
                  ])
                }
              >
                <Text style={[styles.loanName, { color: c.text }]}>{loan.name}</Text>
                <Text style={[styles.loanMeta, { color: c.tabIconDefault }]}>Balance ${loan.current_balance.toFixed(2)} of ${loan.amount_borrowed.toFixed(2)}</Text>
                <Text style={[styles.loanMeta, { color: c.tabIconDefault }]}>Monthly target ${needed.toFixed(2)} • {months} month(s) left</Text>
                <Text style={styles.purchasesLabel}>
                  {purchases > 0 ? `Purchases This Month: $${purchases.toFixed(2)}` : "No purchases added this month"}
                </Text>
                <Text style={styles.monthLabel}>Current Month: {currentMonthLabel}</Text>
                <Text style={styles.totalDueLabel}>Total Due This Month: ${totalDue.toFixed(2)}</Text>
                <Text style={[styles.warning, { color: dangerColor }]}>
                  {months <= 1 ? "Interest-free ending now" : months <= 3 ? "Interest-free ending soon" : "Promotion active"}
                </Text>
                <View style={[styles.progressTrack, { backgroundColor: "rgba(255,255,255,0.08)" }]}>
                  <View style={[styles.progressFill, { width: `${Math.max(0, Math.min(100, progress * 100))}%`, backgroundColor: dangerColor }]} />
                </View>
              </Pressable>
              <View style={styles.actionRow}>
                <Pressable
                  onPress={() => handleMakePayment(loan.id)}
                  style={({ pressed }) => [
                    styles.cardActionBtn,
                    styles.makePaymentBtn,
                    pressed ? styles.btnPressed : undefined,
                  ]}
                  hitSlop={6}
                >
                  <Text style={styles.cardActionText}>Make Payment</Text>
                </Pressable>
                <Pressable
                  onPress={() => openEditModal(loan.id)}
                  style={({ pressed }) => [
                    styles.cardActionBtn,
                    styles.editActionBtn,
                    pressed ? styles.btnPressed : undefined,
                  ]}
                  hitSlop={6}
                >
                  <Text style={styles.cardActionText}>Edit</Text>
                </Pressable>
                <Pressable
                  onPress={() => setPriorityVisible(true)}
                  style={({ pressed }) => [styles.cardActionBtn, styles.priorityBtn, pressed ? styles.btnPressed : undefined]}
                  hitSlop={6}
                >
                  <Text style={styles.priorityBtnText}>Priority Payment</Text>
                </Pressable>
                <Pressable
                  onPress={() => {
                    setPurchasesModalLoanId(loan.id);
                    setPurchasesInput(String(loan.purchases_this_month || 0));
                  }}
                  style={({ pressed }) => [styles.cardActionBtn, styles.purchasesBtn, pressed ? styles.btnPressed : undefined]}
                  hitSlop={6}
                >
                  <Text style={styles.priorityBtnText}>Purchases This Month</Text>
                </Pressable>
                <Pressable
                  onPress={() =>
                    Alert.alert("Delete Promotion", `Delete ${loan.name}?`, [
                      { text: "Cancel", style: "cancel" },
                      {
                        text: "Delete",
                        style: "destructive",
                        onPress: () => {
                          deleteLoan(loan.id);
                          reload();
                        },
                      },
                    ])
                  }
                  style={({ pressed }) => [
                    styles.cardActionBtn,
                    styles.deleteActionBtn,
                    pressed ? styles.btnPressed : undefined,
                  ]}
                  hitSlop={6}
                >
                  <Text style={styles.cardActionText}>Delete</Text>
                </Pressable>
              </View>
              <View style={styles.loanDivider} />
            </GlassCard>
          </Animated.View>
        );
      }) : null}

      {loanView === "current" ? (
      <Animated.View entering={FadeInDown.delay(220)}>
        <GlassCard style={{ marginTop: 10 }}>
          <Text style={[styles.sectionLabel, { color: c.tabIconDefault }]}>Payment tracking</Text>
          <Text style={[styles.loanMeta, { color: c.text }]}>Selected: {selectedLoan?.name ?? "None"}</Text>
          {paymentSuccessBanner ? <Text style={styles.selectionBanner}>{paymentSuccessBanner}</Text> : null}
          <TextInput value={paymentAmount} onChangeText={setPaymentAmount} keyboardType="decimal-pad" placeholder="$ payment amount" placeholderTextColor={c.tabIconDefault} style={[styles.input, { color: c.text, borderColor: c.border }]} />
          <Animated.View style={actionPressStyle}>
          <Pressable
            onPressIn={() => (actionPress.value = 1)}
            onPressOut={() => (actionPress.value = 0)}
            onPress={() => {
              const amount = Number(paymentAmount);
              if (!selectedLoanId || !Number.isFinite(amount) || amount <= 0) return;
              Haptics.selectionAsync();
              addLoanPayment(selectedLoanId, amount, new Date().toISOString());
              reload();
            }}
            style={[styles.addBtn, { backgroundColor: c.accentPositive }]}
            hitSlop={8}
          >
            <Text style={styles.addBtnText}>Apply Loan Payment</Text>
          </Pressable>
          </Animated.View>
          {loanPayments.slice(0, 8).map((p) => (
            <Text key={p.id} style={[styles.historyRow, { color: c.tabIconDefault }]}>
              {new Date(p.paid_at).toLocaleDateString()} • {p.loan_name} • ${p.amount.toFixed(2)} • left ${p.balance_after.toFixed(2)}
            </Text>
          ))}
        </GlassCard>
      </Animated.View>
      ) : null}
      <Modal visible={!!pickerField} transparent animationType="slide" onRequestClose={() => setPickerField(null)}>
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalCard, { backgroundColor: "#FFFFFF", borderColor: "#D1D5DB" }]}>
            <Text style={[styles.sectionLabel, { color: "#4B5563" }]}>
              {pickerField === "start" ? "Pick Start Date" : pickerField === "end" ? "Pick End Date" : "Pick Expiration Date"}
            </Text>
            <View style={styles.pickerShell}>
            <DateTimePicker
              value={pickerDate}
              mode="date"
              display={Platform.OS === "ios" ? "compact" : "default"}
              locale="en-US"
              textColor="#111827"
              themeVariant="light"
              accentColor="#2F80FF"
              onChange={(_, selected) => {
                if (!selected) return;
                setPickerDate(selected);
              }}
            />
            </View>
            <View style={styles.pickerActions}>
              <Pressable onPress={() => setPickerField(null)} style={[styles.pickerBtn, { borderColor: "#D1D5DB" }]}>
                <Text style={[styles.secondaryText, { color: "#4B5563" }]}>Cancel</Text>
              </Pressable>
              <Pressable onPress={applyPickedDate} style={[styles.pickerBtn, styles.pickerApply]}>
                <Text style={styles.addBtnText}>Apply Date</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
      <Modal visible={editModalVisible} transparent animationType="slide" onRequestClose={() => setEditModalVisible(false)}>
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalCard, { backgroundColor: "#FFFFFF", borderColor: "#D1D5DB" }]}>
            <Text style={[styles.sectionHeader, { color: "#111827" }]}>Edit Loan</Text>
            <TextInput
              value={editName}
              onChangeText={setEditName}
              placeholder="Loan name"
              placeholderTextColor="#9CA3AF"
              style={[styles.input, { borderColor: "#D1D5DB", color: "#111827" }]}
            />
            <TextInput
              value={editCurrentBalance}
              onChangeText={(v) => setEditCurrentBalance(v.replace(/[^0-9.]/g, ""))}
              keyboardType="decimal-pad"
              placeholder="Current Balance"
              placeholderTextColor="#9CA3AF"
              style={[styles.input, { borderColor: "#D1D5DB", color: "#111827" }]}
            />
            <TextInput
              value={editAmountBorrowed}
              onChangeText={(v) => setEditAmountBorrowed(v.replace(/[^0-9.]/g, ""))}
              keyboardType="decimal-pad"
              placeholder="Total Amount"
              placeholderTextColor="#9CA3AF"
              style={[styles.input, { borderColor: "#D1D5DB", color: "#111827" }]}
            />
            <TextInput
              value={editMonthlyTarget}
              onChangeText={(v) => setEditMonthlyTarget(v.replace(/[^0-9.]/g, ""))}
              keyboardType="decimal-pad"
              placeholder="Monthly Target"
              placeholderTextColor="#9CA3AF"
              style={[styles.input, { borderColor: "#D1D5DB", color: "#111827" }]}
            />
            <Pressable onPress={() => openDatePicker("start", "edit")} style={[styles.dateChip, { borderColor: "#D1D5DB" }]}>
              <Text style={[styles.chipText, { color: "#111827" }]}>Start {formatDatePretty(editStartDate)}</Text>
            </Pressable>
            <Pressable onPress={() => openDatePicker("end", "edit")} style={[styles.dateChip, { borderColor: "#D1D5DB" }]}>
              <Text style={[styles.chipText, { color: "#111827" }]}>End {formatDatePretty(editEndDate)}</Text>
            </Pressable>
            <Pressable onPress={() => openDatePicker("expiration", "edit")} style={[styles.dateChip, { borderColor: "#D1D5DB" }]}>
              <Text style={[styles.chipText, { color: "#111827" }]}>0% Ends {formatDatePretty(editExpirationDate)}</Text>
            </Pressable>
            <TextInput
              value={editNotes}
              onChangeText={setEditNotes}
              multiline
              scrollEnabled
              textAlignVertical="top"
              placeholder="Notes"
              placeholderTextColor="#9CA3AF"
              style={[styles.notesInput, { borderColor: "#D1D5DB", color: "#111827" }]}
            />
            {editSaved ? (
              <View style={styles.savedBanner}>
                <Text style={styles.savedBannerText}>Saved successfully</Text>
              </View>
            ) : null}
            <View style={styles.pickerActions}>
              <Pressable onPress={() => setEditModalVisible(false)} style={[styles.pickerBtn, { borderColor: "#D1D5DB" }]}>
                <Text style={[styles.secondaryText, { color: "#4B5563" }]}>Cancel</Text>
              </Pressable>
              <Pressable onPress={saveEditModal} style={[styles.pickerBtn, styles.pickerApply]}>
                <Text style={styles.addBtnText}>Save Changes</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
      <Modal visible={priorityVisible} transparent animationType="slide" onRequestClose={() => setPriorityVisible(false)}>
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalCard, { backgroundColor: "#FFFFFF", borderColor: "#D1D5DB" }]}>
            <Text style={[styles.sectionHeader, { color: "#111827" }]}>Priority Payment Plan</Text>
            <Text style={[styles.sectionLabel, { color: "#4B5563" }]}>Smart order to avoid interest</Text>

            <View style={styles.priorityCard}>
              <Text style={styles.priorityBadge}>PRIORITY #1</Text>
              <Text style={styles.priorityTitle}>Monthly Purchases</Text>
              <Text style={styles.priorityMeta}>${priorityPlan.totalPurchases.toFixed(2)} this month</Text>
              <Text style={styles.priorityMeta}>Pay purchases first to avoid revolving interest</Text>
            </View>

            <View style={styles.priorityCard}>
              <Text style={styles.priorityBadge}>PRIORITY #2</Text>
              <Text style={styles.priorityTitle}>Monthly Promotion Targets</Text>
              <Text style={styles.priorityMeta}>${priorityPlan.totalMonthlyTargets.toFixed(2)} total targets</Text>
              <Text style={styles.priorityMeta}>Recommended payment: ${priorityPlan.totalMonthlyTargets.toFixed(2)}</Text>
            </View>

            {priorityPlan.promotions.map((promo, index) => (
              <View key={promo.id} style={styles.priorityCard}>
                <Text style={styles.priorityBadge}>PRIORITY #{index + 3}</Text>
                <Text style={styles.priorityTitle}>{promo.name}</Text>
                <Text style={styles.priorityMeta}>Expires in {promo.monthsLeft} month(s)</Text>
                <Text style={styles.priorityMeta}>${promo.current_balance.toFixed(2)} remaining</Text>
                <Text style={styles.priorityMeta}>Recommended payment: ${promo.safePayment.toFixed(2)}/month</Text>
                <Text style={[styles.priorityStatus, { color: promo.risk ? "#C62828" : "#16A34A" }]}>
                  {promo.risk ? "Risk of deferred interest" : "On track"}
                </Text>
              </View>
            ))}

            <Pressable onPress={() => setPriorityVisible(false)} style={[styles.pickerBtn, styles.pickerApply, { marginTop: 8 }]}>
              <Text style={styles.addBtnText}>Close</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
      <Modal visible={makePaymentVisible} transparent animationType="fade" onRequestClose={() => setMakePaymentVisible(false)}>
        <View style={styles.centerModalBackdrop}>
          <View style={styles.centerModalCard}>
            <Text style={styles.modalTitle}>Make Loan Payment</Text>
            <Text style={styles.modalLine}>Loan: {makePaymentLoan?.name ?? "-"}</Text>
            <Text style={styles.modalLine}>Remaining Balance: ${makePaymentLoan?.current_balance.toFixed(2) ?? "0.00"}</Text>
            <Text style={styles.modalLine}>
              Recommended Payment: $
              {makePaymentLoan
                ? (
                    makePaymentLoan.monthly_payment_target > 0
                      ? makePaymentLoan.monthly_payment_target
                      : makePaymentLoan.current_balance / Math.max(1, getRemainingMonths(makePaymentLoan.interest_free_expiration))
                  ).toFixed(2)
                : "0.00"}
            </Text>
            <TextInput
              value={makePaymentAmount}
              onChangeText={(v) => setMakePaymentAmount(v.replace(/[^0-9.]/g, ""))}
              keyboardType="decimal-pad"
              placeholder="Payment amount"
              placeholderTextColor="#9CA3AF"
              style={styles.input}
            />
            <TextInput
              value={makePaymentNotes}
              onChangeText={setMakePaymentNotes}
              placeholder="Notes (optional)"
              placeholderTextColor="#9CA3AF"
              style={styles.input}
            />
            <View style={styles.modalActionRow}>
              <Pressable onPress={() => setMakePaymentVisible(false)} style={styles.modalCancel}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </Pressable>
              <Pressable
                onPress={() => {
                  const amount = Number(makePaymentAmount);
                  if (!makePaymentLoanId || !Number.isFinite(amount) || amount <= 0) {
                    Alert.alert("Invalid Payment", "Please enter a valid payment amount.");
                    return;
                  }
                  addLoanPayment(makePaymentLoanId, amount, new Date().toISOString());
                  setMakePaymentVisible(false);
                  reload();
                  setPaymentAmount(makePaymentAmount);
                  setPaymentSuccessBanner("Payment Applied Successfully");
                  setTimeout(() => setPaymentSuccessBanner(""), 1400);
                }}
                style={styles.modalSave}
              >
                <Text style={styles.actionText}>Apply Payment</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
      <Modal visible={!!purchasesModalLoanId} transparent animationType="fade" onRequestClose={() => setPurchasesModalLoanId(null)}>
        <View style={styles.centerModalBackdrop}>
          <View style={styles.centerModalCard}>
            <Text style={styles.modalTitle}>Monthly Purchases</Text>
            <Text style={styles.modalLine}>Loan: {loans.find((l) => l.id === purchasesModalLoanId)?.name ?? "-"}</Text>
            <TextInput
              value={purchasesInput}
              onChangeText={(v) => setPurchasesInput(v.replace(/[^0-9.]/g, ""))}
              keyboardType="decimal-pad"
              placeholder="Purchases made this month"
              placeholderTextColor="#9CA3AF"
              style={styles.input}
            />
            <View style={styles.modalActionRow}>
              <Pressable onPress={() => setPurchasesModalLoanId(null)} style={styles.modalCancel}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </Pressable>
              <Pressable
                onPress={() => {
                  if (!purchasesModalLoanId) return;
                  setLoanPurchasesThisMonth(purchasesModalLoanId, Number(purchasesInput) || 0);
                  setPurchasesModalLoanId(null);
                  reload();
                }}
                style={styles.modalSave}
              >
                <Text style={styles.actionText}>Save Purchases</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
      </View>
      </KeyboardAvoidingView>
    </ScreenWrap>
  );
}

const styles = StyleSheet.create({
  headerBanner: {
    borderRadius: 18,
    padding: 18,
    backgroundColor: "#2563EB",
    shadowColor: "#2563EB",
    shadowOpacity: 0.24,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    marginBottom: 6,
  },
  headerTitle: { color: "#FFFFFF", fontSize: 28, fontWeight: "800" },
  headerSubtitle: { marginTop: 4, color: "rgba(255,255,255,0.92)", fontSize: 14, fontWeight: "600" },
  sectionLabel: { fontSize: 14, textTransform: "uppercase", letterSpacing: 0.8, fontWeight: "700" },
  sectionHeader: { fontSize: 24, fontWeight: "800", marginBottom: 6 },
  segmentWrap: {
    flexDirection: "row",
    borderWidth: 1,
    borderRadius: 14,
    padding: 4,
    marginBottom: 6,
    gap: 6,
  },
  segmentBtn: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 10,
    alignItems: "center",
    paddingVertical: 11,
    minHeight: 46,
  },
  segmentBtnActive: {
    backgroundColor: "rgba(47,128,255,0.65)",
    shadowColor: "#2F80FF",
    shadowOpacity: 0.45,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  segmentText: { fontSize: 15, fontWeight: "800" },
  fieldLabel: { marginTop: 12, fontSize: 16, fontWeight: "700" },
  input: {
    marginTop: 8,
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 17,
    backgroundColor: "#FFFFFF",
    color: "#111827",
  },
  notesInput: {
    marginTop: 8,
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 17,
    minHeight: 128,
    maxHeight: 210,
    backgroundColor: "#FFFFFF",
  },
  chipRow: { marginTop: 10, gap: 10 },
  dateChip: {
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 13,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    minHeight: 50,
    backgroundColor: "#EFF6FF",
  },
  chipText: { fontSize: 15, fontWeight: "700", color: "#111827" },
  addBtn: {
    marginTop: 14,
    borderRadius: 14,
    alignItems: "center",
    paddingVertical: 13,
    backgroundColor: "#2F80FF",
    shadowColor: "#2F80FF",
    shadowOpacity: 0.45,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  addBtnText: { color: "white", fontSize: 16, fontWeight: "800" },
  secondaryBtn: { marginTop: 10, borderWidth: 1, borderRadius: 12, alignItems: "center", paddingVertical: 12, minHeight: 48 },
  secondaryText: { fontSize: 15, fontWeight: "700" },
  preview: { marginTop: 12, fontSize: 14, fontWeight: "700" },
  loanName: { fontSize: 21, fontWeight: "800", color: "#111827" },
  loanMeta: { marginTop: 6, fontSize: 15, fontWeight: "600", lineHeight: 22, color: "#4B5563" },
  warning: { marginTop: 9, fontSize: 14, fontWeight: "800" },
  progressTrack: { marginTop: 10, height: 12, borderRadius: 999, overflow: "hidden" },
  progressFill: { height: "100%", borderRadius: 999 },
  loanCardWrap: {
    marginTop: 14,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    shadowColor: "#111827",
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 },
  },
  loanCardSelected: {
    borderColor: "#60A5FA",
    shadowColor: "#60A5FA",
    shadowOpacity: 0.22,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
  },
  actionRow: { marginTop: 12, flexDirection: "row", gap: 8, flexWrap: "wrap" },
  cardActionBtn: {
    flexBasis: "48%",
    flexGrow: 1,
    borderWidth: 1,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    minHeight: 48,
    borderColor: "transparent",
    shadowColor: "#111827",
    shadowOpacity: 0.1,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  cardActionText: { fontSize: 14, fontWeight: "800", color: "#0F172A", textAlign: "center", width: "100%" },
  makePaymentBtn: { backgroundColor: "#60A5FA" },
  editActionBtn: { backgroundColor: "#93C5FD" },
  priorityBtn: {
    borderColor: "#F59E0B",
    backgroundColor: "#F59E0B",
    shadowColor: "#F59E0B",
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
  priorityBtnText: { color: "#FFFFFF", fontSize: 14, fontWeight: "800" },
  purchasesBtn: {
    borderColor: "#8B5CF6",
    backgroundColor: "#8B5CF6",
    borderRadius: 14,
  },
  deleteActionBtn: { backgroundColor: "#FCA5A5" },
  btnPressed: { opacity: 0.85, transform: [{ scale: 0.985 }] },
  loanDivider: {
    marginTop: 12,
    height: 1,
    backgroundColor: "#E5E7EB",
  },
  historyRow: { marginTop: 10, fontSize: 14, lineHeight: 21, color: "#4B5563" },
  purchasesLabel: { marginTop: 6, fontSize: 14, fontWeight: "800", color: "#8B5CF6" },
  monthLabel: { marginTop: 2, fontSize: 12, fontWeight: "700", color: "#6B7280" },
  totalDueLabel: { marginTop: 3, fontSize: 15, fontWeight: "900", color: "#DC2626" },
  selectionBanner: {
    marginTop: 8,
    marginBottom: 2,
    alignSelf: "flex-start",
    backgroundColor: "#DBEAFE",
    color: "#1D4ED8",
    fontSize: 12,
    fontWeight: "800",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    overflow: "hidden",
  },
  centerModalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(17,24,39,0.28)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  centerModalCard: {
    width: "100%",
    maxWidth: 430,
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    shadowColor: "#111827",
    shadowOpacity: 0.12,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  modalTitle: { fontSize: 22, fontWeight: "800", marginBottom: 8, color: "#111827" },
  modalLine: { fontSize: 14, color: "#4B5563", marginBottom: 6, fontWeight: "600" },
  modalActionRow: { marginTop: 14, flexDirection: "row", gap: 10 },
  modalCancel: { flex: 1, borderRadius: 10, borderWidth: 1, borderColor: "#D1D5DB", alignItems: "center", paddingVertical: 10 },
  modalCancelText: { color: "#4B5563", fontWeight: "700", fontSize: 14 },
  modalSave: { flex: 1, borderRadius: 10, backgroundColor: "#60A5FA", alignItems: "center", paddingVertical: 10 },
  actionText: { color: "#FFFFFF", fontSize: 14, fontWeight: "800" },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(17,24,39,0.35)",
    justifyContent: "flex-end",
    padding: 14,
  },
  modalCard: {
    borderWidth: 1,
    borderRadius: 18,
    padding: 14,
  },
  pickerShell: {
    marginTop: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(37,99,235,0.38)",
    backgroundColor: "#F8FAFC",
    shadowColor: "#2563EB",
    shadowOpacity: 0.15,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
    transform: [{ scale: 1.03 }],
  },
  pickerActions: { marginTop: 12, flexDirection: "row", gap: 10 },
  pickerBtn: { flex: 1, borderWidth: 1, borderRadius: 12, alignItems: "center", paddingVertical: 12, minHeight: 50 },
  pickerApply: {
    backgroundColor: "#2F80FF",
    borderColor: "#2F80FF",
    shadowColor: "#2F80FF",
    shadowOpacity: 0.4,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 7,
  },
  savedBanner: {
    marginTop: 10,
    backgroundColor: "rgba(46,204,113,0.22)",
    borderWidth: 1,
    borderColor: "rgba(46,204,113,0.8)",
    borderRadius: 10,
    paddingVertical: 9,
    alignItems: "center",
  },
  savedBannerText: {
    color: "#065F46",
    fontSize: 13,
    fontWeight: "800",
  },
  priorityCard: {
    marginTop: 10,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    padding: 12,
    backgroundColor: "#F9FAFB",
  },
  priorityBadge: {
    alignSelf: "flex-start",
    backgroundColor: "#2563EB",
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "800",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    overflow: "hidden",
  },
  priorityTitle: { marginTop: 8, fontSize: 16, fontWeight: "800", color: "#111827" },
  priorityMeta: { marginTop: 3, fontSize: 13, color: "#4B5563", fontWeight: "600" },
  priorityStatus: { marginTop: 6, fontSize: 13, fontWeight: "800" },
});

