import { useFocusEffect } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from "react-native";
import { supabase } from "../lib/supabase";

const INK = { 950: "#0A0806", 900: "#14100B", 800: "#1F1A13", 750: "#2A2218", 700: "#382E20" };
const CLAY = { 300: "#DDA878", 400: "#D5895B", 600: "#C8643C", 700: "#A8492A", 900: "#2A1610" };
const TEXT = { strong: "#FCF8F1", primary: "#F0E8DA", secondary: "#CABBA6", muted: "#968A76", faint: "#5F5645", accent: "#C8643C" };
const SERIF = Platform.OS === "ios" ? "Georgia" : "serif";

export default function DashboardScreen() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [streak, setStreak] = useState(null);
  const [todaySessions, setTodaySessions] = useState([]);
  const [todayTasks, setTodayTasks] = useState([]);
  const [todayMinutes, setTodayMinutes] = useState(0);
  const [showProfile, setShowProfile] = useState(false);

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
    const { data: profileData } = await supabase.from("users").select("*").eq("id", userId).single();
    setProfile(profileData);
    const { data: streakData } = await supabase.from("streaks").select("*").eq("user_id", userId).single();
    setStreak(streakData);
    const { data: sessionData } = await supabase.from("study_sessions").select("*").eq("user_id", userId).eq("date", today);
    setTodaySessions(sessionData || []);
    const totalMin = (sessionData || []).reduce((sum, s) => sum + s.duration_min, 0);
    setTodayMinutes(totalMin);
    const { data: taskData } = await supabase.from("tasks").select("*").eq("user_id", userId).eq("date", today);
    setTodayTasks(taskData || []);
  }

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.replace("/(auth)/signin");
  }

  const level = profile?.level || 1;
  const xp = profile?.xp || 0;
  const xpProgress = xp % 200;
  const goalMin = profile?.daily_goal_min || 30;
  const goalProgress = Math.min(todayMinutes / goalMin, 1);
  const streakCount = streak?.current_streak || 0;
  const missionsComplete = todayTasks.filter((t) => t.completed).length;
  const missionsTotal = todayTasks.length;
  const days = ["SUNDAY", "MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY"];
  const dayName = days[new Date().getDay()];
  const userName = profile?.username || "Student";

  return (
    <View style={styles.container}>
      <LinearGradient colors={[INK[900], "#1A1208", INK[950]]} locations={[0, 0.4, 1]} style={StyleSheet.absoluteFill} />

      {/* Profile Modal */}
      <Modal visible={showProfile} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Profile</Text>
              <TouchableOpacity onPress={() => setShowProfile(false)}>
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.profileAvatar}>
              <Text style={styles.profileAvatarText}>{userName.charAt(0).toUpperCase()}</Text>
            </View>

            <View style={styles.profileRow}>
              <Text style={styles.profileLabel}>USERNAME</Text>
              <Text style={styles.profileValue}>{userName}</Text>
            </View>
            <View style={styles.profileRow}>
              <Text style={styles.profileLabel}>EMAIL</Text>
              <Text style={styles.profileValue}>{user?.email || "—"}</Text>
            </View>
            <View style={styles.profileRow}>
              <Text style={styles.profileLabel}>LEVEL</Text>
              <Text style={styles.profileValue}>{level}</Text>
            </View>
            <View style={styles.profileRow}>
              <Text style={styles.profileLabel}>TOTAL XP</Text>
              <Text style={styles.profileValue}>{xp}</Text>
            </View>
            <View style={styles.profileRow}>
              <Text style={styles.profileLabel}>LONGEST STREAK</Text>
              <Text style={styles.profileValue}>{streak?.longest_streak || 0} days</Text>
            </View>
            <View style={styles.profileRow}>
              <Text style={styles.profileLabel}>SUBJECTS</Text>
              <Text style={styles.profileValue}>{(profile?.subjects || []).join(", ") || "—"}</Text>
            </View>
            <View style={styles.profileRow}>
              <Text style={styles.profileLabel}>DAILY GOAL</Text>
              <Text style={styles.profileValue}>{goalMin} min/day</Text>
            </View>

            <TouchableOpacity
              style={styles.signOutBtn}
              onPress={() => { setShowProfile(false); handleSignOut(); }}
            >
              <Text style={styles.signOutBtnText}>Sign out</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.signOutBtn}
              onPress={() => { setShowProfile(false); handleSignOut(); }}
            >
              <Text style={styles.signOutBtnText}>Sign out</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.deleteBtn}
              onPress={() => {
                Alert.alert(
                  "Delete Account",
                  "Are you sure you want to permanently delete your account and all your data? This cannot be undone.",
                  [
                    { text: "Cancel", style: "cancel" },
                    {
                      text: "Delete",
                      style: "destructive",
                      onPress: async () => {
                        if (user) {
                          await supabase.from("student_answers").delete().eq("user_id", user.id);
                          await supabase.from("test_attempts").delete().eq("user_id", user.id);
                          await supabase.from("study_sessions").delete().eq("user_id", user.id);
                          await supabase.from("tasks").delete().eq("user_id", user.id);
                          await supabase.from("streaks").delete().eq("user_id", user.id);
                          await supabase.from("weakness_areas").delete().eq("user_id", user.id);
                          await supabase.from("users").delete().eq("id", user.id);
                          await supabase.auth.signOut();
                          setShowProfile(false);
                          router.replace("/(auth)/signin");
                        }
                      },
                    },
                  ]
                );
              }}
            >
              <Text style={styles.deleteBtnText}>Delete account</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>


      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.inner}>

          {/* Header */}
          <View style={styles.header}>
            <View style={{ flex: 1 }}>
              <Text style={styles.eyebrow}>{dayName} · DAY {streakCount}</Text>
              <Text style={styles.heroName}>Hey, {userName}</Text>
              <Text style={styles.heroSub}>
                {streakCount > 0 ? "Let's keep the streak alive 🔥" : "Let's start something great today"}
              </Text>
            </View>
            <TouchableOpacity style={styles.avatar} onPress={() => setShowProfile(true)}>
              <Text style={styles.avatarText}>{userName.charAt(0).toUpperCase()}</Text>
            </TouchableOpacity>
          </View>

          {/* Stats Card */}
          <View style={styles.statsCard}>
            <View style={styles.levelRing}>
              <View style={styles.levelInner}>
                <Text style={styles.levelLabel}>LEVEL</Text>
                <Text style={styles.levelNum}>{level}</Text>
              </View>
            </View>
            <View style={styles.statsRight}>
              <View style={styles.statItem}>
                <Text style={styles.statBigNum}>{xp.toLocaleString()}</Text>
                <Text style={styles.statSmLabel}>Total XP</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <View style={styles.streakRow}>
                  <Text style={styles.fireEmoji}>🔥</Text>
                  <Text style={styles.statBigNum}>{streakCount}</Text>
                </View>
                <Text style={styles.statSmLabel}>Day streak</Text>
              </View>
            </View>
            <View style={styles.xpMeterWrap}>
              <View style={styles.xpMeterTrack}>
                <LinearGradient
                  colors={[CLAY[700], CLAY[600], CLAY[400]]}
                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                  style={[styles.xpMeterFill, { width: `${Math.max((xpProgress / 200) * 100, 3)}%` }]}
                />
              </View>
              <Text style={styles.xpMeterText}>{xpProgress} / 200 XP to Lv {level + 1}</Text>
            </View>
          </View>

          {/* Daily Goal */}
          <View style={styles.goalCard}>
            <View style={styles.goalHeader}>
              <Text style={styles.goalTitle}>Today's study goal</Text>
              <Text style={styles.goalValue}>{todayMinutes} / {goalMin} min</Text>
            </View>
            <View style={styles.goalTrack}>
              <LinearGradient
                colors={["#93A877", "#A8B88A"]}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                style={[styles.goalFill, { width: `${Math.max(goalProgress * 100, 3)}%` }]}
              />
            </View>
            <Text style={styles.goalHint}>
              {goalProgress >= 1 ? "Goal reached — incredible work." : `${goalMin - todayMinutes} minutes to go — one short session does it.`}
            </Text>
          </View>

          {/* Jump back in */}
          <Text style={styles.sectionEyebrow}>JUMP BACK IN</Text>
          <View style={styles.jumpRow}>
            <TouchableOpacity style={styles.jumpCard} activeOpacity={0.85} onPress={() => router.push("/(tabs)/study")}>
              <View style={styles.jumpIconWrap}><Text style={styles.jumpIcon}>⏱</Text></View>
              <Text style={styles.jumpTitle}>Timer</Text>
              <Text style={styles.jumpSub}>Focus session</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.jumpCard} activeOpacity={0.85} onPress={() => router.push("/(tabs)/practice")}>
              <View style={styles.jumpIconWrap}><Text style={styles.jumpIcon}>✏️</Text></View>
              <Text style={styles.jumpTitle}>Practice</Text>
              <Text style={styles.jumpSub}>1,400+ questions</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.jumpRow}>
            <TouchableOpacity style={styles.jumpCard} activeOpacity={0.85} onPress={() => router.push("/(tabs)/heatmap")}>
              <View style={styles.jumpIconWrap}><Text style={styles.jumpIcon}>🗺️</Text></View>
              <Text style={styles.jumpTitle}>Heatmap</Text>
              <Text style={styles.jumpSub}>Weak spots</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.jumpCard} activeOpacity={0.85} onPress={() => router.push("/(tabs)/missions")}>
              <View style={styles.jumpIconWrap}><Text style={styles.jumpIcon}>🎯</Text></View>
              <Text style={styles.jumpTitle}>Missions</Text>
              <Text style={styles.jumpSub}>{missionsTotal > 0 ? `${missionsComplete}/${missionsTotal} done` : "Set goals"}</Text>
            </TouchableOpacity>
          </View>

            <TouchableOpacity
            style={[styles.jumpCard, { height: 80 }]}
            activeOpacity={0.85}
            onPress={() => router.push("/test-list")}
          >
            <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
              <View style={styles.jumpIconWrap}><Text style={styles.jumpIcon}>📝</Text></View>
              <View>
                <Text style={styles.jumpTitle}>Practice Tests</Text>
                <Text style={styles.jumpSub}>10 full-length SAT tests</Text>
              </View>
            </View>
          </TouchableOpacity>

          {/* Missions progress */}
          {missionsTotal > 0 && (
            <TouchableOpacity activeOpacity={0.85} onPress={() => router.push("/(tabs)/missions")}>
              <View style={styles.missionCard}>
                <View style={styles.goalHeader}>
                  <Text style={styles.goalTitle}>Missions</Text>
                  <Text style={styles.missionCount}>{missionsComplete} / {missionsTotal} done</Text>
                </View>
                <View style={styles.goalTrack}>
                  <LinearGradient
                    colors={[CLAY[600], CLAY[400]]}
                    start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                    style={[styles.goalFill, { width: `${Math.max((missionsComplete / missionsTotal) * 100, 3)}%` }]}
                  />
                </View>
              </View>
            </TouchableOpacity>
          )}

          {/* Today's sessions */}
          {todaySessions.length > 0 && (
            <View style={styles.sessionsWrap}>
              <Text style={styles.sectionEyebrow}>TODAY'S SESSIONS</Text>
              {todaySessions.map((session, i) => (
                <View key={i} style={styles.sessionRow}>
                  <View style={styles.sessionLeft}>
                    <View style={styles.sessionDot} />
                    <View>
                      <Text style={styles.sessionName}>{session.subject}</Text>
                      <Text style={styles.sessionMeta}>{session.duration_min} min · +{session.xp_earned} XP</Text>
                    </View>
                  </View>
                </View>
              ))}
            </View>
          )}

          <View style={{ height: 50 }} />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  inner: { paddingHorizontal: 20, paddingTop: 64 },

  header: { flexDirection: "row", alignItems: "flex-start", marginBottom: 28 },
  eyebrow: { fontSize: 11, fontWeight: "700", color: TEXT.accent, letterSpacing: 2, marginBottom: 6 },
  heroName: { fontSize: 32, fontWeight: "700", color: TEXT.strong, fontFamily: SERIF, fontStyle: "italic", letterSpacing: -0.5 },
  heroSub: { fontSize: 14, color: TEXT.muted, marginTop: 4 },
  avatar: { width: 42, height: 42, borderRadius: 21, backgroundColor: CLAY[700], alignItems: "center", justifyContent: "center", marginLeft: 16, marginTop: 20 },
  avatarText: { fontSize: 16, fontWeight: "700", color: TEXT.strong },

  statsCard: { backgroundColor: INK[800], borderRadius: 16, padding: 20, marginBottom: 12, borderWidth: 1, borderColor: INK[700] },
  levelRing: { width: 72, height: 72, borderRadius: 36, borderWidth: 3, borderColor: CLAY[600], alignItems: "center", justifyContent: "center", alignSelf: "flex-start", marginBottom: 16 },
  levelInner: { alignItems: "center" },
  levelLabel: { fontSize: 9, fontWeight: "700", color: TEXT.muted, letterSpacing: 1.5 },
  levelNum: { fontSize: 24, fontWeight: "800", color: TEXT.strong, letterSpacing: -1, lineHeight: 28 },
  statsRight: { flexDirection: "row", alignItems: "center", marginBottom: 18 },
  statItem: { flex: 1 },
  statBigNum: { fontSize: 22, fontWeight: "800", color: TEXT.strong, letterSpacing: -0.5 },
  statSmLabel: { fontSize: 12, color: TEXT.muted, marginTop: 2 },
  statDivider: { width: 1, height: 30, backgroundColor: INK[700], marginHorizontal: 16 },
  streakRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  fireEmoji: { fontSize: 18 },
  xpMeterWrap: { marginTop: 2 },
  xpMeterTrack: { height: 6, backgroundColor: INK[750], borderRadius: 3, overflow: "hidden" },
  xpMeterFill: { height: 6, borderRadius: 3 },
  xpMeterText: { fontSize: 12, color: TEXT.faint, marginTop: 8 },

  goalCard: { backgroundColor: INK[800], borderRadius: 16, padding: 18, marginBottom: 12, borderWidth: 1, borderColor: INK[700] },
  goalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  goalTitle: { fontSize: 15, fontWeight: "600", color: TEXT.primary },
  goalValue: { fontSize: 14, fontWeight: "600", color: TEXT.secondary },
  goalTrack: { height: 6, backgroundColor: INK[750], borderRadius: 3, overflow: "hidden" },
  goalFill: { height: 6, borderRadius: 3 },
  goalHint: { fontSize: 12, color: TEXT.faint, marginTop: 10, fontStyle: "italic" },

  sectionEyebrow: { fontSize: 11, fontWeight: "700", color: TEXT.faint, letterSpacing: 2, marginTop: 14, marginBottom: 14 },
  jumpRow: { flexDirection: "row", gap: 10, marginBottom: 10 },
  jumpCard: { flex: 1, backgroundColor: INK[800], borderRadius: 16, padding: 18, height: 130, justifyContent: "flex-end", borderWidth: 1, borderColor: INK[700] },
  jumpIconWrap: { width: 40, height: 40, borderRadius: 12, backgroundColor: INK[750], alignItems: "center", justifyContent: "center", marginBottom: 14 },
  jumpIcon: { fontSize: 20 },
  jumpTitle: { fontSize: 15, fontWeight: "700", color: TEXT.strong, marginBottom: 2 },
  jumpSub: { fontSize: 12, color: TEXT.muted },

  missionCard: { backgroundColor: INK[800], borderRadius: 16, padding: 18, marginBottom: 12, borderWidth: 1, borderColor: INK[700] },
  missionCount: { fontSize: 13, fontWeight: "600", color: TEXT.accent },

  sessionsWrap: { marginTop: 8 },
  sessionRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", backgroundColor: INK[800], borderRadius: 12, padding: 14, marginBottom: 6, borderWidth: 1, borderColor: INK[700] },
  sessionLeft: { flexDirection: "row", alignItems: "center", gap: 12 },
  sessionDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: CLAY[600] },
  sessionName: { fontSize: 14, fontWeight: "600", color: TEXT.primary },
  sessionMeta: { fontSize: 12, color: TEXT.muted, marginTop: 1 },

  // Profile Modal
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.7)", justifyContent: "flex-end" },
  modalCard: { backgroundColor: INK[800], borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40 },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 24 },
  modalTitle: { fontSize: 22, fontWeight: "700", color: TEXT.strong, fontFamily: SERIF, fontStyle: "italic" },
  modalClose: { fontSize: 20, color: TEXT.faint, padding: 4 },
  profileAvatar: { width: 64, height: 64, borderRadius: 32, backgroundColor: CLAY[700], alignItems: "center", justifyContent: "center", alignSelf: "center", marginBottom: 24 },
  profileAvatarText: { fontSize: 28, fontWeight: "700", color: TEXT.strong },
  profileRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: INK[700] },
  profileLabel: { fontSize: 11, fontWeight: "700", color: TEXT.faint, letterSpacing: 1.5 },
  profileValue: { fontSize: 14, fontWeight: "500", color: TEXT.primary, textAlign: "right", flex: 1, marginLeft: 16 },
  signOutBtn: { marginTop: 24, backgroundColor: INK[750], borderRadius: 12, paddingVertical: 16, alignItems: "center", borderWidth: 1, borderColor: INK[700] },
  signOutBtnText: { fontSize: 15, fontWeight: "600", color: "#A6402E" },
  signOutBtnText: { fontSize: 15, fontWeight: "600", color: "#A6402E" },
  deleteBtn: { marginTop: 10, backgroundColor: "transparent", borderRadius: 12, paddingVertical: 16, alignItems: "center", borderWidth: 1, borderColor: "#A6402E50" },
  deleteBtnText: { fontSize: 15, fontWeight: "600", color: "#A6402E" },
});
