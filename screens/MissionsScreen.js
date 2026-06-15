import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from "react-native";
import { supabase } from "../lib/supabase";

const INK = { 900: "#14100B", 800: "#1F1A13", 750: "#2A2218", 700: "#382E20" };
const CLAY = { 600: "#C8643C", 700: "#A8492A" };
const TEXT = { strong: "#FCF8F1", primary: "#F0E8DA", secondary: "#CABBA6", muted: "#968A76", faint: "#5F5645", accent: "#C8643C" };
const SERIF = Platform.OS === "ios" ? "Georgia" : "serif";

const SUGGESTED = [
  { title: "30 min focused study session", xp: 60 },
  { title: "20 algebra practice questions", xp: 40 },
  { title: "Review flashcards for 10 min", xp: 20 },
  { title: "Read 1 SAT passage carefully", xp: 30 },
  { title: "Complete 5 geometry problems", xp: 25 },
];

export default function MissionsScreen() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [customTitle, setCustomTitle] = useState("");
  const today = new Date().toISOString().split("T")[0];

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
      if (user) loadTasks(user.id);
    });
  }, []);

  async function loadTasks(userId) {
   const { data, error } = await supabase.from("tasks").select("*").eq("user_id", userId).eq("date", today);
    console.log("LOAD TASKS:", data?.length, "error:", error);
    setTasks(data || []);
  }

  async function addTask(title, xp) {
    if (!user) { console.log("NO USER"); return; }
    const { error } = await supabase.from("tasks").insert({ user_id: user.id, title, xp_reward: xp, date: today, completed: false });
    console.log("TASK INSERT result:", error);
    loadTasks(user.id);
  }

  async function toggleTask(task) {
    const newCompleted = !task.completed;
    await supabase.from("tasks").update({ completed: newCompleted }).eq("id", task.id);
    if (newCompleted && user) {
      const { data: p } = await supabase.from("users").select("xp, level").eq("id", user.id).single();
      const newXp = (p?.xp || 0) + (task.xp_reward || 0);
      const newLevel = Math.floor(newXp / 200) + 1;
      await supabase.from("users").update({ xp: newXp, level: newLevel }).eq("id", user.id);
    }
    loadTasks(user.id);
  }

  async function deleteTask(id) {
    await supabase.from("tasks").delete().eq("id", id);
    if (user) loadTasks(user.id);
  }

  function addCustom() {
    if (!customTitle.trim()) return;
    addTask(customTitle.trim(), 20);
    setCustomTitle("");
  }

  const completed = tasks.filter((t) => t.completed).length;
  const total = tasks.length;
  const totalXp = tasks.reduce((s, t) => s + (t.xp_reward || 0), 0);
  const earnedXp = tasks.filter((t) => t.completed).reduce((s, t) => s + (t.xp_reward || 0), 0);

  return (
    <View style={styles.container}>
      <LinearGradient colors={[INK[900], "#1A1208", "#0A0806"]} style={StyleSheet.absoluteFill} />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1 }}
        keyboardVerticalOffset={90}
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          delaysContentTouches={false}
          contentContainerStyle={{ paddingBottom: 40 }}
        >
          <View style={styles.inner}>
            <Text style={styles.title}>Daily missions</Text>
            <Text style={styles.sub}>Complete missions to earn XP and build your streak.</Text>

            {total > 0 && (
              <View style={styles.progressCard}>
                <View style={styles.progressHeader}>
                  <Text style={styles.progressTitle}>Today's progress</Text>
                  <Text style={styles.progressCount}>{completed} / {total} done</Text>
                </View>
                <View style={styles.progressTrack}>
                  <LinearGradient
                    colors={[CLAY[600], CLAY[700]]}
                    start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                    style={[styles.progressFill, { width: `${total > 0 ? Math.max((completed / total) * 100, 3) : 0}%` }]}
                  />
                </View>
                <Text style={styles.progressXp}>{earnedXp} / {totalXp} XP earned today</Text>
              </View>
            )}

            {total > 0 && <Text style={styles.sectionLabel}>YOUR MISSIONS</Text>}
            {tasks.map((task) => (
              <TouchableOpacity
                key={task.id}
                style={styles.taskRow}
                onPress={() => toggleTask(task)}
                activeOpacity={0.7}
              >
                <View style={[styles.checkbox, task.completed && styles.checkboxDone]}>
                  {task.completed && <Text style={styles.checkmark}>✓</Text>}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.taskTitle, task.completed && styles.taskTitleDone]}>{task.title}</Text>
                  <Text style={styles.taskXp}>+{task.xp_reward} XP</Text>
                </View>
                <TouchableOpacity
                  onPress={() => deleteTask(task.id)}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Text style={styles.deleteBtn}>✕</Text>
                </TouchableOpacity>
              </TouchableOpacity>
            ))}

            <Text style={styles.sectionLabel}>QUICK ADD</Text>
            {SUGGESTED.map((s, i) => (
              <TouchableOpacity
                key={i}
                style={styles.suggestedRow}
                onPress={() => { console.log("ADD PRESSED"); addTask(s.title, s.xp); }}
                activeOpacity={0.7}
              >
                <View style={{ flex: 1 }}>
                  <Text style={styles.suggestedTitle}>{s.title}</Text>
                  <Text style={styles.suggestedXp}>+{s.xp} XP</Text>
                </View>
                <Text style={styles.addIcon}>＋</Text>
              </TouchableOpacity>
            ))}

            <Text style={styles.sectionLabel}>CUSTOM MISSION</Text>
            <View style={styles.customRow}>
              <TextInput
                style={styles.customInput}
                placeholder="Type your mission..."
                placeholderTextColor={TEXT.faint}
                value={customTitle}
                onChangeText={setCustomTitle}
                onSubmitEditing={addCustom}
                returnKeyType="done"
              />
              <TouchableOpacity onPress={addCustom} activeOpacity={0.7}>
                <LinearGradient colors={[CLAY[600], CLAY[700]]} style={styles.customBtn}>
                  <Text style={styles.customBtnText}>Add</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  inner: { paddingHorizontal: 20, paddingTop: 64 },
  title: { fontSize: 28, fontWeight: "700", color: TEXT.strong, fontFamily: SERIF, fontStyle: "italic", marginBottom: 6 },
  sub: { fontSize: 14, color: TEXT.muted, marginBottom: 20 },

  progressCard: { backgroundColor: INK[800], borderRadius: 14, padding: 16, marginBottom: 20, borderWidth: 1, borderColor: INK[700] },
  progressHeader: { flexDirection: "row", justifyContent: "space-between", marginBottom: 12 },
  progressTitle: { fontSize: 14, fontWeight: "600", color: TEXT.primary },
  progressCount: { fontSize: 14, fontWeight: "600", color: TEXT.accent },
  progressTrack: { height: 6, backgroundColor: INK[750], borderRadius: 3, overflow: "hidden" },
  progressFill: { height: 6, borderRadius: 3 },
  progressXp: { fontSize: 12, color: TEXT.faint, marginTop: 10 },

  sectionLabel: { fontSize: 11, fontWeight: "700", color: TEXT.faint, letterSpacing: 2, marginBottom: 12, marginTop: 8 },

  taskRow: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: INK[800], borderRadius: 12, padding: 14, marginBottom: 8,
    borderWidth: 1, borderColor: INK[700],
  },
  checkbox: {
    width: 26, height: 26, borderRadius: 13, borderWidth: 2, borderColor: INK[700],
    alignItems: "center", justifyContent: "center", marginRight: 12,
  },
  checkboxDone: { backgroundColor: "#93A877", borderColor: "#93A877" },
  checkmark: { color: "#fff", fontSize: 14, fontWeight: "700" },
  taskTitle: { fontSize: 14, fontWeight: "500", color: TEXT.primary },
  taskTitleDone: { textDecorationLine: "line-through", color: TEXT.faint },
  taskXp: { fontSize: 12, color: TEXT.accent, marginTop: 2 },
  deleteBtn: { fontSize: 16, color: TEXT.faint, padding: 4 },

  suggestedRow: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: INK[800], borderRadius: 12, padding: 14, marginBottom: 8,
    borderWidth: 1, borderColor: INK[700],
  },
  suggestedTitle: { fontSize: 14, color: TEXT.primary },
  suggestedXp: { fontSize: 12, color: TEXT.muted, marginTop: 2 },
  addIcon: { fontSize: 20, color: TEXT.accent, marginLeft: 8 },

  customRow: { flexDirection: "row", gap: 10 },
  customInput: {
    flex: 1, backgroundColor: INK[800], borderRadius: 12, paddingHorizontal: 14, paddingVertical: 14,
    fontSize: 14, color: TEXT.primary, borderWidth: 1, borderColor: INK[700],
  },
  customBtn: { borderRadius: 12, paddingHorizontal: 20, paddingVertical: 14, justifyContent: "center" },
  customBtnText: { color: "#fff", fontSize: 14, fontWeight: "600" },
});
