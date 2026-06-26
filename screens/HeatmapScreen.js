import { LinearGradient } from "expo-linear-gradient";
import { useEffect, useState } from "react";
import {
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { supabase } from "../lib/supabase";

const INK = { 900: "#14100B", 800: "#1F1A13", 750: "#2A2218", 700: "#382E20" };
const CLAY = { 600: "#C8643C", 700: "#A8492A" };
const TEXT = { strong: "#FCF8F1", primary: "#F0E8DA", secondary: "#CABBA6", muted: "#968A76", faint: "#5F5645", accent: "#C8643C" };
const MASTERY = { critical: "#A6402E", weak: "#CC6B3F", medium: "#D7A24E", strong: "#93A877" };
const SERIF = Platform.OS === "ios" ? "Georgia" : "serif";

const TOPICS = {
  "SAT Reading and Writing": ["Central Ideas and Details", "Inferences", "Command of Evidence", "Words in Context", "Text Structure and Purpose", "Rhetorical Synthesis", "Transitions", "Boundaries", "Form, Structure, and Sense"],
  "SAT Math": ["Linear equations in one variable", "Linear functions", "Linear equations in two variables", "Systems of two linear equations in two variables", "Nonlinear functions", "Nonlinear Equations & Systems", "Equivalent Expressions", "Ratios, rates, proportional relationships, and units", "Percentages", "One-variable data: Distributions and measures of center and spread", "Two-variable data: Models and scatterplots", "Probability and conditional probability", "Area and Volume", "Right Triangles and Trigonometry", "Lines, Angles, and Triangles", "Circles"],
};

export default function HeatmapScreen() {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [selectedSubject, setSelectedSubject] = useState(null);
  const [areas, setAreas] = useState([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user: u } }) => {
      if (!u) return;
      setUser(u);
      supabase.from("users").select("*").eq("id", u.id).single().then(({ data }) => {
        setProfile(data);
        const firstSub = data?.subjects?.[0] || null;
        if (firstSub) {
          setSelectedSubject(firstSub);
          loadAreas(u.id, firstSub);
        }
        setLoaded(true);
      });
    });
  }, []);

  async function loadAreas(userId, subject) {
    const { data } = await supabase.from("weakness_areas").select("*").eq("user_id", userId).eq("subject", subject);
    setAreas(data || []);
  }

  async function rateTop(topic, score, confidence) {
    if (!user || !selectedSubject) return;
    const existing = areas.find((a) => a.topic === topic);
    if (existing) {
      await supabase.from("weakness_areas").update({ score, confidence, updated_at: new Date().toISOString() }).eq("id", existing.id);
    } else {
      await supabase.from("weakness_areas").insert({ user_id: user.id, subject: selectedSubject, topic, score, confidence });
    }
    loadAreas(user.id, selectedSubject);
  }

  function selectSubject(sub) {
    setSelectedSubject(sub);
    if (user) loadAreas(user.id, sub);
  }

  function getScoreColor(score) {
    if (score >= 75) return MASTERY.strong;
    if (score >= 50) return MASTERY.medium;
    if (score >= 25) return MASTERY.weak;
    return MASTERY.critical;
  }

  function getConfidence(topic) {
    const a = areas.find((x) => x.topic === topic);
    return a?.confidence || null;
  }

  function getScore(topic) {
    const a = areas.find((x) => x.topic === topic);
    return a?.score || 0;
  }

  const overallScore = areas.length > 0 ? Math.round(areas.reduce((s, a) => s + a.score, 0) / areas.length) : 0;
  const topics = TOPICS[selectedSubject] || [];
  const hasTopics = topics.length > 0;
  const ratings = [
    { emoji: "😰", label: "Lost", score: 15, conf: "lost" },
    { emoji: "😟", label: "Shaky", score: 35, conf: "shaky" },
    { emoji: "🙂", label: "Okay", score: 60, conf: "okay" },
    { emoji: "💪", label: "Solid", score: 85, conf: "solid" },
  ];

  return (
    <View style={styles.container}>
      <LinearGradient colors={[INK[900], "#1A1208", "#0A0806"]} style={StyleSheet.absoluteFill} />
      <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" delaysContentTouches={false}>
        <View style={styles.inner}>
          <Text style={styles.title}>Weakness heatmap</Text>
          <Text style={styles.sub}>Rate your confidence in each topic. Be honest — this is where your study time should go.</Text>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabScroll}>
            <View style={styles.tabRow}>
              {(profile?.subjects || []).map((sub) => (
                <TouchableOpacity
                  key={sub}
                  style={[styles.tab, selectedSubject === sub && styles.tabActive]}
                  onPress={() => selectSubject(sub)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.tabText, selectedSubject === sub && styles.tabTextActive]}>{sub}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>

          {!hasTopics && selectedSubject && (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyEmoji}>🚧</Text>
              <Text style={styles.emptyTitle}>Coming soon</Text>
              <Text style={styles.emptyText}>Heatmap topics for {selectedSubject} are not available yet. Check back soon!</Text>
            </View>
          )}

          {hasTopics && areas.length > 0 && (
            <View style={styles.overallCard}>
              <View style={styles.overallHeader}>
                <Text style={styles.overallLabel}>{selectedSubject} overall</Text>
                <Text style={[styles.overallScore, { color: getScoreColor(overallScore) }]}>{overallScore}%</Text>
              </View>
              <View style={styles.progressTrack}>
                <View style={[styles.progressFill, { width: `${Math.max(overallScore, 2)}%`, backgroundColor: getScoreColor(overallScore) }]} />
              </View>
            </View>
          )}

          {topics.map((topic) => {
            const conf = getConfidence(topic);
            const score = getScore(topic);
            return (
              <View key={topic} style={styles.topicCard}>
                <View style={styles.topicHeader}>
                  <Text style={styles.topicName} numberOfLines={2}>{topic}</Text>
                  {conf && <Text style={[styles.topicScore, { color: getScoreColor(score) }]}>{score}% · {conf}</Text>}
                </View>
                <View style={styles.ratingRow}>
                  {ratings.map((r) => (
                    <TouchableOpacity
                      key={r.conf}
                      style={[styles.ratingBtn, conf === r.conf && styles.ratingBtnActive]}
                      onPress={() => rateTop(topic, r.score, r.conf)}
                      activeOpacity={0.6}
                    >
                      <Text style={styles.ratingEmoji}>{r.emoji}</Text>
                      <Text style={[styles.ratingLabel, conf === r.conf && styles.ratingLabelActive]}>{r.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            );
          })}

          <View style={{ height: 40 }} />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  inner: { paddingHorizontal: 20, paddingTop: 64, paddingBottom: 40 },
  title: { fontSize: 28, fontWeight: "700", color: TEXT.strong, fontFamily: SERIF, fontStyle: "italic", marginBottom: 6 },
  sub: { fontSize: 14, color: TEXT.muted, marginBottom: 20, lineHeight: 20 },

  tabScroll: { marginBottom: 20 },
  tabRow: { flexDirection: "row", gap: 8 },
  tab: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, backgroundColor: INK[800], borderWidth: 1, borderColor: INK[700] },
  tabActive: { backgroundColor: CLAY[700], borderColor: CLAY[600] },
  tabText: { fontSize: 13, fontWeight: "600", color: TEXT.muted },
  tabTextActive: { color: TEXT.strong },

  emptyCard: { backgroundColor: INK[800], borderRadius: 14, padding: 32, marginBottom: 16, borderWidth: 1, borderColor: INK[700], alignItems: "center" },
  emptyEmoji: { fontSize: 40, marginBottom: 12 },
  emptyTitle: { fontSize: 18, fontWeight: "700", color: TEXT.primary, marginBottom: 8 },
  emptyText: { fontSize: 13, color: TEXT.muted, textAlign: "center", lineHeight: 19 },

  overallCard: { backgroundColor: INK[800], borderRadius: 14, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: INK[700] },
  overallHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 },
  overallLabel: { fontSize: 14, fontWeight: "600", color: TEXT.primary },
  overallScore: { fontSize: 18, fontWeight: "800" },
  progressTrack: { height: 6, backgroundColor: INK[750], borderRadius: 3, overflow: "hidden" },
  progressFill: { height: 6, borderRadius: 3 },

  topicCard: { backgroundColor: INK[800], borderRadius: 14, padding: 16, marginBottom: 10, borderWidth: 1, borderColor: INK[700] },
  topicHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 14 },
  topicName: { fontSize: 14, fontWeight: "600", color: TEXT.primary, flex: 1, marginRight: 8 },
  topicScore: { fontSize: 13, fontWeight: "600" },
  ratingRow: { flexDirection: "row", gap: 8 },
  ratingBtn: { flex: 1, alignItems: "center", paddingVertical: 10, borderRadius: 10, backgroundColor: INK[750] },
  ratingBtnActive: { backgroundColor: CLAY[700] + "40", borderWidth: 1, borderColor: CLAY[600] },
  ratingEmoji: { fontSize: 22, marginBottom: 4 },
  ratingLabel: { fontSize: 10, color: TEXT.faint, fontWeight: "500" },
  ratingLabelActive: { color: TEXT.accent },
});