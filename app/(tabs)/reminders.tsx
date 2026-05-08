import { useCallback, useMemo, useState } from "react";
import { Alert, Modal, Pressable, StyleSheet, Switch, Text, TextInput, View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import DateTimePicker from "@react-native-community/datetimepicker";
import Animated, { FadeInDown } from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import { GlassCard } from "@/components/GlassCard";
import { ScreenWrap } from "@/components/ScreenWrap";
import {
  addReminder,
  deleteReminder,
  getReminderPaymentHistory,
  getReminders,
  markReminderPaid,
  ReminderPaymentHistoryRow,
  ReminderRow,
  updateReminder,
} from "@/lib/db";

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
  if (status === "paid") return "#16A34A";
  if (status === "overdue") return "#DC2626";
  if (status === "dueSoon") return "#F59E0B";
  return "#2563EB";
}

export default function RemindersScreen() {
  const [reminders, setReminders] = useState<ReminderRow[]>(() => getReminders());
  const [history, setHistory] = useState<(ReminderPaymentHistoryRow & { reminder_title: string })[]>(() => getReminderPaymentHistory());
  const [viewAll, setViewAll] = useState(false);
  const [formVisible, setFormVisible] = useState(false);
  const [editReminderId, setEditReminderId] = useState<number | null>(null);
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [notes, setNotes] = useState("");
  const [repeatMonthly, setRepeatMonthly] = useState(false);
  const [dueDate, setDueDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [sourceInput, setSourceInput] = useState("Bank account");
  const [sourceReminderId, setSourceReminderId] = useState<number | null>(null);

  const reload = useCallback(() => {
    setReminders(getReminders());
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
    setEditReminderId(null);
    setTitle("");
    setAmount("");
    setNotes("");
    setRepeatMonthly(false);
    setDueDate(new Date(Date.now() + 3 * 86400000));
  }, []);

  const openEditModal = useCallback((reminder: ReminderRow) => {
    setFormVisible(true);
    setEditReminderId(reminder.id);
    setTitle(reminder.title);
    setAmount(reminder.amount_due.toFixed(2));
    setNotes(reminder.notes ?? "");
    setRepeatMonthly(reminder.repeat_monthly === 1);
    setDueDate(new Date(reminder.due_date));
  }, []);

  const saveReminder = useCallback(() => {
    const parsedAmount = Number(amount);
    if (!title.trim()) {
      Alert.alert("Missing title", "Please enter a card or loan name.");
      return;
    }
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      Alert.alert("Invalid amount", "Please enter a valid payment amount.");
      return;
    }
    if (editReminderId) {
      updateReminder(editReminderId, {
        title: title.trim(),
        amount_due: parsedAmount,
        due_date: dueDate.toISOString(),
        notes: notes.trim(),
        repeat_monthly: repeatMonthly ? 1 : 0,
      });
    } else {
      addReminder({
        title: title.trim(),
        amount_due: parsedAmount,
        due_date: dueDate.toISOString(),
        notes: notes.trim(),
        repeat_monthly: repeatMonthly,
      });
    }
    setFormVisible(false);
    setEditReminderId(null);
    reload();
  }, [amount, dueDate, editReminderId, notes, reload, repeatMonthly, title]);

  return (
    <ScreenWrap>
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.title}>Payment Reminders</Text>
          <Text style={styles.subtitle}>Credit cards, loans, and promotion due dates</Text>
        </View>
        <Pressable onPress={() => setViewAll((v) => !v)} style={styles.viewAllBtn}>
          <Text style={styles.viewAllText}>{viewAll ? "View Less" : "View All"}</Text>
        </Pressable>
      </View>

      <Pressable onPress={openAddModal} style={styles.addBtn}>
        <Ionicons name="add-circle-outline" size={18} color="#FFFFFF" />
        <Text style={styles.addBtnText}>Add Reminder</Text>
      </Pressable>

      {visibleReminders.map((reminder, index) => {
        const status = getReminderStatus(reminder);
        const color = getStatusColor(status);
        const daysRemaining = getDaysRemaining(reminder.due_date);
        const alertText = getSmartAlert(reminder, daysRemaining);
        return (
          <Animated.View key={reminder.id} entering={FadeInDown.delay(50 + index * 35)}>
            <GlassCard style={[styles.card, reminder.is_paid === 1 ? styles.paidCard : undefined]}>
              <View style={styles.cardTop}>
                <View style={styles.titleWrap}>
                  <Text style={styles.cardTitle}>{reminder.title}</Text>
                  <View style={[styles.statusPill, { backgroundColor: `${color}1A`, borderColor: color }]}>
                    <Text style={[styles.statusPillText, { color }]}>{alertText}</Text>
                  </View>
                </View>
                <Ionicons name={reminder.is_paid === 1 ? "checkmark-circle" : "time-outline"} size={22} color={color} />
              </View>

              <View style={styles.metricRow}>
                <Text style={styles.metricLabel}>Amount Due</Text>
                <Text style={styles.metricValue}>${reminder.amount_due.toFixed(2)}</Text>
              </View>
              <View style={styles.metricRow}>
                <Text style={styles.metricLabel}>Due Date</Text>
                <Text style={styles.metricValue}>{new Date(reminder.due_date).toLocaleDateString()}</Text>
              </View>
              <View style={styles.metricRow}>
                <Text style={styles.metricLabel}>Days Remaining</Text>
                <Text style={[styles.metricValue, { color }]}>
                  {reminder.is_paid === 1 ? "Paid" : daysRemaining < 0 ? `${Math.abs(daysRemaining)} days overdue` : `${daysRemaining} days`}
                </Text>
              </View>
              {reminder.notes ? <Text style={styles.notes}>Notes: {reminder.notes}</Text> : null}

              <View style={styles.actions}>
                <Pressable
                  onPress={() => {
                    setSourceReminderId(reminder.id);
                    setSourceInput("Bank account");
                  }}
                  style={[styles.actionBtn, styles.paidBtn, reminder.is_paid === 1 ? styles.disabledBtn : undefined]}
                  disabled={reminder.is_paid === 1}
                >
                  <Text style={styles.actionBtnText}>{reminder.is_paid === 1 ? "Paid" : "Mark as Paid"}</Text>
                </Pressable>
                <Pressable onPress={() => openEditModal(reminder)} style={[styles.actionBtn, styles.editBtn]}>
                  <Text style={styles.actionBtnText}>Edit</Text>
                </Pressable>
                <Pressable
                  onPress={() =>
                    Alert.alert("Delete Reminder", "Delete this reminder?", [
                      { text: "Cancel", style: "cancel" },
                      { text: "Delete", style: "destructive", onPress: () => { deleteReminder(reminder.id); reload(); } },
                    ])
                  }
                  style={[styles.actionBtn, styles.deleteBtn]}
                >
                  <Text style={styles.actionBtnText}>Delete</Text>
                </Pressable>
              </View>
            </GlassCard>
          </Animated.View>
        );
      })}

      <GlassCard style={styles.historyCard}>
        <Text style={styles.historyTitle}>Payment History</Text>
        {history.length === 0 ? <Text style={styles.emptyText}>No paid reminders yet.</Text> : null}
        {history.slice(0, 7).map((item) => (
          <Text key={item.id} style={styles.historyLine}>
            {new Date(item.paid_at).toLocaleDateString()} - {item.reminder_title} - ${item.amount.toFixed(2)} - {item.payment_source}
          </Text>
        ))}
      </GlassCard>

      <Modal visible={formVisible} transparent animationType="slide" onRequestClose={() => setFormVisible(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>{editReminderId ? "Edit Reminder" : "Add Reminder"}</Text>
            <Text style={styles.fieldLabel}>Card or loan name</Text>
            <TextInput value={title} onChangeText={setTitle} style={styles.input} placeholder="Amex Platinum" placeholderTextColor="#9CA3AF" />
            <Text style={styles.fieldLabel}>Payment amount</Text>
            <TextInput
              value={amount}
              onChangeText={(v) => setAmount(v.replace(/[^0-9.]/g, ""))}
              keyboardType="decimal-pad"
              style={styles.input}
              placeholder="$250.00"
              placeholderTextColor="#9CA3AF"
            />
            <Text style={styles.fieldLabel}>Due date</Text>
            <Pressable style={styles.dateBtn} onPress={() => setShowDatePicker(true)}>
              <Ionicons name="calendar-outline" size={16} color="#2563EB" />
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
              placeholderTextColor="#9CA3AF"
            />
            <View style={styles.switchRow}>
              <Text style={styles.switchLabel}>Repeat monthly</Text>
              <Switch value={repeatMonthly} onValueChange={setRepeatMonthly} trackColor={{ false: "#CBD5E1", true: "#93C5FD" }} />
            </View>
            <View style={styles.modalActions}>
              <Pressable onPress={() => { setFormVisible(false); setEditReminderId(null); }} style={styles.cancelBtn}>
                <Text style={styles.cancelText}>Cancel</Text>
              </Pressable>
              <Pressable onPress={saveReminder} style={styles.saveBtn}>
                <Text style={styles.saveText}>Save</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={sourceReminderId !== null} transparent animationType="fade" onRequestClose={() => setSourceReminderId(null)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Payment Source</Text>
            <Text style={styles.fieldLabel}>Where was this paid from?</Text>
            <TextInput value={sourceInput} onChangeText={setSourceInput} style={styles.input} placeholder="Bank account" placeholderTextColor="#9CA3AF" />
            <View style={styles.modalActions}>
              <Pressable onPress={() => setSourceReminderId(null)} style={styles.cancelBtn}>
                <Text style={styles.cancelText}>Cancel</Text>
              </Pressable>
              <Pressable
                onPress={() => {
                  if (!sourceReminderId) return;
                  markReminderPaid(sourceReminderId, sourceInput);
                  setSourceReminderId(null);
                  reload();
                }}
                style={styles.saveBtn}
              >
                <Text style={styles.saveText}>Confirm Paid</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </ScreenWrap>
  );
}

const styles = StyleSheet.create({
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  title: { fontSize: 28, fontWeight: "900", color: "#0F172A" },
  subtitle: { marginTop: 4, fontSize: 13, color: "#475569", fontWeight: "600" },
  viewAllBtn: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(37,99,235,0.28)",
    backgroundColor: "rgba(191,219,254,0.42)",
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  viewAllText: { fontSize: 12, fontWeight: "800", color: "#1D4ED8" },
  addBtn: {
    marginTop: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#2563EB",
    borderRadius: 14,
    paddingVertical: 12,
    shadowColor: "#2563EB",
    shadowOpacity: 0.24,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 7 },
  },
  addBtnText: { color: "#FFFFFF", fontWeight: "800", fontSize: 15 },
  card: {
    marginTop: 10,
    borderColor: "rgba(37,99,235,0.15)",
    backgroundColor: "rgba(255,255,255,0.88)",
    shadowColor: "#60A5FA",
    shadowOpacity: 0.14,
  },
  paidCard: { opacity: 0.65 },
  cardTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  titleWrap: { gap: 7, flex: 1, paddingRight: 8 },
  cardTitle: { fontSize: 17, fontWeight: "800", color: "#111827" },
  statusPill: { alignSelf: "flex-start", borderWidth: 1, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5 },
  statusPillText: { fontSize: 12, fontWeight: "800" },
  metricRow: { marginTop: 8, flexDirection: "row", justifyContent: "space-between" },
  metricLabel: { color: "#475569", fontSize: 13, fontWeight: "700" },
  metricValue: { color: "#0F172A", fontSize: 14, fontWeight: "800" },
  notes: { marginTop: 8, color: "#475569", fontSize: 12, fontWeight: "600" },
  actions: { marginTop: 12, flexDirection: "row", gap: 8, flexWrap: "wrap" },
  actionBtn: {
    flexBasis: "31%",
    flexGrow: 1,
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: "center",
  },
  paidBtn: { backgroundColor: "#16A34A" },
  editBtn: { backgroundColor: "#60A5FA" },
  deleteBtn: { backgroundColor: "#F87171" },
  actionBtnText: { color: "#FFFFFF", fontWeight: "800", fontSize: 12 },
  disabledBtn: { backgroundColor: "#4ADE80" },
  historyCard: { marginTop: 10 },
  historyTitle: { fontSize: 18, fontWeight: "800", color: "#111827" },
  emptyText: { marginTop: 8, color: "#64748B", fontWeight: "600" },
  historyLine: { marginTop: 8, color: "#334155", fontSize: 13, fontWeight: "600" },
  modalBackdrop: {
    flex: 1,
    justifyContent: "center",
    backgroundColor: "rgba(15,23,42,0.42)",
    padding: 18,
  },
  modalCard: {
    borderRadius: 18,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#DBEAFE",
    padding: 16,
  },
  modalTitle: { fontSize: 22, fontWeight: "800", color: "#0F172A", marginBottom: 6 },
  fieldLabel: { marginTop: 10, color: "#1E293B", fontWeight: "700", fontSize: 14 },
  input: {
    marginTop: 6,
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 11,
    color: "#111827",
    backgroundColor: "#FFFFFF",
    fontSize: 15,
  },
  notesInput: {
    marginTop: 6,
    minHeight: 88,
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: "#111827",
    backgroundColor: "#FFFFFF",
    fontSize: 15,
  },
  dateBtn: {
    marginTop: 6,
    borderWidth: 1,
    borderColor: "#BFDBFE",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 11,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#EFF6FF",
  },
  dateBtnText: { color: "#0F172A", fontSize: 14, fontWeight: "700" },
  switchRow: { marginTop: 12, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  switchLabel: { color: "#1E293B", fontSize: 14, fontWeight: "700" },
  modalActions: { marginTop: 14, flexDirection: "row", gap: 10 },
  cancelBtn: { flex: 1, borderWidth: 1, borderColor: "#CBD5E1", borderRadius: 11, alignItems: "center", paddingVertical: 10 },
  cancelText: { color: "#475569", fontWeight: "700" },
  saveBtn: { flex: 1, backgroundColor: "#2563EB", borderRadius: 11, alignItems: "center", paddingVertical: 10 },
  saveText: { color: "#FFFFFF", fontWeight: "800" },
});
