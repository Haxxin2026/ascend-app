import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
    Alert,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { supabase } from "../lib/supabase";

const SUGGESTED_MISSIONS = [
  { title: "20 algebra practice questions", xp: 40 },
  { title: "Read 1 article for 15 min", xp: 30 },
  { title: "30 min focused study session", xp: 60 },
  { title: "Review flashcards for 10 min", xp: 20 },
  { title: "Watch 1 educational video", xp: 25 },
  { title: "Complete 1 practice test section", xp: 80 },
  { title: "Summarize today's notes", xp: 35 },
  { title: "Teach a concept to someone", xp: 50 },
];

export default function MissionsScreen() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [showAdd, setShowAdd] = useState(false);
  const [customTitle, setCustomTitle] = useState("");
  const today = new Date().toISOString().split("T")[0];

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
      if (user) loadTasks(user.id);
    });
  }, []);

  async function loadTasks(userId) {
    const { data } = await supabase
      .from("tasks")
      .select("*")
      .eq("user_id", userId)
      .eq("date", today)
      .order("completed", { ascending: true });
    setTasks(data || []);
  }

  async function addMission(title, xpReward) {
    if (!user) return;

    const { error } = await supabase.from("tasks").insert({
      user_id: user.id,
      title,
      xp_reward: xpReward,
      date: today,
      completed: false,
    });

    if (error) {
      Alert.alert("Error", error.message);
      return;
    }

    loadTasks(user.id);
  }

  async function addCustomMission() {
    if (!customTitle.trim()) {
      Alert.alert("Empty mission", "Type a mission first.");
      return;
    }

    await addMission(customTitle.trim(), 30);
    setCustomTitle("");
    setShowAdd(false);
  }

  async function toggleComplete(task) {
    if (!user) return;

    const newCompleted = !task.completed;

    await supabase
      .from("tasks")
      .update({ completed: newCompleted })
      .eq("id", task.id);

    if (newCompleted) {
      const { data: profile } = await supabase
        .from("users")
        .select("xp, level")
        .eq("id", user.id)
        .single();

      const newXp = (profile?.xp || 0) + task.xp_reward;
      const newLevel = Math.floor(newXp / 200) + 1;
      await supabase
        .from("users")
        .update({ xp: newXp, level: newLevel })
        .eq("id", user.id);
    }

    loadTasks(user.id);
  }

  async function deleteTask(taskId) {
    await supabase.from("tasks").delete().eq("id", taskId);
    loadTasks(user.id);
  }

  const completedCount = tasks.filter((t) => t.completed).length;
  const totalXpAvailable = tasks.reduce((sum, t) => sum + t.xp_reward, 0);
  const earnedXp = tasks
    .filter((t) => t.completed)
    .reduce((sum, t) => sum + t.xp_reward, 0);

  return (
    <ScrollView style={styles.container}>
      <View style={styles.inner}>
        <TouchableOpacity
          style={styles.backLink}
          onPress={() => router.back()}
        >
          <Text style={styles.backLinkText}>← Back</Text>
        </TouchableOpacity>

        <Text style={styles.title}>Daily missions</Text>
        <Text style={styles.subtitle}>
          Complete missions to earn XP and build your streak
        </Text>

        <View style={styles.progressCard}>
          <View style={styles.progressHeader}>
            <Text style={styles.progressLabel}>Today's progress</Text>
            <Text style={styles.progressCount}>
              {completedCount} / {tasks.length} done
            </Text>
          </View>
          <View style={styles.progressBarBg}>
            <View
              style={[
                styles.progressBarFill,
                {
                  width:
                    tasks.length > 0
                      ? `${(completedCount / tasks.length) * 100}%`
                      : "0%",
                },
              ]}
            />
          </View>
          <Text style={styles.xpText}>
            {earnedXp} / {totalXpAvailable} XP earned
          </Text>
        </View>

        {tasks.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Your missions</Text>
            {tasks.map((task) => (
              <View key={task.id} style={styles.taskCard}>
                <TouchableOpacity
                  style={styles.taskRow}
                  onPress={() => toggleComplete(task)}
                >
                  <View
                    style={[
                      styles.checkbox,
                      task.completed && styles.checkboxDone,
                    ]}
                  >
                    {task.completed && (
                      <Text style={styles.checkmark}>✓</Text>
                    )}
                  </View>
                  <View style={styles.taskInfo}>
                    <Text
                      style={[
                        styles.taskTitle,
                        task.completed && styles.taskTitleDone,
                      ]}
                    >
                      {task.title}
                    </Text>
                    <Text style={styles.taskXp}>+{task.xp_reward} XP</Text>
                  </View>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.deleteBtn}
                  onPress={() => deleteTask(task.id)}
                >
                  <Text style={styles.deleteBtnText}>×</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Add missions</Text>

          {showAdd ? (
            <View style={styles.addCard}>
              <TextInput
                style={styles.addInput}
                placeholder="Type your mission..."
                placeholderTextColor="#555568"
                value={customTitle}
                onChangeText={setCustomTitle}
              />
              <View style={styles.addButtons}>
                <TouchableOpacity
                  style={styles.cancelBtn}
                  onPress={() => {
                    setShowAdd(false);
                    setCustomTitle("");
                  }}
                >
                  <Text style={styles.cancelBtnText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.addBtn}
                  onPress={addCustomMission}
                >
                  <Text style={styles.addBtnText}>Add</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <TouchableOpacity
              style={styles.customBtn}
              onPress={() => setShowAdd(true)}
            >
              <Text style={styles.customBtnText}>+ Create custom mission</Text>
            </TouchableOpacity>
          )}

          <Text style={styles.suggestedLabel}>Quick add</Text>
          {SUGGESTED_MISSIONS.map((mission, i) => (
            <TouchableOpacity
              key={i}
              style={styles.suggestedCard}
              onPress={() => addMission(mission.title, mission.xp)}
            >
              <View style={styles.suggestedInfo}>
                <Text style={styles.suggestedTitle}>{mission.title}</Text>
                <Text style={styles.suggestedXp}>+{mission.xp} XP</Text>
              </View>
              <Text style={styles.suggestedAdd}>+</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0F0F14" },
  inner: { padding: 20, paddingTop: 60, paddingBottom: 40 },
  backLink: { marginBottom: 20 },
  backLinkText: { color: "#8888A0", fontSize: 15 },
  title: { fontSize: 26, fontWeight: "700", color: "#F1F1F3", marginBottom: 8 },
  subtitle: { fontSize: 15, color: "#8888A0", marginBottom: 24, lineHeight: 22 },
  progressCard: {
    backgroundColor: "#1A1A24",
    borderRadius: 16,
    padding: 18,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: "#2A2A3A",
  },
  progressHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  progressLabel: { fontSize: 15, fontWeight: "600", color: "#F1F1F3" },
  progressCount: { fontSize: 14, color: "#8888A0" },
  progressBarBg: {
    height: 10,
    backgroundColor: "#2A2A3A",
    borderRadius: 5,
    overflow: "hidden",
  },
  progressBarFill: {
    height: 10,
    backgroundColor: "#7C3AED",
    borderRadius: 5,
  },
  xpText: { fontSize: 13, color: "#8888A0", marginTop: 8 },
  section: { marginBottom: 20 },
  sectionTitle: {
    fontSize: 17,
    fontWeight: "600",
    color: "#F1F1F3",
    marginBottom: 12,
  },
  taskCard: {
    backgroundColor: "#1A1A24",
    borderRadius: 14,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#2A2A3A",
    flexDirection: "row",
    alignItems: "center",
  },
  taskRow: { flexDirection: "row", alignItems: "center", flex: 1 },
  checkbox: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 2,
    borderColor: "#2A2A3A",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  checkboxDone: { backgroundColor: "#22C55E", borderColor: "#22C55E" },
  checkmark: { color: "#fff", fontSize: 14, fontWeight: "700" },
  taskInfo: { flex: 1 },
  taskTitle: { fontSize: 14, color: "#F1F1F3", marginBottom: 2 },
  taskTitleDone: { textDecorationLine: "line-through", color: "#555568" },
  taskXp: { fontSize: 12, color: "#7C3AED" },
  deleteBtn: { padding: 8 },
  deleteBtnText: { fontSize: 20, color: "#555568" },
  customBtn: {
    backgroundColor: "#1A1A24",
    borderRadius: 14,
    padding: 16,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#2A2A3A",
    borderStyle: "dashed",
    marginBottom: 16,
  },
  customBtnText: { color: "#7C3AED", fontSize: 14, fontWeight: "500" },
  addCard: {
    backgroundColor: "#1A1A24",
    borderRadius: 14,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#7C3AED",
  },
  addInput: {
    height: 44,
    borderRadius: 10,
    backgroundColor: "#0F0F14",
    paddingHorizontal: 14,
    fontSize: 14,
    color: "#F1F1F3",
    marginBottom: 10,
  },
  addButtons: { flexDirection: "row", gap: 8 },
  cancelBtn: {
    flex: 1,
    height: 40,
    borderRadius: 10,
    backgroundColor: "#2A2A3A",
    alignItems: "center",
    justifyContent: "center",
  },
  cancelBtnText: { color: "#8888A0", fontSize: 14 },
  addBtn: {
    flex: 1,
    height: 40,
    borderRadius: 10,
    backgroundColor: "#7C3AED",
    alignItems: "center",
    justifyContent: "center",
  },
  addBtnText: { color: "#fff", fontSize: 14, fontWeight: "600" },
  suggestedLabel: {
    fontSize: 14,
    color: "#8888A0",
    marginBottom: 10,
  },
  suggestedCard: {
    backgroundColor: "#1A1A24",
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#2A2A3A",
    flexDirection: "row",
    alignItems: "center",
  },
  suggestedInfo: { flex: 1 },
  suggestedTitle: { fontSize: 14, color: "#F1F1F3", marginBottom: 2 },
  suggestedXp: { fontSize: 12, color: "#8888A0" },
  suggestedAdd: { fontSize: 24, color: "#7C3AED", fontWeight: "300" },
});

