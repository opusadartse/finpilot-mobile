import { useCallback, useMemo, useState } from "react";
import {
  Alert,
  FlatList,
  InteractionManager,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import DateTimePicker from "@react-native-community/datetimepicker";
import Animated, { Easing, FadeIn, FadeInDown } from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import { GlassCard } from "@/components/GlassCard";
import { ScreenWrap } from "@/components/ScreenWrap";
import {
  addReminder,
  deleteReminder,
  getCards,
  getLoans,
  getRemainingMonths,
  getReminderPaymentHistory,
  getReminders,
  markReminderPaid,
  type CardRow,
  type LoanPromotionRow,
  ReminderPaymentHistoryRow,
  ReminderRow,
  updateReminder,
} from "@/lib/db";

type AccountPick = { kind: "card"; card: CardRow } | { kind: "loan"; loan: LoanPromotionRow };

type AccountPickerRow =
  | { key: string; kind: "card"; card: CardRow }
  | { key: string; kind: "loan"; loan: LoanPromotionRow };

type ReminderStatus = "upcoming" | "dueSoon" | "overdue" | "paid";

function startOfDay(value: Date) {
  return new Date(value.getFullYear(), value.getMonth(), value.getDate());
}

function getDaysRemaining(dueDateIso: string) {
  const due = startOfDay(new Date(dueDateIso));
  const today = startOfDay(new Date());
  const diffMs = due.getTime() - today.getTime();
  return Math.round(diffMs / 86400000);
}

function getReminderStatus(reminder: ReminderRow): ReminderStatus {
  if (reminder.is_paid === 1) return "paid";
  const days = getDaysRemaining(reminder.due_date);
  if (days < 0) return "overdue";
  if (days <= 3) return "dueSoon";
  return "upcoming";
}

function getSmartAlert(reminder: ReminderRow, daysRemaining: number) {
  if (reminder.is_paid === 1) return "Paid";
  if (daysRemaining < 0) return "Overdue";
  if (daysRemaining === 0) return "Due Today";
  if (daysRemaining === 1) return "Due Tomorrow";
  return `Due in ${daysRemaining} days`;
}

function getStatusColor(status: ReminderStatus) {
  if (status === "paid") return "#15803D";
  if (status === "overdue") return "#DC2626";
  if (status === "dueSoon") return "#D97706";
  return "#3F4D63";
}

/** Deterministic last-4 style digits for UI when no PAN is stored */
function pseudoLastFour(seed: number) {
  const n = Math.abs((seed * 7919) % 10000);
  return n.toString().padStart(4, "0");
}

function displayCardName(reminder: ReminderRow) {
  const t = reminder.title.trim();
  if (t.endsWith(" Payment")) return t.slice(0, -" Payment".length);
  if (t.endsWith(" Promotion Payment")) return t.slice(0, -" Promotion Payment".length);
  return t;
}

function loanRecommendedMonthly(loan: LoanPromotionRow): number {
  const target = loan.monthly_payment_target;
  if (Number.isFinite(target) && target > 0) return target;
  const months = Math.max(1, getRemainingMonths(loan.interest_free_expiration));
  return loan.current_balance / months;
}

function avoidInterestPayment(card: CardRow): number {
  return Math.max(card.min_payment, card.current_balance * 0.3);
}

function resolveAccountFromReminder(reminder: ReminderRow, cards: CardRow[], loans: LoanPromotionRow[]): AccountPick | null {
  if (reminder.source_type === "card" && reminder.source_id != null) {
    const card = cards.find((c) => c.id === reminder.source_id);
    if (card) return { kind: "card", card };
  }
  if ((reminder.source_type === "loan" || reminder.source_type === "promotion") && reminder.source_id != null) {
    const loan = loans.find((l) => l.id === reminder.source_id);
    if (loan) return { kind: "loan", loan };
  }
  const base = displayCardName(reminder).trim();
  const card = cards.find((c) => c.name.trim() === base);
  if (card) return { kind: "card", card };
  const loan = loans.find((l) => l.name.trim() === base);
  if (loan) return { kind: "loan", loan };
  return null;
}

function enrichReminder(
  reminder: ReminderRow,
  cards: ReturnType<typeof getCards>,
  loans: ReturnType<typeof getLoans>
): {
  displayName: string;
  lastFour: string;
  minPayment: number | null;
} {
  let displayName = displayCardName(reminder);
  let lastFour = "----";
  let minPayment: number | null = null;

  if (reminder.source_type === "card" && reminder.source_id != null) {
    const card = cards.find((c) => c.id === reminder.source_id);
    if (card) {
      displayName = card.name;
      minPayment = card.min_payment;
      lastFour = pseudoLastFour(card.id + card.name.length);
    }
  } else if ((reminder.source_type === "loan" || reminder.source_type === "promotion") && reminder.source_id != null) {
    const loan = loans.find((l) => l.id === reminder.source_id);
    if (loan) {
      displayName = loan.name;
      minPayment = loanRecommendedMonthly(loan);
      lastFour = pseudoLastFour(loan.id + 7000);
    }
  }

  if (minPayment == null) {
    const base = displayName.trim();
    const c = cards.find((x) => x.name.trim() === base);
    if (c) {
      displayName = c.name;
      minPayment = c.min_payment;
      lastFour = pseudoLastFour(c.id + c.name.length);
    } else {
      const loan = loans.find((x) => x.name.trim() === base);
      if (loan) {
        displayName = loan.name;
        minPayment = loanRecommendedMonthly(loan);
        lastFour = pseudoLastFour(loan.id + 7000);
      }
    }
  }

  return { displayName, lastFour, minPayment };
}

export default function RemindersScreen() {
  const { height: windowHeight } = useWindowDimensions();
  const [reminders, setReminders] = useState<ReminderRow[]>(() => getReminders());
  const [cards, setCards] = useState(() => getCards());
  const [loans, setLoans] = useState(() => getLoans());
  const [history, setHistory] = useState<(ReminderPaymentHistoryRow & { reminder_title: string })[]>(() =>
    getReminderPaymentHistory()
  );
  const [viewAll, setViewAll] = useState(false);
  const [historyVisible, setHistoryVisible] = useState(false);
  const [formVisible, setFormVisible] = useState(false);
  const [accountPickerVisible, setAccountPickerVisible] = useState(false);
  const [editReminderId, setEditReminderId] = useState<number | null>(null);
  const [selectedAccount, setSelectedAccount] = useState<AccountPick | null>(null);
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [notes, setNotes] = useState("");
  const [repeatMonthly, setRepeatMonthly] = useState(false);
  const [dueDate, setDueDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [sourceInput, setSourceInput] = useState("Bank account");
  const [sourceReminderId, setSourceReminderId] = useState<number | null>(null);

  const resolvedAccount = useMemo((): AccountPick | null => {
    if (!selectedAccount) return null;
    if (selectedAccount.kind === "card") {
      const fresh = cards.find((c) => c.id === selectedAccount.card.id);
      return fresh ? { kind: "card", card: fresh } : selectedAccount;
    }
    const fresh = loans.find((l) => l.id === selectedAccount.loan.id);
    return fresh ? { kind: "loan", loan: fresh } : selectedAccount;
  }, [selectedAccount, cards, loans]);

  /** Cards + loans from DB, one list sorted A–Z (updates when cards/loans change). */
  const accountPickerRows = useMemo((): AccountPickerRow[] => {
    const rows: AccountPickerRow[] = [
      ...cards.map((card) => ({ key: `card-${card.id}`, kind: "card" as const, card })),
      ...loans.map((loan) => ({ key: `loan-${loan.id}`, kind: "loan" as const, loan })),
    ];
    rows.sort((a, b) => {
      const na = a.kind === "card" ? a.card.name : a.loan.name;
      const nb = b.kind === "card" ? b.card.name : b.loan.name;
      return na.localeCompare(nb, undefined, { sensitivity: "base" });
    });
    return rows;
  }, [cards, loans]);

  const reload = useCallback(() => {
    setReminders(getReminders());
    setCards(getCards());
    setLoans(getLoans());
    setHistory(getReminderPaymentHistory());
  }, []);

  useFocusEffect(
    useCallback(() => {
      reload();
    }, [reload])
  );

  const visibleReminders = useMemo(() => {
    if (viewAll) return reminders;
    return reminders.slice(0, 5);
  }, [reminders, viewAll]);

  const openAddModal = useCallback(() => {
    setFormVisible(true);
    setAccountPickerVisible(false);
    setEditReminderId(null);
    setSelectedAccount(null);
    setTitle("");
    setAmount("");
    setNotes("");
    setRepeatMonthly(false);
    setDueDate(new Date(Date.now() + 3 * 86400000));
  }, []);

  const openEditModal = useCallback((reminder: ReminderRow) => {
    const c = getCards();
    const l = getLoans();
    const pick = resolveAccountFromReminder(reminder, c, l);
    setFormVisible(true);
    setAccountPickerVisible(false);
    setEditReminderId(reminder.id);
    setSelectedAccount(pick);
    setTitle(reminder.title);
    setAmount(reminder.amount_due.toFixed(2));
    setNotes(reminder.notes ?? "");
    setRepeatMonthly(reminder.repeat_monthly === 1);
    setDueDate(new Date(reminder.due_date));
  }, []);

  const saveReminder = useCallback(() => {
    const parsedAmount = Number(amount);
    const titleForSave = resolvedAccount
      ? resolvedAccount.kind === "card"
        ? resolvedAccount.card.name.trim()
        : resolvedAccount.loan.name.trim()
      : title.trim();

    if (!editReminderId && !resolvedAccount) {
      Alert.alert("Select an account", "Choose a credit card or loan from the list.");
      return;
    }
    if (!titleForSave) {
      Alert.alert("Missing account", "Please select a card or loan.");
      return;
    }
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      Alert.alert("Invalid amount", "Please enter a valid payment amount.");
      return;
    }
    if (editReminderId) {
      updateReminder(editReminderId, {
        title: titleForSave,
        amount_due: parsedAmount,
        due_date: dueDate.toISOString(),
        notes: notes.trim(),
        repeat_monthly: repeatMonthly ? 1 : 0,
      });
    } else {
      addReminder({
        title: titleForSave,
        amount_due: parsedAmount,
        due_date: dueDate.toISOString(),
        notes: notes.trim(),
        repeat_monthly: repeatMonthly,
      });
    }
    setFormVisible(false);
    setAccountPickerVisible(false);
    setEditReminderId(null);
    setSelectedAccount(null);
    reload();
  }, [amount, dueDate, editReminderId, notes, reload, repeatMonthly, resolvedAccount, title]);

  return (
    <ScreenWrap>
      <GlassCard style={styles.headerBanner}>
        <Text style={styles.headerTitle}>Payment Reminders</Text>
        <Text style={styles.headerSubtitle}>Stay on top of your payments</Text>
      </GlassCard>

      <View style={styles.toolbarRow}>
        <Pressable onPress={() => setViewAll((v) => !v)} style={styles.outlinePill}>
          <Text style={styles.outlinePillText}>{viewAll ? "View Less" : "View All"}</Text>
        </Pressable>
      </View>

      <Pressable onPress={openAddModal} style={styles.primaryAddBtn}>
        <Ionicons name="add-circle-outline" size={20} color="#FFFFFF" />
        <Text style={styles.primaryAddBtnText}>Add Reminder</Text>
      </Pressable>

      {visibleReminders.map((reminder, index) => {
        const status = getReminderStatus(reminder);
        const color = getStatusColor(status);
        const daysRemaining = getDaysRemaining(reminder.due_date);
        const alertText = getSmartAlert(reminder, daysRemaining);
        const { displayName, lastFour, minPayment } = enrichReminder(reminder, cards, loans);
        const dueLabel = new Date(reminder.due_date).toLocaleDateString(undefined, {
          month: "short",
          day: "numeric",
          year: "numeric",
        });

        return (
          <Animated.View key={reminder.id} entering={FadeInDown.delay(40 + index * 40)} style={styles.cardWrap}>
            <View style={[styles.reminderCard, reminder.is_paid === 1 ? styles.reminderCardPaid : undefined]}>
              <View style={styles.reminderCardHeader}>
                <View style={styles.iconCircle}>
                  <Ionicons name="card-outline" size={22} color="#111827" />
                </View>
                <View style={styles.reminderHeaderText}>
                  <Text style={styles.reminderName}>{displayName}</Text>
                  <Text style={styles.reminderLastFour}>•••• {lastFour}</Text>
                </View>
              </View>

              <View style={styles.reminderBody}>
                <View style={styles.amountBlock}>
                  <Text style={styles.amountLabel}>Amount Due</Text>
                  <Text style={styles.amountDue}>${reminder.amount_due.toFixed(2)}</Text>
                </View>
                <View style={styles.divider} />
                <View style={styles.metaGrid}>
                  <View style={styles.metaCell}>
                    <Text style={styles.metaLabel}>Minimum</Text>
                    <Text style={styles.metaValue}>
                      {minPayment != null ? `$${minPayment.toFixed(2)}` : "—"}
                    </Text>
                  </View>
                  <View style={styles.metaCell}>
                    <Text style={styles.metaLabel}>Due date</Text>
                    <Text style={styles.metaValue}>{dueLabel}</Text>
                  </View>
                </View>
                <Text
                  style={[
                    styles.dueLine,
                    { color: reminder.is_paid === 1 ? "#15803D" : color },
                  ]}
                >
                  {reminder.is_paid === 1 ? "Paid" : alertText}
                </Text>
              </View>

              {reminder.notes ? <Text style={styles.notesLine}>{reminder.notes}</Text> : null}

              <View style={styles.actions}>
                <Pressable
                  onPress={() => {
                    setSourceReminderId(reminder.id);
                    setSourceInput("Bank account");
                  }}
                  style={[styles.actionOutline, reminder.is_paid === 1 && styles.actionDisabled]}
                  disabled={reminder.is_paid === 1}
                >
                  <Text style={styles.actionOutlineText}>{reminder.is_paid === 1 ? "Paid" : "Mark as Paid"}</Text>
                </Pressable>
                <Pressable onPress={() => openEditModal(reminder)} style={styles.actionOutline}>
                  <Text style={styles.actionOutlineText}>Edit</Text>
                </Pressable>
                <Pressable
                  onPress={() =>
                    Alert.alert("Delete Reminder", "Delete this reminder?", [
                      { text: "Cancel", style: "cancel" },
                      {
                        text: "Delete",
                        style: "destructive",
                        onPress: () => {
                          deleteReminder(reminder.id);
                          reload();
                        },
                      },
                    ])
                  }
                  style={styles.actionOutline}
                >
                  <Text style={styles.actionOutlineText}>Delete</Text>
                </Pressable>
              </View>
            </View>
          </Animated.View>
        );
      })}

      <Pressable
        onPress={() => setHistoryVisible((v) => !v)}
        style={styles.viewHistoryBtn}
        accessibilityRole="button"
      >
        <Text style={styles.viewHistoryBtnText}>View Payment History</Text>
        <Ionicons name={historyVisible ? "chevron-up" : "chevron-down"} size={18} color="#111827" />
      </Pressable>

      {historyVisible ? (
        <GlassCard style={styles.historySection}>
          <Text style={styles.historySectionTitle}>Payment History</Text>
          {history.length === 0 ? (
            <Text style={styles.historyEmpty}>No paid reminders yet.</Text>
          ) : (
            history.map((item) => (
              <View key={item.id} style={styles.historyRow}>
                <Text style={styles.historyDate}>{new Date(item.paid_at).toLocaleDateString()}</Text>
                <Text style={styles.historyDetail} numberOfLines={2}>
                  {item.reminder_title} · ${item.amount.toFixed(2)} · {item.payment_source}
                </Text>
              </View>
            ))
          )}
        </GlassCard>
      ) : null}

      <Modal
        visible={formVisible}
        transparent
        animationType="slide"
        onRequestClose={() => {
          Keyboard.dismiss();
          setAccountPickerVisible(false);
          setFormVisible(false);
          setEditReminderId(null);
          setSelectedAccount(null);
        }}
      >
        <View style={styles.reminderFormModalRoot}>
        <KeyboardAvoidingView
          enabled={!accountPickerVisible}
          style={styles.modalKav}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          keyboardVerticalOffset={Platform.OS === "ios" ? 12 : 0}
        >
          <View style={styles.modalBackdrop}>
            <ScrollView
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="on-drag"
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.reminderFormScroll}
              nestedScrollEnabled
            >
              <View style={styles.modalCard}>
                  <Text style={styles.modalTitle}>{editReminderId ? "Edit Reminder" : "Add Reminder"}</Text>

                  <Text style={styles.fieldLabel}>Account</Text>
                  <Pressable
                    onPress={() => {
                      Keyboard.dismiss();
                      InteractionManager.runAfterInteractions(() => {
                        setAccountPickerVisible(true);
                      });
                    }}
                    style={styles.accountPickerField}
                  >
                    <Text
                      style={[styles.accountPickerValue, !resolvedAccount && styles.accountPickerPlaceholder]}
                      numberOfLines={1}
                    >
                      {resolvedAccount
                        ? resolvedAccount.kind === "card"
                          ? resolvedAccount.card.name
                          : resolvedAccount.loan.name
                        : "Tap to choose a card or loan"}
                    </Text>
                    <Ionicons name="chevron-down" size={20} color="#64748B" />
                  </Pressable>
                  {cards.length === 0 && loans.length === 0 ? (
                    <Text style={styles.accountHint}>Add a card or loan elsewhere in the app to see it here.</Text>
                  ) : null}

                  {resolvedAccount?.kind === "card" ? (
                    <>
                      <Text style={styles.fieldLabel}>Quick amount</Text>
                      <View style={styles.amountChipsRow}>
                        <Pressable
                          onPress={() => setAmount(resolvedAccount.card.min_payment.toFixed(2))}
                          style={({ pressed }) => [styles.amountChip, pressed && styles.amountChipPressed]}
                        >
                          <Text style={styles.amountChipText}>Minimum payment</Text>
                        </Pressable>
                        <Pressable
                          onPress={() => setAmount(resolvedAccount.card.current_balance.toFixed(2))}
                          style={({ pressed }) => [styles.amountChip, pressed && styles.amountChipPressed]}
                        >
                          <Text style={styles.amountChipText}>Full statement balance</Text>
                        </Pressable>
                        <Pressable
                          onPress={() => setAmount(avoidInterestPayment(resolvedAccount.card).toFixed(2))}
                          style={({ pressed }) => [styles.amountChip, pressed && styles.amountChipPressed]}
                        >
                          <Text style={styles.amountChipText}>Avoid interest payment</Text>
                        </Pressable>
                      </View>
                    </>
                  ) : null}

                  {resolvedAccount?.kind === "loan" ? (
                    <>
                      <Text style={styles.fieldLabel}>Quick amount</Text>
                      <View style={styles.amountChipsRow}>
                        <Pressable
                          onPress={() => setAmount(loanRecommendedMonthly(resolvedAccount.loan).toFixed(2))}
                          style={({ pressed }) => [styles.amountChip, pressed && styles.amountChipPressed]}
                        >
                          <Text style={styles.amountChipText}>Recommended monthly payment</Text>
                        </Pressable>
                        <Pressable
                          onPress={() => setAmount(resolvedAccount.loan.current_balance.toFixed(2))}
                          style={({ pressed }) => [styles.amountChip, pressed && styles.amountChipPressed]}
                        >
                          <Text style={styles.amountChipText}>Full remaining balance</Text>
                        </Pressable>
                      </View>
                    </>
                  ) : null}

                  <Text style={styles.fieldLabel}>Payment amount</Text>
                  <TextInput
                    value={amount}
                    onChangeText={(v) => setAmount(v.replace(/[^0-9.]/g, ""))}
                    keyboardType="decimal-pad"
                    style={styles.input}
                    placeholder="0.00"
                    placeholderTextColor="#94A3B8"
                  />

                  <Text style={styles.fieldLabel}>Due date</Text>
                  <Pressable style={styles.dateBtn} onPress={() => setShowDatePicker(true)}>
                    <Ionicons name="calendar-outline" size={18} color="#374151" />
                    <Text style={styles.dateBtnText}>{dueDate.toLocaleDateString()}</Text>
                  </Pressable>
                  {showDatePicker ? (
                    <DateTimePicker
                      value={dueDate}
                      mode="date"
                      display="default"
                      onChange={(_, selected) => {
                        setShowDatePicker(false);
                        if (selected) setDueDate(selected);
                      }}
                    />
                  ) : null}

                  <Text style={styles.fieldLabel}>Notes</Text>
                  <TextInput
                    value={notes}
                    onChangeText={setNotes}
                    multiline
                    textAlignVertical="top"
                    style={styles.notesInput}
                    placeholder="Optional details"
                    placeholderTextColor="#94A3B8"
                  />

                  <View style={styles.switchRow}>
                    <Text style={styles.switchLabel}>Repeat monthly</Text>
                    <Switch
                      value={repeatMonthly}
                      onValueChange={setRepeatMonthly}
                      trackColor={{ false: "#E2E8F0", true: "#CBD5E1" }}
                    />
                  </View>

                  <View style={styles.modalActions}>
                    <Pressable
                      onPress={() => {
                        Keyboard.dismiss();
                        setAccountPickerVisible(false);
                        setFormVisible(false);
                        setEditReminderId(null);
                        setSelectedAccount(null);
                      }}
                      style={styles.modalCancelBtn}
                    >
                      <Text style={styles.modalCancelText}>Cancel</Text>
                    </Pressable>
                    <Pressable
                      onPress={() => {
                        Keyboard.dismiss();
                        saveReminder();
                      }}
                      style={styles.modalSaveBtn}
                    >
                      <Text style={styles.modalSaveText}>Save</Text>
                    </Pressable>
                  </View>

                  <Pressable
                    onPress={Keyboard.dismiss}
                    style={styles.keyboardDismissArea}
                    accessibilityLabel="Dismiss keyboard"
                    accessibilityRole="button"
                  />
                </View>
              </ScrollView>
            </View>
        </KeyboardAvoidingView>

        {accountPickerVisible ? (
          <View style={styles.accountPickerOverlay} pointerEvents="box-none">
            <Animated.View entering={FadeIn.duration(200)} style={styles.accountPickerDim}>
              <Pressable style={StyleSheet.absoluteFillObject} onPress={() => setAccountPickerVisible(false)} />
            </Animated.View>
            <Animated.View
              entering={FadeIn.duration(220).easing(Easing.out(Easing.quad))}
              style={[styles.accountPickerSheet, { maxHeight: Math.min(windowHeight * 0.82, 620) }]}
            >
              <View style={styles.pickerGrabber} />
              <Text style={styles.pickerTitle}>Choose account</Text>
              <Text style={styles.pickerSubtitle}>From your saved cards and loans</Text>
              {accountPickerRows.length === 0 ? (
                <Text style={styles.pickerEmpty}>No cards or loans yet. Add one in Cards or Loans first.</Text>
              ) : (
                <FlatList
                  data={accountPickerRows}
                  keyExtractor={(item) => item.key}
                  keyboardShouldPersistTaps="handled"
                  showsVerticalScrollIndicator={false}
                  bounces={false}
                  alwaysBounceVertical={false}
                  overScrollMode="never"
                  style={[styles.accountPickerList, { maxHeight: Math.min(windowHeight * 0.54, 460) }]}
                  contentContainerStyle={styles.accountPickerListContent}
                  renderItem={({ item }) => (
                    <Pressable
                      onPress={() => {
                        if (item.kind === "card") {
                          setSelectedAccount({ kind: "card", card: item.card });
                          setTitle(item.card.name);
                          setAmount(item.card.min_payment.toFixed(2));
                        } else {
                          setSelectedAccount({ kind: "loan", loan: item.loan });
                          setTitle(item.loan.name);
                          setAmount(loanRecommendedMonthly(item.loan).toFixed(2));
                        }
                        setAccountPickerVisible(false);
                      }}
                      style={({ pressed }) => [styles.pickerRow, pressed && styles.pickerRowPressed]}
                    >
                      <View style={styles.pickerRowIconWrap}>
                        <Ionicons
                          name={item.kind === "card" ? "card-outline" : "trending-down-outline"}
                          size={22}
                          color="#3F4D63"
                        />
                      </View>
                      <View style={styles.pickerRowText}>
                        <View style={styles.pickerRowTitleRow}>
                          <Text style={styles.pickerRowTitle} numberOfLines={2}>
                            {item.kind === "card" ? item.card.name : item.loan.name}
                          </Text>
                          <View style={[styles.pickerKindPill, item.kind === "loan" ? styles.pickerKindPillLoan : undefined]}>
                            <Text
                              style={[
                                styles.pickerKindPillText,
                                item.kind === "loan" ? styles.pickerKindPillTextLoan : undefined,
                              ]}
                            >
                              {item.kind === "card" ? "Card" : "Loan"}
                            </Text>
                          </View>
                        </View>
                        <Text style={styles.pickerRowSub}>
                          Balance ${(item.kind === "card" ? item.card.current_balance : item.loan.current_balance).toFixed(2)}
                        </Text>
                      </View>
                      <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
                    </Pressable>
                  )}
                />
              )}
            </Animated.View>
          </View>
        ) : null}
        </View>
      </Modal>

      <Modal visible={sourceReminderId !== null} transparent animationType="fade" onRequestClose={() => setSourceReminderId(null)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Payment Source</Text>
            <Text style={styles.fieldLabel}>Where was this paid from?</Text>
            <TextInput value={sourceInput} onChangeText={setSourceInput} style={styles.input} placeholder="Bank account" placeholderTextColor="#94A3B8" />
            <View style={styles.modalActions}>
              <Pressable onPress={() => setSourceReminderId(null)} style={styles.modalCancelBtn}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </Pressable>
              <Pressable
                onPress={() => {
                  if (!sourceReminderId) return;
                  markReminderPaid(sourceReminderId, sourceInput);
                  setSourceReminderId(null);
                  reload();
                }}
                style={styles.modalSaveBtn}
              >
                <Text style={styles.modalSaveText}>Confirm Paid</Text>
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
    backgroundColor: "#3F4D63",
    borderColor: "#3F4D63",
    paddingVertical: 22,
    paddingHorizontal: 20,
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: "900",
    color: "#FFFFFF",
    textAlign: "center",
    letterSpacing: 0.3,
  },
  headerSubtitle: {
    marginTop: 8,
    fontSize: 14,
    fontWeight: "600",
    color: "rgba(255,255,255,0.88)",
    textAlign: "center",
  },
  toolbarRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: 4,
  },
  outlinePill: {
    borderWidth: 1,
    borderColor: "#DADADA",
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 10,
    shadowColor: "#0F172A",
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  outlinePillText: { fontSize: 13, fontWeight: "700", color: "#111827" },
  primaryAddBtn: {
    marginTop: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#3F4D63",
    borderRadius: 18,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: "#3F4D63",
  },
  primaryAddBtnText: { color: "#FFFFFF", fontWeight: "800", fontSize: 15 },
  cardWrap: {
    marginTop: 18,
  },
  reminderCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#DADADA",
    padding: 18,
    shadowColor: "#0F172A",
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  reminderCardPaid: {
    opacity: 0.72,
  },
  reminderCardHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: "#F1F5F9",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    alignItems: "center",
    justifyContent: "center",
  },
  reminderHeaderText: {
    flex: 1,
    minWidth: 0,
  },
  reminderName: {
    fontSize: 17,
    fontWeight: "800",
    color: "#111827",
  },
  reminderLastFour: {
    marginTop: 4,
    fontSize: 14,
    fontWeight: "600",
    color: "#64748B",
    letterSpacing: 0.5,
  },
  reminderBody: {
    marginTop: 16,
  },
  amountBlock: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "baseline",
  },
  amountLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: "#64748B",
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  amountDue: {
    fontSize: 22,
    fontWeight: "900",
    color: "#111827",
  },
  divider: {
    height: 1,
    backgroundColor: "#ECECEC",
    marginVertical: 14,
  },
  metaGrid: {
    flexDirection: "row",
    gap: 16,
  },
  metaCell: {
    flex: 1,
  },
  metaLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: "#64748B",
    marginBottom: 4,
  },
  metaValue: {
    fontSize: 15,
    fontWeight: "700",
    color: "#111827",
  },
  dueLine: {
    marginTop: 12,
    fontSize: 14,
    fontWeight: "700",
  },
  notesLine: {
    marginTop: 12,
    fontSize: 13,
    color: "#64748B",
    fontWeight: "500",
    lineHeight: 18,
  },
  actions: {
    marginTop: 16,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  actionOutline: {
    flexGrow: 1,
    flexBasis: "30%",
    borderWidth: 1,
    borderColor: "#DADADA",
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    paddingVertical: 11,
    alignItems: "center",
    minHeight: 44,
  },
  actionOutlineText: {
    fontSize: 13,
    fontWeight: "800",
    color: "#111827",
  },
  actionDisabled: {
    opacity: 0.55,
  },
  viewHistoryBtn: {
    marginTop: 22,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderWidth: 1,
    borderColor: "#111827",
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    paddingVertical: 14,
    paddingHorizontal: 18,
    shadowColor: "#0F172A",
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  viewHistoryBtnText: {
    fontSize: 15,
    fontWeight: "800",
    color: "#111827",
  },
  historySection: {
    marginTop: 14,
    borderColor: "#DADADA",
  },
  historySectionTitle: {
    fontSize: 18,
    fontWeight: "900",
    color: "#111827",
    marginBottom: 8,
  },
  historyEmpty: {
    fontSize: 14,
    color: "#64748B",
    fontWeight: "600",
  },
  historyRow: {
    marginTop: 12,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#E2E8F0",
  },
  historyDate: {
    fontSize: 12,
    fontWeight: "700",
    color: "#64748B",
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  historyDetail: {
    marginTop: 4,
    fontSize: 14,
    fontWeight: "600",
    color: "#111827",
    lineHeight: 20,
  },
  reminderFormModalRoot: {
    flex: 1,
  },
  modalKav: {
    flex: 1,
  },
  accountPickerOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 200,
    elevation: 32,
  },
  accountPickerDim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(15,23,42,0.48)",
  },
  accountPickerSheet: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    width: "100%",
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    paddingHorizontal: 18,
    paddingTop: 10,
    paddingBottom: 8,
    shadowColor: "#0F172A",
    shadowOpacity: 0.14,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: -4 },
    elevation: 12,
  },
  accountPickerList: {
    flexGrow: 0,
  },
  accountPickerListContent: {
    paddingBottom: 20,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(15,23,42,0.45)",
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 12,
  },
  reminderFormScroll: {
    flexGrow: 1,
    paddingBottom: 28,
  },
  modalCard: {
    borderRadius: 20,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#DADADA",
    padding: 18,
    shadowColor: "#0F172A",
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: "900",
    color: "#111827",
    marginBottom: 8,
    textAlign: "center",
  },
  fieldLabel: {
    marginTop: 12,
    color: "#64748B",
    fontWeight: "700",
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  input: {
    marginTop: 8,
    borderWidth: 1,
    borderColor: "#DADADA",
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: "#111827",
    backgroundColor: "#FFFFFF",
    fontSize: 16,
  },
  notesInput: {
    marginTop: 8,
    minHeight: 88,
    borderWidth: 1,
    borderColor: "#DADADA",
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: "#111827",
    backgroundColor: "#FFFFFF",
    fontSize: 16,
  },
  dateBtn: {
    marginTop: 8,
    borderWidth: 1,
    borderColor: "#DADADA",
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#FFFFFF",
  },
  dateBtnText: {
    color: "#111827",
    fontSize: 15,
    fontWeight: "700",
  },
  switchRow: {
    marginTop: 14,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  switchLabel: {
    color: "#111827",
    fontSize: 15,
    fontWeight: "700",
  },
  modalActions: {
    marginTop: 18,
    flexDirection: "row",
    gap: 10,
  },
  modalCancelBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#DADADA",
    borderRadius: 14,
    alignItems: "center",
    paddingVertical: 12,
    backgroundColor: "#FFFFFF",
  },
  modalCancelText: {
    color: "#374151",
    fontWeight: "800",
    fontSize: 15,
  },
  modalSaveBtn: {
    flex: 1,
    borderRadius: 14,
    alignItems: "center",
    paddingVertical: 12,
    backgroundColor: "#3F4D63",
    borderWidth: 1,
    borderColor: "#3F4D63",
  },
  modalSaveText: {
    color: "#FFFFFF",
    fontWeight: "900",
    fontSize: 15,
  },
  accountPickerField: {
    marginTop: 8,
    borderWidth: 1,
    borderColor: "#DADADA",
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    backgroundColor: "#FFFFFF",
  },
  accountPickerValue: {
    flex: 1,
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
  },
  accountPickerPlaceholder: {
    color: "#94A3B8",
    fontWeight: "600",
  },
  accountHint: {
    marginTop: 8,
    fontSize: 13,
    fontWeight: "600",
    color: "#64748B",
    lineHeight: 18,
  },
  amountChipsRow: {
    marginTop: 10,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  amountChip: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#DADADA",
    backgroundColor: "#F8FAFC",
  },
  amountChipPressed: {
    backgroundColor: "#EEF2F7",
    borderColor: "#CBD5E1",
  },
  amountChipText: {
    fontSize: 13,
    fontWeight: "800",
    color: "#3F4D63",
  },
  keyboardDismissArea: {
    minHeight: 56,
    marginTop: 4,
  },
  pickerGrabber: {
    alignSelf: "center",
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#E2E8F0",
    marginBottom: 12,
  },
  pickerTitle: {
    fontSize: 18,
    fontWeight: "900",
    color: "#111827",
    textAlign: "center",
    marginBottom: 4,
  },
  pickerSubtitle: {
    fontSize: 13,
    fontWeight: "600",
    color: "#64748B",
    textAlign: "center",
    marginBottom: 12,
  },
  pickerRowIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: "#F1F5F9",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    alignItems: "center",
    justifyContent: "center",
  },
  pickerRowTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap",
  },
  pickerKindPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    backgroundColor: "#EEF2FF",
    borderWidth: 1,
    borderColor: "#C7D2FE",
  },
  pickerKindPillLoan: {
    backgroundColor: "#ECFEFF",
    borderColor: "#A5F3FC",
  },
  pickerKindPillText: {
    fontSize: 10,
    fontWeight: "900",
    color: "#3730A3",
    letterSpacing: 0.4,
  },
  pickerKindPillTextLoan: {
    color: "#0E7490",
  },
  pickerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 4,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#E2E8F0",
  },
  pickerRowPressed: {
    backgroundColor: "#F8FAFC",
  },
  pickerRowText: {
    flex: 1,
    minWidth: 0,
  },
  pickerRowTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#111827",
  },
  pickerRowSub: {
    marginTop: 2,
    fontSize: 13,
    fontWeight: "600",
    color: "#64748B",
  },
  pickerEmpty: {
    paddingVertical: 24,
    fontSize: 15,
    fontWeight: "600",
    color: "#64748B",
    textAlign: "center",
    lineHeight: 22,
  },
});
