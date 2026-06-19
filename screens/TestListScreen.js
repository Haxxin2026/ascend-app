import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
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

export default function TestListScreen() {
  const router = useRouter();
  const [tests, setTests] = useState([]);
  const [attempts, setAttempts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);

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

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: "center", alignItems: "center" }]}>
        <LinearGradient colors={[INK[900], "#1A1208", "#0A0806"]} style={StyleSheet.absoluteFill} />
        <ActivityIndicator size="large" color={CLAY[600]} />
      </View>
    );
  }

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

          {tests.map((test) => {
            const best = getBestScore(test.id);
            const count = getAttemptCount(test.id);
            return (
              <TouchableOpacity
                key={test.id}
                style={styles.testCard}
                activeOpacity={0.8}
                onPress={() => router.push({ pathname: "/test-taking", params: { testId: test.id, testNumber: test.test_number } })}
              >
                <View style={styles.testCardLeft}>
                  <View style={styles.testNumBadge}>
                    <Text style={styles.testNumText}>{test.test_number}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.testTitle}>{test.title}</Text>
                    <Text style={styles.testMeta}>
                      {test.total_questions} questions · {test.time_limit_minutes} min
                    </Text>
                    {best !== null && (
                      <Text style={styles.testScore}>
                        Best: {best}/{test.total_questions} · {count} attempt{count !== 1 ? "s" : ""}
                      </Text>
                    )}
                  </View>
                </View>
                <Text style={styles.testArrow}>→</Text>
              </TouchableOpacity>
            );
          })}

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

  statsRow: { flexDirection: "row", gap: 10, marginBottom: 24 },
  statBox: { flex: 1, backgroundColor: INK[800], borderRadius: 14, paddingVertical: 16, alignItems: "center", borderWidth: 1, borderColor: INK[700] },
  statNum: { fontSize: 22, fontWeight: "800", color: TEXT.strong },
  statLabel: { fontSize: 10, color: TEXT.faint, letterSpacing: 1.5, marginTop: 4 },

  testCard: {
    backgroundColor: INK[800], borderRadius: 14, padding: 16, marginBottom: 10,
    borderWidth: 1, borderColor: INK[700],
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
  },
  testCardLeft: { flexDirection: "row", alignItems: "center", flex: 1, gap: 14 },
  testNumBadge: {
    width: 44, height: 44, borderRadius: 12, backgroundColor: CLAY[700] + "30",
    alignItems: "center", justifyContent: "center",
  },
  testNumText: { fontSize: 18, fontWeight: "800", color: TEXT.accent },
  testTitle: { fontSize: 15, fontWeight: "600", color: TEXT.primary, marginBottom: 2 },
  testMeta: { fontSize: 12, color: TEXT.muted },
  testScore: { fontSize: 12, color: "#93A877", marginTop: 2 },
  testArrow: { fontSize: 18, color: TEXT.faint },
});
