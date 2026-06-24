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
import {
  addLoan,
  addLoanPayment,
  applyLoanPurchaseThisMonth,
  deleteLoan,
  getCards,
  getLoanPayments,
  getLoans,
  getRemainingMonths,
  updateLoan,
} from "@/lib/db";

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

/** End / APR expiration default: exactly 12 calendar months after promotion start. */
function promotionEndFromStart(start: Date): Date {
  const s = startOfDay(start);
  return new Date(s.getFullYear(), s.getMonth() + 12, s.getDate());
}

export default function LoansScreen() {
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
  const [purchasesModalNonce, setPurchasesModalNonce] = useState(0);
  const [purchasesInput, setPurchasesInput] = useState("");

  const [name, setName] = useState("");
  const [amountBorrowed, setAmountBorrowed] = useState("4000");
  const [startDate, setStartDate] = useState(() => startOfDay(new Date()));
  const [endDate, setEndDate] = useState(() => promotionEndFromStart(new Date()));
  const [expirationDate, setExpirationDate] = useState(() => promotionEndFromStart(new Date()));
  const [monthlyTarget, setMonthlyTarget] = useState("");
  const [notes, setNotes] = useState("0% APR promotion");
  const [editingLoanId, setEditingLoanId] = useState<number | null>(null);
  const [pickerField, setPickerField] = useState<"start" | "end" | "expiration" | null>(null);
  const [pickerMode, setPickerMode] = useState<"create" | "edit">("create");
  const [pickerDate, setPickerDate] = useState(new Date());
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
  const datePress = useSharedValue(0);
  const datePressStyle = useAnimatedStyle(() => ({
    transform: [{ scale: withSpring(datePress.value ? 0.985 : 1) }],
    opacity: withSpring(datePress.value ? 0.9 : 1),
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
    const today = startOfDay(new Date());
    setStartDate(today);
    const endAt = promotionEndFromStart(today);
    setEndDate(endAt);
    setExpirationDate(endAt);
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
      const s = startOfDay(pickerDate);
      const endPlus = promotionEndFromStart(s);
      if (pickerMode === "create") {
        setStartDate(s);
        setEndDate(endPlus);
        setExpirationDate(endPlus);
      } else {
        setEditStartDate(s);
        setEditEndDate(endPlus);
        setEditExpirationDate(endPlus);
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

      <View style={styles.segmentWrap}>
        <Pressable
          onPress={() => setLoanView("new")}
          style={[styles.segmentBtn, loanView === "new" ? styles.segmentBtnActive : undefined]}
        >
          <Text style={[styles.segmentText, { color: loanView === "new" ? "#FFFFFF" : "#4B5563" }]}>New Loan</Text>
        </Pressable>
        <Pressable
          onPress={() => setLoanView("current")}
          style={[styles.segmentBtn, loanView === "current" ? styles.segmentBtnActive : undefined]}
        >
          <Text style={[styles.segmentText, { color: loanView === "current" ? "#FFFFFF" : "#4B5563" }]}>
            Current Loans
          </Text>
        </Pressable>
      </View>

      {loanView === "new" ? (
      <Animated.View entering={FadeInDown.delay(70)} key="new-loan-section">
        <GlassCard style={styles.formCard}>
          <Text style={styles.sectionHeader}>Create New Loan / Promotion</Text>
          <Text style={styles.sectionLabelMuted}>Add promotion details</Text>

          <View style={[styles.fieldBlock, styles.fieldBlockFirst]}>
            <Text style={styles.fieldLabel}>Card Name</Text>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="Enter credit card name"
              placeholderTextColor="#9CA3AF"
              returnKeyType="next"
              style={styles.input}
            />
          </View>

          <View style={styles.fieldBlock}>
            <Text style={styles.fieldLabel}>Amount Borrowed ($)</Text>
            <TextInput
              value={amountBorrowed}
              onChangeText={(v) => setAmountBorrowed(v.replace(/[^0-9.]/g, ""))}
              keyboardType="decimal-pad"
              returnKeyType="done"
              placeholder="4000.00"
              placeholderTextColor="#9CA3AF"
              style={styles.input}
            />
          </View>

          <View style={styles.fieldBlock}>
            <Text style={styles.fieldLabel}>Promotion Start Date</Text>
            <Animated.View style={datePressStyle}>
              <Pressable
                onPressIn={() => (datePress.value = 1)}
                onPressOut={() => (datePress.value = 0)}
                onPress={() => openDatePicker("start", "create")}
                style={({ pressed }) => [styles.dateField, pressed ? styles.dateFieldPressed : undefined]}
              >
                <Ionicons name="calendar-outline" size={18} color="#374151" />
                <Text style={styles.dateFieldText}>{formatDatePretty(startDate)}</Text>
              </Pressable>
            </Animated.View>
          </View>

          <View style={styles.fieldBlock}>
            <Text style={styles.fieldLabel}>Promotion End Date</Text>
            <Animated.View style={datePressStyle}>
              <Pressable
                onPressIn={() => (datePress.value = 1)}
                onPressOut={() => (datePress.value = 0)}
                onPress={() => openDatePicker("end", "create")}
                style={({ pressed }) => [styles.dateField, pressed ? styles.dateFieldPressed : undefined]}
              >
                <Ionicons name="calendar-outline" size={18} color="#374151" />
                <Text style={styles.dateFieldText}>{formatDatePretty(endDate)}</Text>
              </Pressable>
            </Animated.View>
          </View>

          <View style={styles.fieldBlock}>
            <Text style={styles.fieldLabel}>0% APR End Date</Text>
            <Animated.View style={datePressStyle}>
              <Pressable
                onPressIn={() => (datePress.value = 1)}
                onPressOut={() => (datePress.value = 0)}
                onPress={() => openDatePicker("expiration", "create")}
                style={({ pressed }) => [styles.dateField, pressed ? styles.dateFieldPressed : undefined]}
              >
                <Ionicons name="alarm-outline" size={18} color="#374151" />
                <Text style={styles.dateFieldText}>{formatDatePretty(expirationDate)}</Text>
              </Pressable>
            </Animated.View>
          </View>

          <View style={styles.fieldBlock}>
            <Text style={styles.fieldLabel}>Monthly Payment Target ($)</Text>
            <TextInput
              value={monthlyTarget}
              onChangeText={(v) => setMonthlyTarget(v.replace(/[^0-9.]/g, ""))}
              keyboardType="decimal-pad"
              returnKeyType="done"
              placeholder={`Auto: ${suggestedMonthly.toFixed(2)}`}
              placeholderTextColor="#9CA3AF"
              style={styles.input}
            />
          </View>

          <View style={styles.fieldBlock}>
            <Text style={styles.fieldLabel}>Notes</Text>
            <TextInput
              value={notes}
              onChangeText={setNotes}
              multiline
              scrollEnabled
              textAlignVertical="top"
              autoCorrect
              spellCheck
              blurOnSubmit={false}
              returnKeyType="default"
              placeholder="Explain terms, fee notes, transfer source, and reminders..."
              placeholderTextColor="#9CA3AF"
              style={styles.notesInput}
            />
          </View>

          <Text style={styles.preview}>
            Months remaining: {monthsPreview} • Recommended monthly payment: ${suggestedMonthly.toFixed(2)}
          </Text>

          <View style={styles.createBtnOuter}>
            <Pressable
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
              style={({ pressed }) => [styles.createOutlineBtn, pressed ? styles.outlineBtnPressed : undefined]}
              hitSlop={8}
            >
              <Text style={styles.createOutlineBtnText}>{editingLoanId ? "Save Promotion" : "Create New Loan / Promotion"}</Text>
            </Pressable>
          </View>

          {editingLoanId ? (
            <Pressable onPress={clearForm} style={({ pressed }) => [styles.secondaryOutlineBtn, pressed ? styles.outlineBtnPressed : undefined]}>
              <Text style={styles.secondaryOutlineBtnText}>Cancel Edit</Text>
            </Pressable>
          ) : null}
        </GlassCard>
      </Animated.View>
      ) : (
      <Animated.View entering={FadeInDown.delay(70)} key="current-loans-section">
        <GlassCard style={styles.formCard}>
          <Text style={styles.sectionHeader}>Current Loans</Text>
          <Text style={styles.sectionLabelMuted}>Portfolio summary</Text>
          <Text style={styles.loanMeta}>Active Loans: {totals.activeCount}</Text>
          <Text style={styles.loanMeta}>Remaining Balance: ${totals.totalRemaining.toFixed(2)}</Text>
          <Text style={styles.loanMeta}>Monthly Target Total: ${totals.totalMonthly.toFixed(2)}</Text>
        </GlassCard>
      </Animated.View>
      )}

      {loanView === "current" ? loans.map((loan, idx) => {
        const months = getRemainingMonths(loan.interest_free_expiration);
        const progress = loan.amount_borrowed > 0 ? (loan.amount_borrowed - loan.current_balance) / loan.amount_borrowed : 0;
        const needed = months > 0 ? loan.current_balance / months : loan.current_balance;
        const purchases = loan.purchases_this_month || 0;
        const totalDue = loan.monthly_payment_target + purchases;
        const statusTone = months <= 1 ? "#9A3412" : months <= 3 ? "#A16207" : "#3F4D63";
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
                <Text style={styles.loanName}>{loan.name}</Text>
                <Text style={styles.loanMetaMuted}>
                  Balance ${loan.current_balance.toFixed(2)} of ${loan.amount_borrowed.toFixed(2)}
                </Text>
                <Text style={styles.loanMetaMuted}>
                  Monthly target ${needed.toFixed(2)} • {months} month(s) left
                </Text>
                <Text style={styles.purchasesLabel}>Purchases This Month: ${purchases.toFixed(2)}</Text>
                <Text style={styles.monthLabel}>Current Month: {currentMonthLabel}</Text>
                <Text style={styles.totalDueLabel}>Total Due This Month: ${totalDue.toFixed(2)}</Text>
                <Text style={[styles.warning, { color: statusTone }]}>
                  {months <= 1 ? "Interest-free ending now" : months <= 3 ? "Interest-free ending soon" : "Promotion active"}
                </Text>
                <View style={styles.progressTrack}>
                  <View style={[styles.progressFill, { width: `${Math.max(0, Math.min(100, progress * 100))}%`, backgroundColor: statusTone }]} />
                </View>
              </Pressable>
              <View style={styles.cardActionPanel}>
                <View style={styles.cardActionRow}>
                  <Pressable
                    onPress={() => handleMakePayment(loan.id)}
                    style={({ pressed }) => [styles.cardActionBtn, pressed ? styles.cardActionBtnPressed : undefined]}
                    hitSlop={6}
                  >
                    <Text style={styles.cardActionText}>Make Payment</Text>
                  </Pressable>
                  <Pressable
                    onPress={() => openEditModal(loan.id)}
                    style={({ pressed }) => [styles.cardActionBtn, pressed ? styles.cardActionBtnPressed : undefined]}
                    hitSlop={6}
                  >
                    <Text style={styles.cardActionText}>Edit</Text>
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
                    style={({ pressed }) => [styles.cardActionBtn, pressed ? styles.cardActionBtnPressed : undefined]}
                    hitSlop={6}
                  >
                    <Text style={styles.cardActionText}>Delete</Text>
                  </Pressable>
                </View>
                <View style={styles.cardActionRowSecond}>
                  <Pressable
                    onPress={() => setPriorityVisible(true)}
                    style={({ pressed }) => [styles.cardActionBtn, pressed ? styles.cardActionBtnPressed : undefined]}
                    hitSlop={6}
                  >
                    <Text style={styles.cardActionText}>Priority Payment</Text>
                  </Pressable>
                  <Pressable
                    onPress={() => {
                      setPurchasesModalNonce((n) => n + 1);
                      setPurchasesInput("");
                      setPurchasesModalLoanId(loan.id);
                    }}
                    style={({ pressed }) => [styles.cardActionBtn, pressed ? styles.cardActionBtnPressed : undefined]}
                    hitSlop={6}
                  >
                    <Text style={styles.cardActionText}>Purchases This Month</Text>
                  </Pressable>
                </View>
              </View>
              <View style={styles.loanDivider} />
            </GlassCard>
          </Animated.View>
        );
      }) : null}

      {loanView === "current" ? (
      <Animated.View entering={FadeInDown.delay(220)}>
        <GlassCard style={styles.trackingCard}>
          <Text style={styles.sectionHeaderSmall}>Payment tracking</Text>
          <Text style={styles.loanMetaCenter}>Selected: {selectedLoan?.name ?? "None"}</Text>
          {paymentSuccessBanner ? <Text style={styles.selectionBanner}>{paymentSuccessBanner}</Text> : null}
          <Text style={[styles.fieldLabel, styles.fieldLabelSpaced]}>Amount</Text>
          <TextInput
            value={paymentAmount}
            onChangeText={setPaymentAmount}
            keyboardType="decimal-pad"
            placeholder="Payment amount"
            placeholderTextColor="#9CA3AF"
            style={styles.input}
          />
          <View style={styles.applyPaymentWrap}>
            <Pressable
              onPress={() => {
                const amount = Number(paymentAmount);
                if (!selectedLoanId || !Number.isFinite(amount) || amount <= 0) return;
                Haptics.selectionAsync();
                addLoanPayment(selectedLoanId, amount, new Date().toISOString());
                reload();
              }}
              style={({ pressed }) => [styles.applyLoanPaymentBtn, pressed ? styles.outlineBtnPressed : undefined]}
              hitSlop={8}
            >
              <Text style={styles.applyLoanPaymentBtnText}>Apply Loan Payment</Text>
            </Pressable>
          </View>
          {loanPayments.slice(0, 8).map((p) => (
            <Text key={p.id} style={styles.historyRow}>
              {new Date(p.paid_at).toLocaleDateString()} • {p.loan_name} • ${p.amount.toFixed(2)} • left ${p.balance_after.toFixed(2)}
            </Text>
          ))}
        </GlassCard>
      </Animated.View>
      ) : null}
      <Modal visible={!!pickerField} transparent animationType="slide" onRequestClose={() => setPickerField(null)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCardSolid}>
            <Text style={styles.modalPickerTitle}>
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
              accentColor="#3F4D63"
              onChange={(_, selected) => {
                if (!selected) return;
                setPickerDate(selected);
              }}
            />
            </View>
            <View style={styles.modalBtnRow}>
              <Pressable onPress={() => setPickerField(null)} style={({ pressed }) => [styles.modalOutlineBtn, pressed ? styles.outlineBtnPressed : undefined]}>
                <Text style={styles.modalOutlineBtnText}>Cancel</Text>
              </Pressable>
              <Pressable onPress={applyPickedDate} style={({ pressed }) => [styles.modalOutlineBtn, pressed ? styles.outlineBtnPressed : undefined]}>
                <Text style={styles.modalOutlineBtnText}>Apply Date</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
      <Modal visible={editModalVisible} transparent animationType="slide" onRequestClose={() => setEditModalVisible(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCardSolid}>
            <Text style={styles.modalSectionTitle}>Edit Loan</Text>
            <Text style={styles.fieldLabel}>Card name</Text>
            <TextInput
              value={editName}
              onChangeText={setEditName}
              placeholder="Loan name"
              placeholderTextColor="#9CA3AF"
              style={styles.input}
            />
            <Text style={styles.fieldLabel}>Current balance ($)</Text>
            <TextInput
              value={editCurrentBalance}
              onChangeText={(v) => setEditCurrentBalance(v.replace(/[^0-9.]/g, ""))}
              keyboardType="decimal-pad"
              placeholder="Current balance"
              placeholderTextColor="#9CA3AF"
              style={styles.input}
            />
            <Text style={styles.fieldLabel}>Amount borrowed ($)</Text>
            <TextInput
              value={editAmountBorrowed}
              onChangeText={(v) => setEditAmountBorrowed(v.replace(/[^0-9.]/g, ""))}
              keyboardType="decimal-pad"
              placeholder="Total amount"
              placeholderTextColor="#9CA3AF"
              style={styles.input}
            />
            <Text style={styles.fieldLabel}>Monthly payment target ($)</Text>
            <TextInput
              value={editMonthlyTarget}
              onChangeText={(v) => setEditMonthlyTarget(v.replace(/[^0-9.]/g, ""))}
              keyboardType="decimal-pad"
              placeholder="Monthly target"
              placeholderTextColor="#9CA3AF"
              style={styles.input}
            />
            <Text style={styles.fieldLabel}>Promotion start date</Text>
            <Pressable onPress={() => openDatePicker("start", "edit")} style={({ pressed }) => [styles.dateField, pressed ? styles.dateFieldPressed : undefined]}>
              <Ionicons name="calendar-outline" size={18} color="#374151" />
              <Text style={styles.dateFieldText}>{formatDatePretty(editStartDate)}</Text>
            </Pressable>
            <Text style={styles.fieldLabel}>Promotion end date</Text>
            <Pressable onPress={() => openDatePicker("end", "edit")} style={({ pressed }) => [styles.dateField, pressed ? styles.dateFieldPressed : undefined]}>
              <Ionicons name="calendar-outline" size={18} color="#374151" />
              <Text style={styles.dateFieldText}>{formatDatePretty(editEndDate)}</Text>
            </Pressable>
            <Text style={styles.fieldLabel}>0% APR end date</Text>
            <Pressable onPress={() => openDatePicker("expiration", "edit")} style={({ pressed }) => [styles.dateField, pressed ? styles.dateFieldPressed : undefined]}>
              <Ionicons name="alarm-outline" size={18} color="#374151" />
              <Text style={styles.dateFieldText}>{formatDatePretty(editExpirationDate)}</Text>
            </Pressable>
            <Text style={styles.fieldLabel}>Notes</Text>
            <TextInput
              value={editNotes}
              onChangeText={setEditNotes}
              multiline
              scrollEnabled
              textAlignVertical="top"
              placeholder="Notes"
              placeholderTextColor="#9CA3AF"
              style={styles.notesInput}
            />
            {editSaved ? (
              <View style={styles.savedBanner}>
                <Text style={styles.savedBannerText}>Saved successfully</Text>
              </View>
            ) : null}
            <View style={styles.modalBtnRow}>
              <Pressable onPress={() => setEditModalVisible(false)} style={({ pressed }) => [styles.modalOutlineBtn, pressed ? styles.outlineBtnPressed : undefined]}>
                <Text style={styles.modalOutlineBtnText}>Cancel</Text>
              </Pressable>
              <Pressable onPress={saveEditModal} style={({ pressed }) => [styles.modalOutlineBtn, pressed ? styles.outlineBtnPressed : undefined]}>
                <Text style={styles.modalOutlineBtnText}>Save Changes</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
      <Modal visible={priorityVisible} transparent animationType="slide" onRequestClose={() => setPriorityVisible(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCardSolid}>
            <Text style={styles.modalSectionTitle}>Priority Payment Plan</Text>
            <Text style={styles.sectionLabelMuted}>Smart order to avoid interest</Text>

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
                <Text style={[styles.priorityStatus, { color: promo.risk ? "#7F1D1D" : "#3F4D63" }]}>
                  {promo.risk ? "Risk of deferred interest" : "On track"}
                </Text>
              </View>
            ))}

            <Pressable
              onPress={() => setPriorityVisible(false)}
              style={({ pressed }) => [styles.modalOutlineBtnFull, pressed ? styles.outlineBtnPressed : undefined, { marginTop: 8 }]}
            >
              <Text style={styles.modalOutlineBtnText}>Close</Text>
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
            <Text style={[styles.fieldLabel, styles.fieldLabelSpaced]}>Payment amount</Text>
            <TextInput
              value={makePaymentAmount}
              onChangeText={(v) => setMakePaymentAmount(v.replace(/[^0-9.]/g, ""))}
              keyboardType="decimal-pad"
              placeholder="Payment amount"
              placeholderTextColor="#9CA3AF"
              style={styles.input}
            />
            <Text style={[styles.fieldLabel, styles.fieldLabelSpaced]}>Notes (optional)</Text>
            <TextInput
              value={makePaymentNotes}
              onChangeText={setMakePaymentNotes}
              placeholder="Notes (optional)"
              placeholderTextColor="#9CA3AF"
              style={styles.input}
            />
            <View style={styles.modalBtnRow}>
              <Pressable onPress={() => setMakePaymentVisible(false)} style={({ pressed }) => [styles.modalOutlineBtn, pressed ? styles.outlineBtnPressed : undefined]}>
                <Text style={styles.modalOutlineBtnText}>Cancel</Text>
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
                style={({ pressed }) => [styles.modalOutlineBtn, pressed ? styles.outlineBtnPressed : undefined]}
              >
                <Text style={styles.modalOutlineBtnText}>Apply Payment</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
      <Modal
        visible={!!purchasesModalLoanId}
        transparent
        animationType="fade"
        onRequestClose={() => {
          Keyboard.dismiss();
          setPurchasesInput("");
          setPurchasesModalLoanId(null);
        }}
      >
        <Pressable
          style={styles.centerModalBackdrop}
          onPress={() => {
            Keyboard.dismiss();
            setPurchasesInput("");
            setPurchasesModalLoanId(null);
          }}
        >
          <Pressable style={styles.centerModalCard} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.modalTitle}>Purchases This Month</Text>
            <Text style={styles.modalLine}>Loan: {loans.find((l) => l.id === purchasesModalLoanId)?.name ?? "-"}</Text>
            <Text style={[styles.fieldLabel, styles.fieldLabelSpaced]}>New purchase amount ($)</Text>
            <TextInput
              key={`${purchasesModalLoanId ?? 0}-${purchasesModalNonce}`}
              value={purchasesInput}
              onChangeText={(v) => setPurchasesInput(v.replace(/[^0-9.]/g, ""))}
              keyboardType="decimal-pad"
              placeholderTextColor="#9CA3AF"
              style={styles.input}
            />
            <View style={styles.modalBtnRow}>
              <Pressable
                onPress={() => {
                  Keyboard.dismiss();
                  setPurchasesInput("");
                  setPurchasesModalLoanId(null);
                }}
                style={({ pressed }) => [styles.modalOutlineBtn, pressed ? styles.outlineBtnPressed : undefined]}
              >
                <Text style={styles.modalOutlineBtnText}>Cancel</Text>
              </Pressable>
              <Pressable
                onPress={() => {
                  if (!purchasesModalLoanId) return;
                  const amount = Number(purchasesInput);
                  if (!Number.isFinite(amount) || amount <= 0) {
                    Alert.alert("Amount required", "Enter a purchase amount greater than zero.");
                    return;
                  }
                  Keyboard.dismiss();
                  applyLoanPurchaseThisMonth(purchasesModalLoanId, amount);
                  setPurchasesInput("");
                  setPurchasesModalLoanId(null);
                  reload();
                }}
                style={({ pressed }) => [styles.modalOutlineBtn, pressed ? styles.outlineBtnPressed : undefined]}
              >
                <Text style={styles.modalOutlineBtnText}>Save</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
      </View>
      </KeyboardAvoidingView>
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
    marginBottom: 10,
    alignItems: "center",
  },
  headerTitle: {
    color: "#FFFFFF",
    fontSize: 29,
    fontWeight: "900",
    textAlign: "center",
    letterSpacing: 0.4,
  },
  headerSubtitle: {
    marginTop: 8,
    color: "rgba(255,255,255,0.86)",
    fontSize: 14,
    fontWeight: "600",
    textAlign: "center",
  },
  sectionHeader: {
    fontSize: 26,
    fontWeight: "900",
    marginBottom: 6,
    textAlign: "center",
    color: "#111827",
    letterSpacing: 0.2,
  },
  sectionHeaderSmall: {
    fontSize: 20,
    fontWeight: "900",
    marginBottom: 8,
    textAlign: "center",
    color: "#111827",
  },
  sectionLabelMuted: {
    fontSize: 13,
    fontWeight: "700",
    color: "#64748B",
    textAlign: "center",
    textTransform: "uppercase",
    letterSpacing: 0.6,
    marginBottom: 14,
  },
  formCard: { marginBottom: 4, paddingVertical: 4 },
  fieldBlock: { marginTop: 18 },
  fieldBlockFirst: { marginTop: 4 },
  fieldLabel: {
    marginBottom: 8,
    fontSize: 13,
    fontWeight: "800",
    color: "#111827",
    letterSpacing: 0.2,
  },
  fieldLabelSpaced: { marginTop: 14 },
  input: {
    borderWidth: 1,
    borderColor: "#111827",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 15,
    fontSize: 16,
    backgroundColor: "#FFFFFF",
    color: "#111827",
    minHeight: 52,
  },
  notesInput: {
    marginTop: 0,
    borderWidth: 1,
    borderColor: "#111827",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
    fontSize: 16,
    minHeight: 140,
    maxHeight: 220,
    backgroundColor: "#FFFFFF",
    color: "#111827",
  },
  dateField: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderWidth: 1,
    borderColor: "#111827",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 15,
    minHeight: 52,
    backgroundColor: "#FFFFFF",
    marginBottom: 4,
  },
  dateFieldPressed: { backgroundColor: "#F9FAFB" },
  dateFieldText: { flex: 1, fontSize: 16, fontWeight: "700", color: "#111827" },
  preview: {
    marginTop: 16,
    fontSize: 13,
    fontWeight: "600",
    color: "#64748B",
    textAlign: "center",
    lineHeight: 19,
  },
  createBtnOuter: {
    marginTop: 22,
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
  createOutlineBtn: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#111827",
    backgroundColor: "#FFFFFF",
    paddingVertical: 15,
    paddingHorizontal: 14,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 52,
  },
  createOutlineBtnText: { color: "#111827", fontSize: 15, fontWeight: "800", textAlign: "center" },
  secondaryOutlineBtn: {
    marginTop: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#111827",
    backgroundColor: "#FFFFFF",
    paddingVertical: 14,
    alignItems: "center",
    minHeight: 48,
  },
  secondaryOutlineBtnText: { fontSize: 14.5, fontWeight: "800", color: "#111827" },
  outlineBtnPressed: { backgroundColor: "#F9FAFB", opacity: 0.92 },
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
    paddingVertical: 10,
    minHeight: 44,
    backgroundColor: "#FFFFFF",
  },
  segmentBtnActive: {
    backgroundColor: "#273444",
    borderColor: "#273444",
  },
  segmentText: { fontSize: 15, fontWeight: "800" },
  loanName: { fontSize: 21, fontWeight: "800", color: "#111827", textAlign: "center" },
  loanMeta: { marginTop: 8, fontSize: 15, fontWeight: "600", lineHeight: 22, color: "#111827", textAlign: "center" },
  loanMetaMuted: {
    marginTop: 6,
    fontSize: 15,
    fontWeight: "600",
    lineHeight: 22,
    color: "#64748B",
    textAlign: "center",
  },
  loanMetaCenter: { marginTop: 6, fontSize: 14, fontWeight: "600", color: "#64748B", textAlign: "center" },
  warning: { marginTop: 10, fontSize: 14, fontWeight: "800", textAlign: "center" },
  progressTrack: {
    marginTop: 10,
    height: 12,
    borderRadius: 999,
    overflow: "hidden",
    backgroundColor: "#E5E7EB",
  },
  progressFill: { height: "100%", borderRadius: 999 },
  loanCardWrap: {
    marginTop: 14,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    shadowColor: "#111827",
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
  loanCardSelected: {
    borderColor: "#CBD5E1",
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
  },
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
    gap: 8,
  },
  cardActionRow: { flexDirection: "row", gap: 8, alignItems: "stretch" },
  cardActionRowSecond: { flexDirection: "row", gap: 8 },
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
  cardActionText: { fontSize: 14.5, fontWeight: "800", color: "#111827", textAlign: "center" },
  loanDivider: { marginTop: 10, height: 1, backgroundColor: "#E5E7EB" },
  trackingCard: { marginTop: 12, paddingBottom: 8 },
  applyPaymentWrap: { marginTop: 14 },
  applyLoanPaymentBtn: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#111827",
    backgroundColor: "#FFFFFF",
    paddingVertical: 15,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 50,
  },
  applyLoanPaymentBtnText: { fontSize: 15, fontWeight: "800", color: "#111827" },
  historyRow: { marginTop: 10, fontSize: 14, lineHeight: 21, color: "#64748B", fontWeight: "600" },
  purchasesLabel: { marginTop: 6, fontSize: 14, fontWeight: "800", color: "#64748B", textAlign: "center" },
  monthLabel: { marginTop: 2, fontSize: 12, fontWeight: "700", color: "#64748B", textAlign: "center" },
  totalDueLabel: { marginTop: 3, fontSize: 15, fontWeight: "900", color: "#334155", textAlign: "center" },
  selectionBanner: {
    marginTop: 10,
    marginBottom: 6,
    alignSelf: "center",
    backgroundColor: "#F1F5F9",
    color: "#334155",
    fontSize: 12,
    fontWeight: "800",
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  centerModalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(17,24,39,0.35)",
    justifyContent: "center",
    alignItems: "center",
    padding: 22,
  },
  centerModalCard: {
    width: "100%",
    maxWidth: 430,
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    shadowColor: "#111827",
    shadowOpacity: 0.1,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  modalTitle: { fontSize: 22, fontWeight: "900", marginBottom: 10, color: "#111827", textAlign: "center" },
  modalLine: { fontSize: 14, color: "#64748B", marginBottom: 8, fontWeight: "600", textAlign: "center" },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(17,24,39,0.35)",
    justifyContent: "flex-end",
    padding: 14,
  },
  modalCardSolid: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 20,
    padding: 18,
    backgroundColor: "#FFFFFF",
    maxHeight: "92%",
  },
  modalSectionTitle: {
    fontSize: 22,
    fontWeight: "900",
    color: "#111827",
    marginBottom: 14,
    textAlign: "center",
  },
  modalPickerTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#64748B",
    textAlign: "center",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  pickerShell: {
    marginTop: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#111827",
    backgroundColor: "#FFFFFF",
    paddingVertical: 8,
    alignItems: "center",
  },
  modalBtnRow: { marginTop: 16, flexDirection: "row", gap: 10 },
  modalOutlineBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#111827",
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    minHeight: 48,
    backgroundColor: "#FFFFFF",
  },
  modalOutlineBtnFull: {
    borderWidth: 1,
    borderColor: "#111827",
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    minHeight: 48,
    backgroundColor: "#FFFFFF",
  },
  modalOutlineBtnText: { color: "#111827", fontWeight: "800", fontSize: 15 },
  savedBanner: {
    marginTop: 12,
    backgroundColor: "#F1F5F9",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: "center",
  },
  savedBannerText: {
    color: "#334155",
    fontSize: 13,
    fontWeight: "800",
  },
  priorityCard: {
    marginTop: 10,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    padding: 12,
    backgroundColor: "#FAFAFA",
  },
  priorityBadge: {
    alignSelf: "flex-start",
    backgroundColor: "#3F4D63",
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "800",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    overflow: "hidden",
  },
  priorityTitle: { marginTop: 8, fontSize: 16, fontWeight: "800", color: "#111827" },
  priorityMeta: { marginTop: 3, fontSize: 13, color: "#64748B", fontWeight: "600" },
  priorityStatus: { marginTop: 6, fontSize: 13, fontWeight: "800" },
});

