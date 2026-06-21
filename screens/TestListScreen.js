import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  ScrollView,
  Share,
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

export default function TestListScreen() {
  const router = useRouter();
  const [tests, setTests] = useState([]);
  const [attempts, setAttempts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
      loadData(user?.id);
    });
  }, []);

  async function loadData(userId) {
    const { data: testData } = await supabase
      .from("practice_tests")
      .select("*")
      .order("test_number", { ascending: true });
    setTests(testData || []);

    if (userId) {
      const { data: profileData } = await supabase
        .from("users")
        .select("referral_code, tests_unlocked")
        .eq("id", userId)
        .single();
      setProfile(profileData);

      const { data: attemptData } = await supabase
        .from("test_attempts")
        .select("*")
        .eq("user_id", userId)
        .order("started_at", { ascending: false });
      setAttempts(attemptData || []);
    }
    setLoading(false);
  }

  function getBestScore(testId) {
    const testAttempts = attempts.filter((a) => a.test_id === testId && a.completed_at);
    if (testAttempts.length === 0) return null;
    return testAttempts.reduce((best, a) => {
      const score = a.total_correct || 0;
      return score > best ? score : best;
    }, 0);
  }

  function getAttemptCount(testId) {
    return attempts.filter((a) => a.test_id === testId).length;
  }

  function isTestUnlocked(testNumber) {
    if (testNumber === 1) return true;
    return profile?.tests_unlocked === true;
  }

  async function handleShare() {
    const code = profile?.referral_code || "------";
    try {
      await Share.share({
        message: `I'm using Ascend to prep for the SAT — it's free and the questions are harder than College Board. Use my referral code ${code} when you sign up and we both unlock all 10 practice tests!\n\nhttps://ascend-app.vercel.app`,
      });
    } catch (e) {}
  }

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: "center", alignItems: "center" }]}>
        <LinearGradient colors={[INK[900], "#1A1208", "#0A0806"]} style={StyleSheet.absoluteFill} />
        <ActivityIndicator size="large" color={CLAY[600]} />
      </View>
    );
  }

  const unlocked = profile?.tests_unlocked;

  return (
    <View style={styles.container}>
      <LinearGradient colors={[INK[900], "#1A1208", "#0A0806"]} style={StyleSheet.absoluteFill} />
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.inner}>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={styles.backText}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Practice Tests</Text>
          <Text style={styles.sub}>Full-length SAT practice tests. Harder than College Board.</Text>

          <View style={styles.statsRow}>
            <View style={styles.statBox}>
              <Text style={styles.statNum}>{tests.length}</Text>
              <Text style={styles.statLabel}>TESTS</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statNum}>98</Text>
              <Text style={styles.statLabel}>Q PER TEST</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statNum}>{attempts.filter((a) => a.completed_at).length}</Text>
              <Text style={styles.statLabel}>COMPLETED</Text>
            </View>
          </View>

          {/* Referral unlock card */}
          {!unlocked && (
            <View style={styles.referralCard}>
              <Text style={styles.referralEmoji}>🔓</Text>
              <Text style={styles.referralTitle}>Unlock all tests</Text>
              <Text style={styles.referralText}>
                Share your referral code with a friend. When they sign up, you both unlock all 10 practice tests.
              </Text>
              <View style={styles.codeBox}>
                <Text style={styles.codeLabel}>YOUR CODE</Text>
                <Text style={styles.codeText}>{profile?.referral_code || "------"}</Text>
              </View>
              <TouchableOpacity activeOpacity={0.85} onPress={handleShare}>
                <LinearGradient colors={[CLAY[600], CLAY[700]]} style={styles.shareBtn}>
                  <Text style={styles.shareBtnText}>Share with a friend</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          )}

          {unlocked && (
            <View style={styles.unlockedBanner}>
              <Text style={styles.unlockedText}>✓ All tests unlocked</Text>
            </View>
          )}

          {tests.map((test) => {
            const best = getBestScore(test.id);
            const count = getAttemptCount(test.id);
            const testUnlocked = isTestUnlocked(test.test_number);

            return (
              <TouchableOpacity
                key={test.id}
                style={[styles.testCard, !testUnlocked && styles.testCardLocked]}
                activeOpacity={testUnlocked ? 0.8 : 1}
                onPress={() => {
                  if (testUnlocked) {
                    router.push({ pathname: "/test-taking", params: { testId: test.id, testNumber: test.test_number } });
                  } else {
                    handleShare();
                  }
                }}
              >
                <View style={styles.testCardLeft}>
                  <View style={[styles.testNumBadge, !testUnlocked && styles.testNumBadgeLocked]}>
                    {testUnlocked ? (
                      <Text style={styles.testNumText}>{test.test_number}</Text>
                    ) : (
                      <Text style={styles.lockIcon}>🔒</Text>
                    )}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.testTitle, !testUnlocked && styles.testTitleLocked]}>{test.title}</Text>
                    {testUnlocked ? (
                      <View>
                        <Text style={styles.testMeta}>
                          {test.total_questions} questions · {test.time_limit_minutes} min
                        </Text>
                        {best !== null && (
                          <Text style={styles.testScore}>
                            Best: {best}/{test.total_questions} · {count} attempt{count !== 1 ? "s" : ""}
                          </Text>
                        )}
                      </View>
                    ) : (
                      <Text style={styles.testLocked}>Refer a friend to unlock</Text>
                    )}
                  </View>
                </View>
                <Text style={styles.testArrow}>{testUnlocked ? "→" : ""}</Text>
              </TouchableOpacity>
            );
          })}

          {/* Bottom share card */}
          {!unlocked && (
            <TouchableOpacity activeOpacity={0.85} onPress={handleShare} style={styles.bottomShare}>
              <Text style={styles.bottomShareText}>Share your code to unlock all tests</Text>
              <Text style={styles.bottomShareCode}>{profile?.referral_code || "------"}</Text>
            </TouchableOpacity>
          )}

          <View style={{ height: 50 }} />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  inner: { paddingHorizontal: 20, paddingTop: 64, paddingBottom: 40 },
  backText: { fontSize: 14, color: TEXT.muted, marginBottom: 20 },
  title: { fontSize: 28, fontWeight: "700", color: TEXT.strong, fontFamily: SERIF, fontStyle: "italic", marginBottom: 6 },
  sub: { fontSize: 14, color: TEXT.muted, marginBottom: 24 },

  statsRow: { flexDirection: "row", gap: 10, marginBottom: 20 },
  statBox: { flex: 1, backgroundColor: INK[800], borderRadius: 14, paddingVertical: 16, alignItems: "center", borderWidth: 1, borderColor: INK[700] },
  statNum: { fontSize: 22, fontWeight: "800", color: TEXT.strong },
  statLabel: { fontSize: 10, color: TEXT.faint, letterSpacing: 1.5, marginTop: 4 },

  // Referral card
  referralCard: {
    backgroundColor: INK[800], borderRadius: 16, padding: 24, marginBottom: 20,
    borderWidth: 1, borderColor: CLAY[700] + "50", alignItems: "center",
  },
  referralEmoji: { fontSize: 36, marginBottom: 10 },
  referralTitle: { fontSize: 18, fontWeight: "700", color: TEXT.strong, marginBottom: 8 },
  referralText: { fontSize: 13, color: TEXT.muted, textAlign: "center", lineHeight: 19, marginBottom: 16 },
  codeBox: {
    backgroundColor: INK[750], borderRadius: 12, paddingVertical: 14, paddingHorizontal: 28,
    alignItems: "center", marginBottom: 16, borderWidth: 1, borderColor: INK[700],
  },
  codeLabel: { fontSize: 10, color: TEXT.faint, letterSpacing: 2, marginBottom: 4 },
  codeText: { fontSize: 24, fontWeight: "800", color: TEXT.accent, letterSpacing: 6 },
  shareBtn: { borderRadius: 12, paddingVertical: 16, paddingHorizontal: 32, alignItems: "center" },
  shareBtnText: { color: "#fff", fontSize: 15, fontWeight: "700" },

  // Unlocked banner
  unlockedBanner: {
    backgroundColor: "#93A87720", borderRadius: 12, paddingVertical: 12, paddingHorizontal: 16,
    marginBottom: 20, borderWidth: 1, borderColor: "#93A87740", alignItems: "center",
  },
  unlockedText: { fontSize: 14, fontWeight: "600", color: "#93A877" },

  // Test cards
  testCard: {
    backgroundColor: INK[800], borderRadius: 14, padding: 16, marginBottom: 10,
    borderWidth: 1, borderColor: INK[700],
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
  },
  testCardLocked: { opacity: 0.6 },
  testCardLeft: { flexDirection: "row", alignItems: "center", flex: 1, gap: 14 },
  testNumBadge: {
    width: 44, height: 44, borderRadius: 12, backgroundColor: CLAY[700] + "30",
    alignItems: "center", justifyContent: "center",
  },
  testNumBadgeLocked: { backgroundColor: INK[750] },
  testNumText: { fontSize: 18, fontWeight: "800", color: TEXT.accent },
  lockIcon: { fontSize: 18 },
  testTitle: { fontSize: 15, fontWeight: "600", color: TEXT.primary, marginBottom: 2 },
  testTitleLocked: { color: TEXT.faint },
  testMeta: { fontSize: 12, color: TEXT.muted },
  testScore: { fontSize: 12, color: "#93A877", marginTop: 2 },
  testLocked: { fontSize: 12, color: TEXT.faint, fontStyle: "italic" },
  testArrow: { fontSize: 18, color: TEXT.faint },

  // Bottom share
  bottomShare: {
    backgroundColor: INK[800], borderRadius: 14, padding: 18, marginTop: 10,
    borderWidth: 1, borderColor: CLAY[700] + "40", alignItems: "center",
  },
  bottomShareText: { fontSize: 13, color: TEXT.muted, marginBottom: 6 },
  bottomShareCode: { fontSize: 18, fontWeight: "800", color: TEXT.accent, letterSpacing: 4 },
});