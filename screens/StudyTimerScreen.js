import { useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
    Alert,
    StyleSheet,
    Text,
    TouchableOpacity,
    Vibration,
    View,
} from "react-native";
import { supabase } from "../lib/supabase";

const SUBJECTS = [
  "SAT Math",
  "SAT Reading",
  "SAT Writing",
  "AP Calculus",
  "AP Physics",
  "AP History",
  "AP English",
  "ACT Prep",
  "General Study",
];

export default function StudyTimerScreen() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [selectedSubject, setSelectedSubject] = useState(null);
  const [seconds, setSeconds] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [isFinished, setIsFinished] = useState(false);
  const intervalRef = useRef(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
    });
  }, []);

  useEffect(() => {
    if (isRunning) {
      intervalRef.current = setInterval(() => {
        setSeconds((prev) => prev + 1);
      }, 1000);
    } else {
      clearInterval(intervalRef.current);
    }
    return () => clearInterval(intervalRef.current);
  }, [isRunning]);

  function formatTime(totalSeconds) {
    const hrs = Math.floor(totalSeconds / 3600);
    const mins = Math.floor((totalSeconds % 3600) / 60);
    const secs = totalSeconds % 60;
    if (hrs > 0) {
      return `${hrs}:${mins.toString().padStart(2, "0")}:${secs
        .toString()
        .padStart(2, "0")}`;
    }
    return `${mins.toString().padStart(2, "0")}:${secs
      .toString()
      .padStart(2, "0")}`;
  }

  function startSession() {
    if (!selectedSubject) {
      Alert.alert("Pick a subject", "Select what you're studying first.");
      return;
    }
    setIsRunning(true);
    setIsFinished(false);
    setSeconds(0);
  }

  function pauseSession() {
    setIsRunning(false);
  }

  function resumeSession() {
    setIsRunning(true);
  }

  async function finishSession() {
    setIsRunning(false);
    setIsFinished(true);
    Vibration.vibrate(500);

    if (!user) return;

    const durationMin = Math.max(1, Math.round(seconds / 60));
    const xpEarned = durationMin * 2;
    const today = new Date().toISOString().split("T")[0];

    const { error } = await supabase.from("study_sessions").insert({
      user_id: user.id,
      subject: selectedSubject,
      duration_min: durationMin,
      xp_earned: xpEarned,
      date: today,
    });

    if (error) {
      Alert.alert("Error saving session", error.message);
      return;
    }

    const { data: profile } = await supabase
      .from("users")
      .select("xp, level")
      .eq("id", user.id)
      .single();

    const newXp = (profile?.xp || 0) + xpEarned;
    const newLevel = Math.floor(newXp / 200) + 1;
    await supabase
      .from("users")
      .update({ xp: newXp, level: newLevel })
      .eq("id", user.id);

    const { data: streakData } = await supabase
      .from("streaks")
      .select("*")
      .eq("user_id", user.id)
      .single();

    const lastDate = streakData?.last_study_date;
    let newStreak = streakData?.current_streak || 0;

    if (lastDate !== today) {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split("T")[0];

      if (lastDate === yesterdayStr) {
        newStreak = newStreak + 1;
      } else if (lastDate !== today) {
        newStreak = 1;
      }
    }

    const longest = Math.max(newStreak, streakData?.longest_streak || 0);
    await supabase
      .from("streaks")
      .update({
        current_streak: newStreak,
        longest_streak: longest,
        last_study_date: today,
      })
      .eq("user_id", user.id);
  }

  function resetAndGoBack() {
    setSeconds(0);
    setIsRunning(false);
    setIsFinished(false);
    setSelectedSubject(null);
    router.back();
  }

  const durationMin = Math.max(1, Math.round(seconds / 60));
  const xpEarned = durationMin * 2;

  if (isFinished) {
    return (
      <View style={styles.container}>
        <View style={styles.finishedCard}>
          <Text style={styles.finishedEmoji}>🎉</Text>
          <Text style={styles.finishedTitle}>Session complete!</Text>
          <Text style={styles.finishedSubject}>{selectedSubject}</Text>

          <View style={styles.finishedStats}>
            <View style={styles.finishedStat}>
              <Text style={styles.finishedStatNumber}>{durationMin}</Text>
              <Text style={styles.finishedStatLabel}>minutes</Text>
            </View>
            <View style={styles.finishedStat}>
              <Text style={styles.finishedStatNumber}>+{xpEarned}</Text>
              <Text style={styles.finishedStatLabel}>XP earned</Text>
            </View>
          </View>

          <TouchableOpacity style={styles.doneBtn} onPress={resetAndGoBack}>
            <Text style={styles.doneBtnText}>Back to dashboard</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (isRunning || seconds > 0) {
    return (
      <View style={styles.container}>
        <TouchableOpacity style={styles.backLink} onPress={resetAndGoBack}>
          <Text style={styles.backLinkText}>← Cancel</Text>
        </TouchableOpacity>

        <View style={styles.timerArea}>
          <Text style={styles.timerSubject}>{selectedSubject}</Text>
          <Text style={styles.timer}>{formatTime(seconds)}</Text>
          <Text style={styles.timerXp}>+{xpEarned} XP so far</Text>
        </View>

        <View style={styles.timerButtons}>
          {isRunning ? (
            <TouchableOpacity style={styles.pauseBtn} onPress={pauseSession}>
              <Text style={styles.pauseBtnText}>Pause</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={styles.resumeBtn}
              onPress={resumeSession}
            >
              <Text style={styles.resumeBtnText}>Resume</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity style={styles.finishBtn} onPress={finishSession}>
            <Text style={styles.finishBtnText}>Finish</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.backLink} onPress={() => router.back()}>
        <Text style={styles.backLinkText}>← Back</Text>
      </TouchableOpacity>

      <Text style={styles.title}>Start a study session</Text>
      <Text style={styles.subtitle}>Pick your subject, then hit start</Text>

      <View style={styles.chips}>
        {SUBJECTS.map((subject) => (
          <TouchableOpacity
            key={subject}
            style={[
              styles.chip,
              selectedSubject === subject && styles.chipSelected,
            ]}
            onPress={() => setSelectedSubject(subject)}
          >
            <Text
              style={[
                styles.chipText,
                selectedSubject === subject && styles.chipTextSelected,
              ]}
            >
              {subject}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity style={styles.startBtn} onPress={startSession}>
        <Text style={styles.startBtnText}>Start studying</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0F0F14",
    padding: 20,
    paddingTop: 60,
  },
  backLink: { marginBottom: 20 },
  backLinkText: { color: "#8888A0", fontSize: 15 },
  title: {
    fontSize: 26,
    fontWeight: "700",
    color: "#F1F1F3",
    marginBottom: 8,
  },
  subtitle: { fontSize: 15, color: "#8888A0", marginBottom: 28 },
  chips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 32,
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#2A2A3A",
    backgroundColor: "#1A1A24",
  },
  chipSelected: { backgroundColor: "#EDE9FE", borderColor: "#7C3AED" },
  chipText: { fontSize: 14, color: "#8888A0" },
  chipTextSelected: { color: "#7C3AED", fontWeight: "600" },
  startBtn: {
    backgroundColor: "#7C3AED",
    height: 54,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  startBtnText: { color: "#fff", fontSize: 17, fontWeight: "600" },
  timerArea: { flex: 1, justifyContent: "center", alignItems: "center" },
  timerSubject: {
    fontSize: 16,
    color: "#8888A0",
    marginBottom: 12,
  },
  timer: {
    fontSize: 72,
    fontWeight: "200",
    color: "#F1F1F3",
    fontVariant: ["tabular-nums"],
  },
  timerXp: {
    fontSize: 16,
    color: "#7C3AED",
    marginTop: 12,
  },
  timerButtons: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 40,
  },
  pauseBtn: {
    flex: 1,
    height: 54,
    borderRadius: 14,
    backgroundColor: "#1A1A24",
    borderWidth: 1,
    borderColor: "#2A2A3A",
    alignItems: "center",
    justifyContent: "center",
  },
  pauseBtnText: { color: "#8888A0", fontSize: 16, fontWeight: "600" },
  resumeBtn: {
    flex: 1,
    height: 54,
    borderRadius: 14,
    backgroundColor: "#1A1A24",
    borderWidth: 1,
    borderColor: "#7C3AED",
    alignItems: "center",
    justifyContent: "center",
  },
  resumeBtnText: { color: "#7C3AED", fontSize: 16, fontWeight: "600" },
  finishBtn: {
    flex: 1,
    height: 54,
    borderRadius: 14,
    backgroundColor: "#22C55E",
    alignItems: "center",
    justifyContent: "center",
  },
  finishBtnText: { color: "#fff", fontSize: 16, fontWeight: "600" },
  finishedCard: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  finishedEmoji: { fontSize: 64, marginBottom: 16 },
  finishedTitle: {
    fontSize: 28,
    fontWeight: "700",
    color: "#F1F1F3",
    marginBottom: 8,
  },
  finishedSubject: { fontSize: 16, color: "#8888A0", marginBottom: 32 },
  finishedStats: { flexDirection: "row", gap: 40, marginBottom: 40 },
  finishedStat: { alignItems: "center" },
  finishedStatNumber: {
    fontSize: 32,
    fontWeight: "700",
    color: "#F1F1F3",
  },
  finishedStatLabel: { fontSize: 14, color: "#8888A0", marginTop: 4 },
  doneBtn: {
    backgroundColor: "#7C3AED",
    height: 54,
    borderRadius: 14,
    paddingHorizontal: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  doneBtnText: { color: "#fff", fontSize: 16, fontWeight: "600" },
}); 

