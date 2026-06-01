import { useFocusEffect } from "@react-navigation/native";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { supabase } from "../lib/supabase";

export default function DashboardScreen() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [streak, setStreak] = useState(null);
  const [todaySessions, setTodaySessions] = useState([]);
  const [todayTasks, setTodayTasks] = useState([]);
  const [todayMinutes, setTodayMinutes] = useState(0);

  const today = new Date().toISOString().split("T")[0];

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
      if (user) loadData(user.id);
    });
  }, []);

  useFocusEffect(
    useCallback(() => {
      if (user) loadData(user.id);
    }, [user])
  );

  async function loadData(userId) {
    const { data: profileData } = await supabase
      .from("users")
      .select("*")
      .eq("id", userId)
      .single();
    setProfile(profileData);

    const { data: streakData } = await supabase
      .from("streaks")
      .select("*")
      .eq("user_id", userId)
      .single();
    setStreak(streakData);

    const { data: sessionData } = await supabase
      .from("study_sessions")
      .select("*")
      .eq("user_id", userId)
      .eq("date", today);
    setTodaySessions(sessionData || []);

    const totalMin = (sessionData || []).reduce(
      (sum, s) => sum + s.duration_min,
      0
    );
    setTodayMinutes(totalMin);

    const { data: taskData } = await supabase
      .from("tasks")
      .select("*")
      .eq("user_id", userId)
      .eq("date", today);
    setTodayTasks(taskData || []);
  }

  async function logStudySession() {
    if (!user) return;

    const { error } = await supabase.from("study_sessions").insert({
      user_id: user.id,
      subject: profile?.subjects?.[0] || "General Study",
      duration_min: 25,
      xp_earned: 50,
      date: today,
    });

    if (error) {
      Alert.alert("Error", error.message);
      return;
    }

    const newXp = (profile?.xp || 0) + 50;
    const newLevel = Math.floor(newXp / 200) + 1;
    await supabase
      .from("users")
      .update({ xp: newXp, level: newLevel })
      .eq("id", user.id);

    const newStreak = (streak?.current_streak || 0) + 1;
    const longest = Math.max(newStreak, streak?.longest_streak || 0);
    await supabase
      .from("streaks")
      .update({
        current_streak: newStreak,
        longest_streak: longest,
        last_study_date: today,
      })
      .eq("user_id", user.id);

    loadData(user.id);
    Alert.alert("Nice!", "+50 XP earned! Keep going.");
  }

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.replace("/(auth)/signin");
  }

  const level = profile?.level || 1;
  const xp = profile?.xp || 0;
  const xpForNext = level * 200;
  const xpProgress = xp % 200;
  const goalMin = profile?.daily_goal_min || 30;
  const goalProgress = Math.min(todayMinutes / goalMin, 1);

  return (
    <ScrollView style={styles.container}>
      <View style={styles.inner}>
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>
              Hey, {profile?.username || "Student"}
            </Text>
            <Text style={styles.subGreeting}>Let's keep the streak alive</Text>
          </View>
          <TouchableOpacity onPress={handleSignOut}>
            <Text style={styles.signOutText}>Sign out</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statEmoji}>🔥</Text>
            <Text style={styles.statNumber}>
              {streak?.current_streak || 0}
            </Text>
            <Text style={styles.statLabel}>Day streak</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statEmoji}>⚡</Text>
            <Text style={styles.statNumber}>{xp}</Text>
            <Text style={styles.statLabel}>Total XP</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statEmoji}>🎯</Text>
            <Text style={styles.statNumber}>Lv {level}</Text>
            <Text style={styles.statLabel}>Level</Text>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>XP to next level</Text>
          <View style={styles.progressBarBg}>
            <View
              style={[
                styles.progressBarFill,
                { width: `${(xpProgress / 200) * 100}%` },
              ]}
            />
          </View>
          <Text style={styles.progressText}>
            {xpProgress} / 200 XP
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Today's study goal</Text>
          <View style={styles.progressBarBg}>
            <View
              style={[
                styles.progressBarFillGreen,
                { width: `${goalProgress * 100}%` },
              ]}
            />
          </View>
          <Text style={styles.progressText}>
            {todayMinutes} / {goalMin} min
          </Text>
        </View>

        
        <TouchableOpacity style={styles.studyBtn} onPress={() => router.push("/study")}>
          <Text style={styles.studyBtnText}>Start study session</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.heatmapBtn} onPress={() => router.push("/heatmap")}>
          <Text style={styles.heatmapBtnText}>View weakness heatmap</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.heatmapBtn} onPress={() => router.push("/missions")}>
          <Text style={styles.heatmapBtnText}>Daily missions</Text>
        </TouchableOpacity>

        <View style={styles.card}>
          <View style={styles.missionsHeader}>
            <Text style={styles.cardTitle}>Daily missions</Text>
            <TouchableOpacity onPress={() => router.push("/missions")}>
              <Text style={styles.viewAllText}>View all →</Text>
            </TouchableOpacity>
          </View>
          {todayTasks.length === 0 ? (
            <Text style={styles.emptyText}>No missions yet. Add some!</Text>
          ) : (
            <>
              <View style={styles.progressBarBg}>
                <View
                  style={[
                    styles.progressBarFill,
                    {
                      width: `${
                        (todayTasks.filter((t) => t.completed).length /
                          todayTasks.length) *
                        100
                      }%`,
                    },
                  ]}
                />
              </View>
              <Text style={styles.progressText}>
                {todayTasks.filter((t) => t.completed).length} /{" "}
                {todayTasks.length} missions complete
              </Text>
            </>
          )}
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Today's sessions</Text>
          {todaySessions.length === 0 ? (
            <Text style={styles.emptyText}>
              No sessions yet. Start studying!
            </Text>
          ) : (
            todaySessions.map((session, i) => (
              <View key={i} style={styles.sessionRow}>
                <Text style={styles.sessionSubject}>{session.subject}</Text>
                <Text style={styles.sessionDuration}>
                  {session.duration_min} min · +{session.xp_earned} XP
                </Text>
              </View>
            ))
          )}
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Subjects</Text>
          <View style={styles.chips}>
            {(profile?.subjects || []).map((sub, i) => (
              <View key={i} style={styles.chip}>
                <Text style={styles.chipText}>{sub}</Text>
              </View>
            ))}
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0F0F14" },
  inner: { padding: 20, paddingTop: 60, paddingBottom: 40 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 24,
  },
  greeting: { fontSize: 24, fontWeight: "700", color: "#F1F1F3" },
  subGreeting: { fontSize: 14, color: "#8888A0", marginTop: 4 },
  signOutText: { fontSize: 13, color: "#8888A0" },
  statsRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 20,
  },
  statCard: {
    flex: 1,
    backgroundColor: "#1A1A24",
    borderRadius: 16,
    padding: 16,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#2A2A3A",
  },
  statEmoji: { fontSize: 24, marginBottom: 6 },
  statNumber: { fontSize: 22, fontWeight: "700", color: "#F1F1F3" },
  statLabel: { fontSize: 12, color: "#8888A0", marginTop: 4 },
  card: {
    backgroundColor: "#1A1A24",
    borderRadius: 16,
    padding: 18,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#2A2A3A",
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: "#F1F1F3",
    marginBottom: 12,
  },
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
  progressBarFillGreen: {
    height: 10,
    backgroundColor: "#22C55E",
    borderRadius: 5,
  },
  progressText: {
    fontSize: 13,
    color: "#8888A0",
    marginTop: 8,
  },
  studyBtn: {
    backgroundColor: "#7C3AED",
    height: 54,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  studyBtnText: { color: "#fff", fontSize: 16, fontWeight: "600" },
  emptyText: { fontSize: 14, color: "#555568" },
  sessionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#2A2A3A",
  },
  sessionSubject: { fontSize: 14, color: "#F1F1F3" },
  sessionDuration: { fontSize: 13, color: "#8888A0" },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#2A2A3A",
  },
  chipText: { fontSize: 13, color: "#F1F1F3" },


  heatmapBtn: {
    backgroundColor: "#1A1A24",
    height: 54,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#7C3AED",
  },
  heatmapBtnText: { color: "#7C3AED", fontSize: 16, fontWeight: "600" },
  missionsHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  viewAllText: { fontSize: 13, color: "#7C3AED" },
});

Ah 

