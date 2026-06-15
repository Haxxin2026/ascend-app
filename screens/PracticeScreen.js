import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
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
const TEXT = {
  strong: "#FCF8F1", primary: "#F0E8DA", secondary: "#CABBA6",
  muted: "#968A76", faint: "#5F5645", accent: "#C8643C",
};
const SERIF = Platform.OS === "ios" ? "Georgia" : "serif";

export default function PracticeScreen() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [showResult, setShowResult] = useState(false);
  const [score, setScore] = useState(0);
  const [finished, setFinished] = useState(false);
  const [selectedSubject, setSelectedSubject] = useState(null);
  const [subjects, setSubjects] = useState([]);
  const [availableTopics, setAvailableTopics] = useState([]);
  const [selectedTopic, setSelectedTopic] = useState(null);
  const [selectedDifficulty, setSelectedDifficulty] = useState(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
      if (user) loadSubjects(user.id);
    });
  }, []);

  async function loadSubjects(userId) {
    const { data } = await supabase.from("users").select("subjects").eq("id", userId).single();
    setSubjects(data?.subjects || []);
  }

  async function loadTopics(subject) {
    setSelectedSubject(subject);
    const { data } = await supabase.from("questions").select("topic").eq("subject", subject);
    if (data) {
      const unique = [...new Set(data.map((q) => q.topic))];
      setAvailableTopics(unique);
    }
  }

  async function startPractice(difficulty) {
    let query = supabase.from("questions").select("*").eq("subject", selectedSubject);
    if (selectedTopic !== "All Topics") query = query.eq("topic", selectedTopic);
    if (difficulty !== "All") query = query.eq("difficulty", difficulty);
    const { data } = await query.order("created_at", { ascending: false });
    if (!data || data.length === 0) {
      Alert.alert("No questions", "No questions available for this selection yet.");
      return;
    }
    const shuffled = data.sort(() => Math.random() - 0.5).slice(0, 10);
    setQuestions(shuffled);
    setCurrentIndex(0);
    setScore(0);
    setFinished(false);
    setSelectedAnswer(null);
    setShowResult(false);
    setSelectedDifficulty(difficulty);
  }

  async function submitAnswer(answer) {
    setSelectedAnswer(answer);
    setShowResult(true);
    const question = questions[currentIndex];
    const isCorrect = answer === question.correct_answer;
    if (isCorrect) setScore((prev) => prev + 1);
    if (user) {
      await supabase.from("student_answers").insert({
        user_id: user.id, question_id: question.id,
        selected_answer: answer, is_correct: isCorrect,
      });
      if (isCorrect) {
        const { data: profile } = await supabase.from("users").select("xp, level").eq("id", user.id).single();
        const newXp = (profile?.xp || 0) + 10;
        const newLevel = Math.floor(newXp / 200) + 1;
        await supabase.from("users").update({ xp: newXp, level: newLevel }).eq("id", user.id);
      }
    }
  }

  function nextQuestion() {
    if (currentIndex + 1 >= questions.length) { setFinished(true); }
    else { setCurrentIndex((p) => p + 1); setSelectedAnswer(null); setShowResult(false); }
  }

  function getOptionStyle(option) {
    if (!showResult) return selectedAnswer === option ? styles.optionSelected : styles.option;
    const q = questions[currentIndex];
    if (option === q.correct_answer) return styles.optionCorrect;
    if (option === selectedAnswer && option !== q.correct_answer) return styles.optionWrong;
    return styles.option;
  }

  function getOptionTextColor(option) {
    if (!showResult) return selectedAnswer === option ? TEXT.accent : TEXT.primary;
    const q = questions[currentIndex];
    if (option === q.correct_answer) return "#93A877";
    if (option === selectedAnswer && option !== q.correct_answer) return "#A6402E";
    return TEXT.primary;
  }

  // ── Subject selection ──
  if (!selectedSubject) {
    return (
      <View style={styles.container}>
        <LinearGradient colors={[INK[900], "#1A1208", "#0A0806"]} style={StyleSheet.absoluteFill} />
        <ScrollView showsVerticalScrollIndicator={false}>
          <View style={styles.inner}>
            <Text style={styles.screenTitle}>Practice</Text>
            <Text style={styles.screenSub}>Pick a subject to start</Text>
            {subjects.map((sub) => (
              <TouchableOpacity key={sub} style={styles.listCard} onPress={() => loadTopics(sub)}>
                <Text style={styles.listCardText}>{sub}</Text>
                <Text style={styles.listArrow}>→</Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      </View>
    );
  }

  // ── Topic selection ──
  if (!selectedTopic) {
    return (
      <View style={styles.container}>
        <LinearGradient colors={[INK[900], "#1A1208", "#0A0806"]} style={StyleSheet.absoluteFill} />
        <ScrollView showsVerticalScrollIndicator={false}>
          <View style={styles.inner}>
            <TouchableOpacity onPress={() => { setSelectedSubject(null); setAvailableTopics([]); }}>
              <Text style={styles.backText}>← Back</Text>
            </TouchableOpacity>
            <Text style={styles.screenTitle}>{selectedSubject}</Text>
            <Text style={styles.screenSub}>Pick a topic or practice everything</Text>
            <TouchableOpacity style={styles.primaryListCard} onPress={() => setSelectedTopic("All Topics")}>
              <LinearGradient colors={[CLAY[600], CLAY[700]]} style={styles.primaryListInner}>
                <Text style={styles.primaryListText}>All Topics (mixed)</Text>
                <Text style={styles.primaryListArrow}>→</Text>
              </LinearGradient>
            </TouchableOpacity>
            {availableTopics.map((topic) => (
              <TouchableOpacity key={topic} style={styles.listCard} onPress={() => setSelectedTopic(topic)}>
                <Text style={styles.listCardText}>{topic}</Text>
                <Text style={styles.listArrow}>→</Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      </View>
    );
  }

  // ── Difficulty selection ──
  if (!selectedDifficulty) {
    return (
      <View style={styles.container}>
        <LinearGradient colors={[INK[900], "#1A1208", "#0A0806"]} style={StyleSheet.absoluteFill} />
        <ScrollView showsVerticalScrollIndicator={false}>
          <View style={styles.inner}>
            <TouchableOpacity onPress={() => setSelectedTopic(null)}>
              <Text style={styles.backText}>← Back</Text>
            </TouchableOpacity>
            <Text style={styles.screenTitle}>{selectedTopic}</Text>
            <Text style={styles.screenSub}>Pick a difficulty level</Text>
            <TouchableOpacity style={styles.primaryListCard} onPress={() => startPractice("All")}>
              <LinearGradient colors={[CLAY[600], CLAY[700]]} style={styles.primaryListInner}>
                <Text style={styles.primaryListText}>All Difficulties</Text>
                <Text style={styles.primaryListArrow}>→</Text>
              </LinearGradient>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.diffCard, { borderColor: "#93A877" }]} onPress={() => startPractice("easy")}>
              <View>
                <Text style={[styles.diffLabel, { color: "#93A877" }]}>Easy</Text>
                <Text style={styles.diffDesc}>Build your foundation</Text>
              </View>
              <Text style={styles.listArrow}>→</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.diffCard, { borderColor: "#D7A24E" }]} onPress={() => startPractice("medium")}>
              <View>
                <Text style={[styles.diffLabel, { color: "#D7A24E" }]}>Medium</Text>
                <Text style={styles.diffDesc}>Challenge yourself</Text>
              </View>
              <Text style={styles.listArrow}>→</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.diffCard, { borderColor: "#A6402E" }]} onPress={() => startPractice("hard")}>
              <View>
                <Text style={[styles.diffLabel, { color: "#A6402E" }]}>Hard</Text>
                <Text style={styles.diffDesc}>Test your mastery</Text>
              </View>
              <Text style={styles.listArrow}>→</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    );
  }

  // ── Finished ──
  if (finished) {
    const pct = Math.round((score / questions.length) * 100);
    return (
      <View style={styles.container}>
        <LinearGradient colors={[INK[900], "#1A1208", "#0A0806"]} style={StyleSheet.absoluteFill} />
        <View style={styles.finishedWrap}>
          <Text style={styles.finishedEmoji}>{pct >= 80 ? "🎉" : pct >= 50 ? "💪" : "📚"}</Text>
          <Text style={styles.finishedTitle}>Practice complete</Text>
          <Text style={styles.finishedSub}>{selectedSubject} · {selectedTopic}</Text>
          <View style={styles.scoreRing}>
            <Text style={styles.scoreNum}>{score}/{questions.length}</Text>
            <Text style={styles.scorePct}>{pct}%</Text>
          </View>
          <Text style={styles.scoreMsg}>
            {pct >= 80 ? "Excellent. You're crushing it." : pct >= 50 ? "Good effort. Keep practicing." : "Keep going. Review the explanations."}
          </Text>
          <TouchableOpacity onPress={() => { setSelectedDifficulty(null); setQuestions([]); }}>
            <LinearGradient colors={[CLAY[600], CLAY[700]]} style={styles.finBtn}>
              <Text style={styles.finBtnText}>Try again</Text>
            </LinearGradient>
          </TouchableOpacity>
          <TouchableOpacity style={styles.finBtnOutline} onPress={() => {
            setSelectedSubject(null); setSelectedTopic(null); setSelectedDifficulty(null); setAvailableTopics([]); setQuestions([]);
          }}>
            <Text style={styles.finBtnOutlineText}>Pick another subject</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // ── Questions ──
  const question = questions[currentIndex];
  const options = [
    { letter: "A", text: question.option_a },
    { letter: "B", text: question.option_b },
    { letter: "C", text: question.option_c },
    { letter: "D", text: question.option_d },
  ];

  return (
    <View style={styles.container}>
      <LinearGradient colors={[INK[900], "#1A1208", "#0A0806"]} style={StyleSheet.absoluteFill} />
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.inner}>
          <TouchableOpacity onPress={() => { setSelectedDifficulty(null); setQuestions([]); setCurrentIndex(0); setSelectedAnswer(null); setShowResult(false); }}>
            <Text style={styles.backText}>← Exit practice</Text>
          </TouchableOpacity>

          <View style={styles.qHeader}>
            <Text style={styles.qCount}>Question {currentIndex + 1} of {questions.length}</Text>
            <View style={styles.topicBadge}>
              <Text style={styles.topicBadgeText}>{question.topic}</Text>
            </View>
          </View>

          <View style={styles.progressTrack}>
            <LinearGradient
              colors={[CLAY[600], CLAY[400]]}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
              style={[styles.progressFill, { width: `${((currentIndex + 1) / questions.length) * 100}%` }]}
            />
          </View>

          <View style={styles.questionCard}>
            <Text style={styles.questionText}>{question.question_text}</Text>
          </View>

          {options.map((opt) => (
            <TouchableOpacity
              key={opt.letter}
              style={getOptionStyle(opt.letter)}
              onPress={() => !showResult && submitAnswer(opt.letter)}
              disabled={showResult}
            >
              <Text style={[styles.optionLetter, { color: getOptionTextColor(opt.letter) }]}>{opt.letter}</Text>
              <Text style={[styles.optionText, { color: getOptionTextColor(opt.letter) }]}>{opt.text}</Text>
            </TouchableOpacity>
          ))}

          {showResult && (
            <View style={styles.explanationCard}>
              <Text style={styles.explanationTitle}>
                {selectedAnswer === question.correct_answer ? "✓  Correct · +10 XP" : "✗  Incorrect"}
              </Text>
              <Text style={styles.explanationText}>{question.explanation}</Text>
            </View>
          )}

          {showResult && (
            <TouchableOpacity onPress={nextQuestion}>
              <LinearGradient colors={[CLAY[600], CLAY[700]]} style={styles.nextBtn}>
                <Text style={styles.nextBtnText}>
                  {currentIndex + 1 >= questions.length ? "See results" : "Next question"}
                </Text>
              </LinearGradient>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  inner: { paddingHorizontal: 20, paddingTop: 64, paddingBottom: 40 },

  screenTitle: { fontSize: 28, fontWeight: "700", color: TEXT.strong, fontFamily: SERIF, fontStyle: "italic", marginBottom: 6 },
  screenSub: { fontSize: 14, color: TEXT.muted, marginBottom: 24 },
  backText: { fontSize: 14, color: TEXT.muted, marginBottom: 20 },

  listCard: {
    backgroundColor: INK[800], borderRadius: 14, padding: 18, marginBottom: 8,
    borderWidth: 1, borderColor: INK[700],
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
  },
  listCardText: { fontSize: 15, fontWeight: "600", color: TEXT.primary },
  listArrow: { fontSize: 16, color: TEXT.faint },

  primaryListCard: { marginBottom: 8 },
  primaryListInner: { borderRadius: 14, padding: 18, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  primaryListText: { fontSize: 15, fontWeight: "700", color: "#fff" },
  primaryListArrow: { fontSize: 16, color: "rgba(255,255,255,0.5)" },

  diffCard: {
    backgroundColor: INK[800], borderRadius: 14, padding: 18, marginBottom: 8,
    borderWidth: 1, flexDirection: "row", justifyContent: "space-between", alignItems: "center",
  },
  diffLabel: { fontSize: 16, fontWeight: "700", marginBottom: 2 },
  diffDesc: { fontSize: 12, color: TEXT.muted },

  qHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 },
  qCount: { fontSize: 13, color: TEXT.muted },
  topicBadge: { backgroundColor: CLAY[700] + "30", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  topicBadgeText: { fontSize: 11, color: TEXT.accent, fontWeight: "600" },

  progressTrack: { height: 4, backgroundColor: INK[750], borderRadius: 2, overflow: "hidden", marginBottom: 20 },
  progressFill: { height: 4, borderRadius: 2 },

  questionCard: { backgroundColor: INK[800], borderRadius: 14, padding: 20, marginBottom: 14, borderWidth: 1, borderColor: INK[700] },
  questionText: { fontSize: 16, color: TEXT.primary, lineHeight: 24 },

  option: {
    backgroundColor: INK[800], borderRadius: 12, padding: 16, marginBottom: 8,
    borderWidth: 1, borderColor: INK[700], flexDirection: "row", alignItems: "center", gap: 12,
  },
  optionSelected: {
    backgroundColor: CLAY[700] + "15", borderRadius: 12, padding: 16, marginBottom: 8,
    borderWidth: 1, borderColor: CLAY[600], flexDirection: "row", alignItems: "center", gap: 12,
  },
  optionCorrect: {
    backgroundColor: "#93A87715", borderRadius: 12, padding: 16, marginBottom: 8,
    borderWidth: 1, borderColor: "#93A877", flexDirection: "row", alignItems: "center", gap: 12,
  },
  optionWrong: {
    backgroundColor: "#A6402E15", borderRadius: 12, padding: 16, marginBottom: 8,
    borderWidth: 1, borderColor: "#A6402E", flexDirection: "row", alignItems: "center", gap: 12,
  },
  optionLetter: { fontSize: 14, fontWeight: "700", width: 22 },
  optionText: { fontSize: 14, flex: 1, lineHeight: 20 },

  explanationCard: {
    backgroundColor: INK[800], borderRadius: 14, padding: 16, marginTop: 4, marginBottom: 8,
    borderWidth: 1, borderColor: INK[700],
  },
  explanationTitle: { fontSize: 14, fontWeight: "600", color: TEXT.primary, marginBottom: 8 },
  explanationText: { fontSize: 13, color: TEXT.muted, lineHeight: 20 },

  nextBtn: { borderRadius: 14, paddingVertical: 18, alignItems: "center", marginTop: 4 },
  nextBtnText: { color: "#fff", fontSize: 16, fontWeight: "700" },

  finishedWrap: { flex: 1, justifyContent: "center", alignItems: "center", padding: 24, paddingTop: 100 },
  finishedEmoji: { fontSize: 56, marginBottom: 14 },
  finishedTitle: { fontSize: 28, fontWeight: "700", color: TEXT.strong, fontFamily: SERIF, fontStyle: "italic" },
  finishedSub: { fontSize: 14, color: TEXT.muted, marginTop: 4, marginBottom: 28 },
  scoreRing: {
    width: 110, height: 110, borderRadius: 55, backgroundColor: INK[800],
    borderWidth: 3, borderColor: CLAY[600], alignItems: "center", justifyContent: "center", marginBottom: 14,
  },
  scoreNum: { fontSize: 26, fontWeight: "800", color: TEXT.strong },
  scorePct: { fontSize: 13, color: TEXT.accent },
  scoreMsg: { fontSize: 15, color: TEXT.muted, marginBottom: 28, textAlign: "center" },
  finBtn: { borderRadius: 14, paddingVertical: 16, paddingHorizontal: 40, alignItems: "center", width: 260, marginBottom: 10 },
  finBtnText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  finBtnOutline: {
    borderRadius: 14, paddingVertical: 16, paddingHorizontal: 40,
    alignItems: "center", width: 260, borderWidth: 1, borderColor: INK[700],
  },
  finBtnOutlineText: { color: TEXT.secondary, fontSize: 15, fontWeight: "600" },
});
