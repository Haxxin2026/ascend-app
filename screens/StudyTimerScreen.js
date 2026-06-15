import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { supabase } from "../lib/supabase";

const INK = { 900: "#14100B", 800: "#1F1A13", 750: "#2A2218", 700: "#382E20" };
const CLAY = { 400: "#D5895B", 600: "#C8643C", 700: "#A8492A" };
const TEXT = { strong: "#FCF8F1", primary: "#F0E8DA", secondary: "#CABBA6", muted: "#968A76", faint: "#5F5645", accent: "#C8643C" };
const SERIF = Platform.OS === "ios" ? "Georgia" : "serif";

export default function StudyTimerScreen() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [selectedSubject, setSelectedSubject] = useState(null);
  const [seconds, setSeconds] = useState(0);
  const [running, setRunning] = useState(false);
  const [finished, setFinished] = useState(false);
  const intervalRef = useRef(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
      if (user) {
        supabase.from("users").select("*").eq("id", user.id).single()
          .then(({ data }) => setProfile(data));
      }
    });
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, []);

  function startTimer(subject) {
    setSelectedSubject(subject);
    setSeconds(0);
    setRunning(true);
    setFinished(false);
    intervalRef.current = setInterval(() => setSeconds((s) => s + 1), 1000);
  }

  function pauseTimer() {
    clearInterval(intervalRef.current);
    setRunning(false);
  }

  function resumeTimer() {
    setRunning(true);
    intervalRef.current = setInterval(() => setSeconds((s) => s + 1), 1000);
  }

  async function stopTimer() {
    clearInterval(intervalRef.current);
    setRunning(false);
    setFinished(true);
    const minutes = Math.max(Math.floor(seconds / 60), 1);
    const xpEarned = minutes * 2;
    if (user) {
      const today = new Date().toISOString().split("T")[0];
      await supabase.from("study_sessions").insert({
        user_id: user.id, subject: selectedSubject,
        duration_min: minutes, xp_earned: xpEarned, date: today,
      });
      const { data: p } = await supabase.from("users").select("xp, level").eq("id", user.id).single();
      const newXp = (p?.xp || 0) + xpEarned;
      const newLevel = Math.floor(newXp / 200) + 1;
      await supabase.from("users").update({ xp: newXp, level: newLevel }).eq("id", user.id);
      const { data: s } = await supabase.from("streaks").select("*").eq("user_id", user.id).single();
      if (s?.last_study_date !== today) {
        const newStreak = (s?.current_streak || 0) + 1;
        const longest = Math.max(newStreak, s?.longest_streak || 0);
        await supabase.from("streaks").update({ current_streak: newStreak, longest_streak: longest, last_study_date: today }).eq("user_id", user.id);
      }
    }
  }

  const formatTime = (s) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m.toString().padStart(2, "0")}:${sec.toString().padStart(2, "0")}`;
  };

  // ── Subject picker ──
  if (!selectedSubject && !finished) {
    return (
      <View style={styles.container}>
        <LinearGradient colors={[INK[900], "#1A1208", "#0A0806"]} style={StyleSheet.absoluteFill} />
        <ScrollView showsVerticalScrollIndicator={false}>
          <View style={styles.inner}>
            <Text style={styles.title}>Start a study session</Text>
            <Text style={styles.sub}>Pick your subject, then hit start.</Text>
            {(profile?.subjects || []).map((sub) => (
              <TouchableOpacity key={sub} style={styles.subjectChip} onPress={() => startTimer(sub)}>
                <Text style={styles.subjectChipText}>{sub}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      </View>
    );
  }

  // ── Finished ──
  if (finished) {
    const minutes = Math.max(Math.floor(seconds / 60), 1);
    const xpEarned = minutes * 2;
    return (
      <View style={styles.container}>
        <LinearGradient colors={[INK[900], "#1A1208", "#0A0806"]} style={StyleSheet.absoluteFill} />
        <View style={styles.finWrap}>
          <Text style={styles.finEmoji}>🎉</Text>
          <Text style={styles.finTitle}>Session complete</Text>
          <Text style={styles.finSub}>{selectedSubject}</Text>
          <View style={styles.finStats}>
            <View style={styles.finStat}>
              <Text style={styles.finStatNum}>{formatTime(seconds)}</Text>
              <Text style={styles.finStatLabel}>Duration</Text>
            </View>
            <View style={styles.finDivider} />
            <View style={styles.finStat}>
              <Text style={styles.finStatNum}>+{xpEarned}</Text>
              <Text style={styles.finStatLabel}>XP earned</Text>
            </View>
          </View>
          <TouchableOpacity onPress={() => { setSelectedSubject(null); setFinished(false); setSeconds(0); }}>
            <LinearGradient colors={[CLAY[600], CLAY[700]]} style={styles.finBtn}>
              <Text style={styles.finBtnText}>Start another session</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // ── Timer running ──
  return (
    <View style={styles.container}>
      <LinearGradient colors={[INK[900], "#1A1208", "#0A0806"]} style={StyleSheet.absoluteFill} />
      <View style={styles.timerWrap}>
        <Text style={styles.timerSubject}>{selectedSubject}</Text>
        <View style={styles.timerRing}>
          <Text style={styles.timerText}>{formatTime(seconds)}</Text>
        </View>
        <Text style={styles.timerHint}>{running ? "Focus. You're doing great." : "Paused"}</Text>
        <View style={styles.timerBtns}>
          {running ? (
            <TouchableOpacity style={styles.timerBtnOutline} onPress={pauseTimer}>
              <Text style={styles.timerBtnOutlineText}>Pause</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity onPress={resumeTimer}>
              <LinearGradient colors={[CLAY[600], CLAY[700]]} style={styles.timerBtnFill}>
                <Text style={styles.timerBtnFillText}>Resume</Text>
              </LinearGradient>
            </TouchableOpacity>
          )}
          <TouchableOpacity style={styles.timerBtnOutline} onPress={stopTimer}>
            <Text style={styles.timerBtnOutlineText}>Finish</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  inner: { paddingHorizontal: 20, paddingTop: 64, paddingBottom: 40 },
  title: { fontSize: 28, fontWeight: "700", color: TEXT.strong, fontFamily: SERIF, fontStyle: "italic", marginBottom: 6 },
  sub: { fontSize: 14, color: TEXT.muted, marginBottom: 24 },
  subjectChip: {
    backgroundColor: INK[800], borderRadius: 12, paddingVertical: 16, paddingHorizontal: 20,
    marginBottom: 8, borderWidth: 1, borderColor: INK[700],
  },
  subjectChipText: { fontSize: 15, fontWeight: "600", color: TEXT.primary },

  timerWrap: { flex: 1, justifyContent: "center", alignItems: "center", padding: 24 },
  timerSubject: { fontSize: 14, color: TEXT.muted, textTransform: "uppercase", letterSpacing: 2, marginBottom: 32 },
  timerRing: {
    width: 200, height: 200, borderRadius: 100, borderWidth: 3, borderColor: CLAY[600],
    backgroundColor: INK[800], alignItems: "center", justifyContent: "center", marginBottom: 20,
  },
  timerText: { fontSize: 48, fontWeight: "800", color: TEXT.strong, letterSpacing: -2 },
  timerHint: { fontSize: 14, color: TEXT.muted, fontStyle: "italic", marginBottom: 40 },
  timerBtns: { flexDirection: "row", gap: 12 },
  timerBtnOutline: {
    borderRadius: 14, paddingVertical: 16, paddingHorizontal: 32,
    borderWidth: 1, borderColor: INK[700], backgroundColor: INK[800],
  },
  timerBtnOutlineText: { fontSize: 15, fontWeight: "600", color: TEXT.secondary },
  timerBtnFill: { borderRadius: 14, paddingVertical: 16, paddingHorizontal: 32 },
  timerBtnFillText: { fontSize: 15, fontWeight: "700", color: "#fff" },

  finWrap: { flex: 1, justifyContent: "center", alignItems: "center", padding: 24 },
  finEmoji: { fontSize: 56, marginBottom: 14 },
  finTitle: { fontSize: 28, fontWeight: "700", color: TEXT.strong, fontFamily: SERIF, fontStyle: "italic" },
  finSub: { fontSize: 14, color: TEXT.muted, marginTop: 4, marginBottom: 28 },
  finStats: { flexDirection: "row", alignItems: "center", marginBottom: 32 },
  finStat: { alignItems: "center", paddingHorizontal: 24 },
  finStatNum: { fontSize: 24, fontWeight: "800", color: TEXT.strong },
  finStatLabel: { fontSize: 12, color: TEXT.muted, marginTop: 4 },
  finDivider: { width: 1, height: 30, backgroundColor: INK[700] },
  finBtn: { borderRadius: 14, paddingVertical: 16, paddingHorizontal: 40, alignItems: "center" },
  finBtnText: { color: "#fff", fontSize: 16, fontWeight: "700" },
});
