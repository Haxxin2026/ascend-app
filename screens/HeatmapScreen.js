import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from "react-native";
import { supabase } from "../lib/supabase";

const TOPICS = {
  "SAT Math": [
    "Algebra",
    "Geometry",
    "Statistics",
    "Trigonometry",
    "Word Problems",
    "Number Properties",
  ],
  "SAT Reading": [
    "Main Idea",
    "Inference",
    "Vocabulary",
    "Evidence-Based",
    "Tone & Purpose",
    "Paired Passages",
  ],
  "SAT Writing": [
    "Grammar",
    "Punctuation",
    "Sentence Structure",
    "Transitions",
    "Conciseness",
    "Verb Tense",
  ],
  "AP Calculus": [
    "Limits",
    "Derivatives",
    "Integrals",
    "Chain Rule",
    "Applications",
    "Series",
  ],
  "AP Physics": [
    "Kinematics",
    "Forces",
    "Energy",
    "Waves",
    "Electricity",
    "Momentum",
  ],
  "General Study": [
    "Focus",
    "Note Taking",
    "Time Management",
    "Memorization",
    "Test Strategy",
    "Review",
  ],
};

function getColor(score) {
  if (score >= 75) return "#22C55E";
  if (score >= 50) return "#EAB308";
  if (score >= 25) return "#F97316";
  return "#EF4444";
}

function getLabel(score) {
  if (score >= 75) return "Strong";
  if (score >= 50) return "Medium";
  if (score >= 25) return "Weak";
  return "Critical";
}

export default function HeatmapScreen() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [weaknesses, setWeaknesses] = useState([]);
  const [selectedSubject, setSelectedSubject] = useState(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
      if (user) loadData(user.id);
    });
  }, []);

  async function loadData(userId) {
    const { data: profileData } = await supabase
      .from("users")
      .select("*")
      .eq("id", userId)
      .single();
    setProfile(profileData);

    const { data: weaknessData } = await supabase
      .from("weakness_areas")
      .select("*")
      .eq("user_id", userId);
    setWeaknesses(weaknessData || []);

    if (profileData?.subjects?.length > 0 && !selectedSubject) {
      setSelectedSubject(profileData.subjects[0]);
    }
  }

  function getTopicScore(subject, topic) {
    const found = weaknesses.find(
      (w) => w.subject === subject && w.topic === topic
    );
    return found ? found.score : null;
  }

  async function rateTopic(subject, topic, score) {
    if (!user) return;

    const existing = weaknesses.find(
      (w) => w.subject === subject && w.topic === topic
    );

    let confidence = "medium";
    if (score >= 75) confidence = "high";
    else if (score < 40) confidence = "low";

    if (existing) {
      await supabase
        .from("weakness_areas")
        .update({ score, confidence, updated_at: new Date().toISOString() })
        .eq("id", existing.id);
    } else {
      await supabase.from("weakness_areas").insert({
        user_id: user.id,
        subject,
        topic,
        score,
        confidence,
      });
    }

    loadData(user.id);
  }

  const subjects = profile?.subjects || [];
  const currentTopics = TOPICS[selectedSubject] || [];

  const subjectScores = {};
  subjects.forEach((sub) => {
    const topics = TOPICS[sub] || [];
    const rated = topics
      .map((t) => getTopicScore(sub, t))
      .filter((s) => s !== null);
    if (rated.length > 0) {
      subjectScores[sub] = Math.round(
        rated.reduce((a, b) => a + b, 0) / rated.length
      );
    }
  });

  return (
    <ScrollView style={styles.container}>
      <View style={styles.inner}>
        <TouchableOpacity
          style={styles.backLink}
          onPress={() => router.back()}
        >
          <Text style={styles.backLinkText}>← Back</Text>
        </TouchableOpacity>

        <Text style={styles.title}>Weakness heatmap</Text>
        <Text style={styles.subtitle}>
          Rate your confidence in each topic. Be honest — this helps you focus.
        </Text>

        <View style={styles.subjectTabs}>
          {subjects.map((sub) => (
            <TouchableOpacity
              key={sub}
              style={[
                styles.subjectTab,
                selectedSubject === sub && styles.subjectTabActive,
              ]}
              onPress={() => setSelectedSubject(sub)}
            >
              <Text
                style={[
                  styles.subjectTabText,
                  selectedSubject === sub && styles.subjectTabTextActive,
                ]}
              >
                {sub}
              </Text>
              {subjectScores[sub] !== undefined && (
                <View
                  style={[
                    styles.scoreDot,
                    { backgroundColor: getColor(subjectScores[sub]) },
                  ]}
                />
              )}
            </TouchableOpacity>
          ))}
        </View>

        {selectedSubject && subjectScores[selectedSubject] !== undefined && (
          <View style={styles.overviewCard}>
            <Text style={styles.overviewLabel}>
              {selectedSubject} overall
            </Text>
            <View style={styles.overviewRow}>
              <View
                style={[
                  styles.overviewBar,
                  {
                    width: `${subjectScores[selectedSubject]}%`,
                    backgroundColor: getColor(subjectScores[selectedSubject]),
                  },
                ]}
              />
            </View>
            <Text
              style={[
                styles.overviewScore,
                { color: getColor(subjectScores[selectedSubject]) },
              ]}
            >
              {subjectScores[selectedSubject]}% —{" "}
              {getLabel(subjectScores[selectedSubject])}
            </Text>
          </View>
        )}

        {currentTopics.map((topic) => {
          const score = getTopicScore(selectedSubject, topic);
          return (
            <View key={topic} style={styles.topicCard}>
              <View style={styles.topicHeader}>
                <Text style={styles.topicName}>{topic}</Text>
                {score !== null && (
                  <Text style={[styles.topicScore, { color: getColor(score) }]}>
                    {score}% · {getLabel(score)}
                  </Text>
                )}
              </View>

              {score !== null && (
                <View style={styles.topicBarBg}>
                  <View
                    style={[
                      styles.topicBarFill,
                      {
                        width: `${score}%`,
                        backgroundColor: getColor(score),
                      },
                    ]}
                  />
                </View>
              )}

              <View style={styles.ratingRow}>
                <TouchableOpacity
                  style={[styles.ratingBtn, styles.ratingCritical]}
                  onPress={() => rateTopic(selectedSubject, topic, 15)}
                >
                  <Text style={styles.ratingBtnText}>😵</Text>
                  <Text style={styles.ratingLabel}>Lost</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.ratingBtn, styles.ratingWeak]}
                  onPress={() => rateTopic(selectedSubject, topic, 35)}
                >
                  <Text style={styles.ratingBtnText}>😬</Text>
                  <Text style={styles.ratingLabel}>Shaky</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.ratingBtn, styles.ratingMedium]}
                  onPress={() => rateTopic(selectedSubject, topic, 60)}
                >
                  <Text style={styles.ratingBtnText}>🤔</Text>
                  <Text style={styles.ratingLabel}>Okay</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.ratingBtn, styles.ratingStrong]}
                  onPress={() => rateTopic(selectedSubject, topic, 85)}
                >
                  <Text style={styles.ratingBtnText}>💪</Text>
                  <Text style={styles.ratingLabel}>Solid</Text>
                </TouchableOpacity>
              </View>
            </View>
          );
        })}
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
  subjectTabs: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 20 },
  subjectTab: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#1A1A24",
    borderWidth: 1,
    borderColor: "#2A2A3A",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  subjectTabActive: { backgroundColor: "#EDE9FE", borderColor: "#7C3AED" },
  subjectTabText: { fontSize: 13, color: "#8888A0" },
  subjectTabTextActive: { color: "#7C3AED", fontWeight: "600" },
  scoreDot: { width: 8, height: 8, borderRadius: 4 },
  overviewCard: {
    backgroundColor: "#1A1A24",
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#2A2A3A",
  },
  overviewLabel: { fontSize: 14, color: "#8888A0", marginBottom: 10 },
  overviewRow: {
    height: 8,
    backgroundColor: "#2A2A3A",
    borderRadius: 4,
    overflow: "hidden",
  },
  overviewBar: { height: 8, borderRadius: 4 },
  overviewScore: { fontSize: 14, fontWeight: "600", marginTop: 8 },
  topicCard: {
    backgroundColor: "#1A1A24",
    borderRadius: 14,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#2A2A3A",
  },
  topicHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  topicName: { fontSize: 15, fontWeight: "600", color: "#F1F1F3" },
  topicScore: { fontSize: 13, fontWeight: "500" },
  topicBarBg: {
    height: 6,
    backgroundColor: "#2A2A3A",
    borderRadius: 3,
    overflow: "hidden",
    marginBottom: 12,
  },
  topicBarFill: { height: 6, borderRadius: 3 },
  ratingRow: { flexDirection: "row", gap: 8 },
  ratingBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: "center",
    borderWidth: 1,
  },
  ratingCritical: { backgroundColor: "#1C1012", borderColor: "#EF4444" },
  ratingWeak: { backgroundColor: "#1C1508", borderColor: "#F97316" },
  ratingMedium: { backgroundColor: "#1A1806", borderColor: "#EAB308" },
  ratingStrong: { backgroundColor: "#0A1A0E", borderColor: "#22C55E" },
  ratingBtnText: { fontSize: 20, marginBottom: 2 },
  ratingLabel: { fontSize: 11, color: "#8888A0" },
});

