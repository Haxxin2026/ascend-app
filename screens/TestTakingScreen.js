import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
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

const SECTIONS = [
  { key: "rw1", label: "Reading & Writing", module: 1, section: "Reading and Writing", time: 32 * 60 },
  { key: "rw2", label: "Reading & Writing", module: 2, section: "Reading and Writing", time: 32 * 60 },
  { key: "math1", label: "Math", module: 1, section: "Math", time: 35 * 60 },
  { key: "math2", label: "Math", module: 2, section: "Math", time: 35 * 60 },
];

export default function TestTakingScreen() {
  const router = useRouter();
  const { testId, testNumber } = useLocalSearchParams();
  const [user, setUser] = useState(null);
  const [phase, setPhase] = useState("start"); // start, test, review, results
  const [questions, setQuestions] = useState([]);
  const [currentSection, setCurrentSection] = useState(0);
  const [currentQ, setCurrentQ] = useState(0);
  const [answers, setAnswers] = useState({});
  const [timeLeft, setTimeLeft] = useState(0);
  const [attemptId, setAttemptId] = useState(null);
  const [sectionQuestions, setSectionQuestions] = useState([]);
  const [showExplanation, setShowExplanation] = useState(false);
  const timerRef = useRef(null);
  const scrollRef = useRef(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => setUser(user));
    loadQuestions();
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, []);

  async function loadQuestions() {
    const { data } = await supabase
      .from("test_questions")
      .select("*")
      .eq("test_id", testId)
      .order("module", { ascending: true })
      .order("question_number", { ascending: true });
    setQuestions(data || []);
  }

  function getSectionQuestions(sectionIndex) {
    const sec = SECTIONS[sectionIndex];
    return questions.filter((q) => q.section === sec.section && q.module === sec.module);
  }

  async function startTest() {
    if (!user) return;
    const { data } = await supabase
      .from("test_attempts")
      .insert({ user_id: user.id, test_id: testId, total_questions: questions.length })
      .select()
      .single();
    setAttemptId(data?.id);
    startSection(0);
  }

  function startSection(index) {
    setCurrentSection(index);
    setCurrentQ(0);
    setShowExplanation(false);
    const sq = getSectionQuestions(index);
    setSectionQuestions(sq);
    setTimeLeft(SECTIONS[index].time);
    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          handleSectionEnd(index);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }

  function handleSectionEnd(sectionIndex) {
    clearInterval(timerRef.current);
    if (sectionIndex < SECTIONS.length - 1) {
      setPhase("break");
    } else {
      finishTest();
    }
  }

  function nextSection() {
    const next = currentSection + 1;
    setPhase("test");
    startSection(next);
  }

  function selectAnswer(questionId, answer) {
    setAnswers((prev) => ({ ...prev, [questionId]: answer }));
  }

  function nextQuestion() {
    setShowExplanation(false);
    if (currentQ < sectionQuestions.length - 1) {
      setCurrentQ((p) => p + 1);
      scrollRef.current?.scrollTo({ y: 0, animated: true });
    } else {
      handleSectionEnd(currentSection);
    }
  }

  function prevQuestion() {
    if (currentQ > 0) {
      setShowExplanation(false);
      setCurrentQ((p) => p - 1);
      scrollRef.current?.scrollTo({ y: 0, animated: true });
    }
  }

  async function finishTest() {
    clearInterval(timerRef.current);
    // Calculate scores
    let rwCorrect = 0, mathCorrect = 0, totalCorrect = 0;
    const answerInserts = [];

    questions.forEach((q) => {
      const selected = answers[q.id] || null;
      const isCorrect = selected === q.correct_answer;
      if (isCorrect) {
        totalCorrect++;
        if (q.section === "Reading and Writing") rwCorrect++;
        else mathCorrect++;
      }
      answerInserts.push({
        attempt_id: attemptId,
        question_id: q.id,
        selected_answer: selected,
        is_correct: isCorrect,
      });
    });

    // Save answers
    if (attemptId) {
      await supabase.from("test_answers").insert(answerInserts);
      await supabase.from("test_attempts").update({
        completed_at: new Date().toISOString(),
        rw_score: rwCorrect,
        math_score: mathCorrect,
        total_correct: totalCorrect,
      }).eq("id", attemptId);

      // Award XP
      if (user) {
        const xpEarned = totalCorrect * 5;
        const { data: profile } = await supabase.from("users").select("xp, level").eq("id", user.id).single();
        const newXp = (profile?.xp || 0) + xpEarned;
        const newLevel = Math.floor(newXp / 200) + 1;
        await supabase.from("users").update({ xp: newXp, level: newLevel }).eq("id", user.id);
      }
    }

    setPhase("results");
  }

  const formatTime = (s) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  const rwTotal = questions.filter((q) => q.section === "Reading and Writing").length;
  const mathTotal = questions.filter((q) => q.section === "Math").length;

  // ── START SCREEN ──
  if (phase === "start") {
    return (
      <View style={styles.container}>
        <LinearGradient colors={[INK[900], "#1A1208", "#0A0806"]} style={StyleSheet.absoluteFill} />
        <ScrollView showsVerticalScrollIndicator={false}>
          <View style={styles.inner}>
            <TouchableOpacity onPress={() => router.back()}>
              <Text style={styles.backText}>← Back</Text>
            </TouchableOpacity>
            <Text style={styles.title}>Practice Test {testNumber}</Text>
            <Text style={styles.sub}>Full-length SAT simulation. Harder than College Board.</Text>

            <View style={styles.infoCard}>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Total Questions</Text>
                <Text style={styles.infoValue}>{questions.length}</Text>
              </View>
              <View style={styles.infoDivider} />
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Reading & Writing</Text>
                <Text style={styles.infoValue}>{rwTotal} questions · 64 min</Text>
              </View>
              <View style={styles.infoDivider} />
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Math</Text>
                <Text style={styles.infoValue}>{mathTotal} questions · 70 min</Text>
              </View>
              <View style={styles.infoDivider} />
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Total Time</Text>
                <Text style={styles.infoValue}>~134 minutes</Text>
              </View>
            </View>

            <View style={styles.rulesCard}>
              <Text style={styles.rulesTitle}>Before you begin</Text>
              <Text style={styles.rulesText}>• Each section is timed separately</Text>
              <Text style={styles.rulesText}>• You can navigate between questions within a section</Text>
              <Text style={styles.rulesText}>• Unanswered questions count as incorrect</Text>
              <Text style={styles.rulesText}>• Your score and answers are saved automatically</Text>
            </View>

            <TouchableOpacity activeOpacity={0.85} onPress={() => { setPhase("test"); startTest(); }}>
              <LinearGradient colors={[CLAY[600], CLAY[700]]} style={styles.startBtn}>
                <Text style={styles.startBtnText}>Begin Test</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    );
  }

  // ── SECTION BREAK ──
  if (phase === "break") {
    const nextSec = SECTIONS[currentSection + 1];
    return (
      <View style={styles.container}>
        <LinearGradient colors={[INK[900], "#1A1208", "#0A0806"]} style={StyleSheet.absoluteFill} />
        <View style={styles.breakWrap}>
          <Text style={styles.breakEmoji}>☕</Text>
          <Text style={styles.breakTitle}>Section complete</Text>
          <Text style={styles.breakSub}>
            {SECTIONS[currentSection].label} Module {SECTIONS[currentSection].module} finished
          </Text>
          <View style={styles.breakDivider} />
          <Text style={styles.breakNext}>Up next: {nextSec.label} Module {nextSec.module}</Text>
          <Text style={styles.breakMeta}>
            {getSectionQuestions(currentSection + 1).length} questions · {nextSec.time / 60} minutes
          </Text>
          <TouchableOpacity activeOpacity={0.85} onPress={nextSection}>
            <LinearGradient colors={[CLAY[600], CLAY[700]]} style={styles.startBtn}>
              <Text style={styles.startBtnText}>Continue</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // ── RESULTS ──
  if (phase === "results") {
    const rwCorrect = questions.filter((q) => q.section === "Reading and Writing" && answers[q.id] === q.correct_answer).length;
    const mathCorrect = questions.filter((q) => q.section === "Math" && answers[q.id] === q.correct_answer).length;
    const totalCorrect = rwCorrect + mathCorrect;
    const pct = Math.round((totalCorrect / questions.length) * 100);
    const xpEarned = totalCorrect * 5;

    return (
      <View style={styles.container}>
        <LinearGradient colors={[INK[900], "#1A1208", "#0A0806"]} style={StyleSheet.absoluteFill} />
        <ScrollView showsVerticalScrollIndicator={false}>
          <View style={styles.resultsWrap}>
            <Text style={styles.resultsEmoji}>{pct >= 80 ? "🎉" : pct >= 60 ? "💪" : "📚"}</Text>
            <Text style={styles.resultsTitle}>Test Complete</Text>
            <Text style={styles.resultsSub}>Practice Test {testNumber}</Text>

            <View style={styles.scoreRing}>
              <Text style={styles.scoreNum}>{totalCorrect}</Text>
              <Text style={styles.scoreOf}>/ {questions.length}</Text>
              <Text style={styles.scorePct}>{pct}%</Text>
            </View>

            <View style={styles.scoreBreakdown}>
              <View style={styles.scoreRow}>
                <Text style={styles.scoreLabel}>Reading & Writing</Text>
                <Text style={styles.scoreValue}>{rwCorrect} / {rwTotal}</Text>
              </View>
              <View style={styles.scoreDivider} />
              <View style={styles.scoreRow}>
                <Text style={styles.scoreLabel}>Math</Text>
                <Text style={styles.scoreValue}>{mathCorrect} / {mathTotal}</Text>
              </View>
              <View style={styles.scoreDivider} />
              <View style={styles.scoreRow}>
                <Text style={styles.scoreLabel}>XP Earned</Text>
                <Text style={[styles.scoreValue, { color: TEXT.accent }]}>+{xpEarned}</Text>
              </View>
            </View>

            <TouchableOpacity activeOpacity={0.85} onPress={() => { setPhase("review"); setCurrentSection(0); setCurrentQ(0); setSectionQuestions(getSectionQuestions(0)); }}>
              <LinearGradient colors={[CLAY[600], CLAY[700]]} style={styles.startBtn}>
                <Text style={styles.startBtnText}>Review Answers</Text>
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity style={styles.outlineBtn} onPress={() => router.back()}>
              <Text style={styles.outlineBtnText}>Back to tests</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    );
  }

  // ── REVIEW MODE ──
  if (phase === "review") {
    const q = sectionQuestions[currentQ];
    if (!q) return null;
    const selected = answers[q.id];
    const isCorrect = selected === q.correct_answer;
    const options = [
      { letter: "A", text: q.option_a },
      { letter: "B", text: q.option_b },
      { letter: "C", text: q.option_c },
      { letter: "D", text: q.option_d },
    ];

    return (
      <View style={styles.container}>
        <LinearGradient colors={[INK[900], "#1A1208", "#0A0806"]} style={StyleSheet.absoluteFill} />
        <ScrollView ref={scrollRef} showsVerticalScrollIndicator={false}>
          <View style={styles.inner}>
            <TouchableOpacity onPress={() => setPhase("results")}>
              <Text style={styles.backText}>← Back to results</Text>
            </TouchableOpacity>
            <Text style={styles.reviewBadge}>REVIEW MODE</Text>
            <View style={styles.sectionTabs}>
              {SECTIONS.map((sec, i) => (
                <TouchableOpacity key={sec.key} style={[styles.secTab, currentSection === i && styles.secTabActive]} onPress={() => { setCurrentSection(i); setCurrentQ(0); setSectionQuestions(getSectionQuestions(i)); }}>
                  <Text style={[styles.secTabText, currentSection === i && styles.secTabTextActive]}>{sec.label.substring(0, 2)} M{sec.module}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={styles.qCount}>Question {currentQ + 1} of {sectionQuestions.length}</Text>
            <View style={styles.questionCard}>
              <Text style={styles.questionText}>{q.question_text}</Text>
            </View>
            {options.map((opt) => {
              const isSelected = selected === opt.letter;
              const isRight = opt.letter === q.correct_answer;
              let cardStyle = styles.option;
              let textColor = TEXT.primary;
              if (isRight) { cardStyle = styles.optionCorrect; textColor = "#93A877"; }
              else if (isSelected && !isRight) { cardStyle = styles.optionWrong; textColor = "#A6402E"; }
              return (
                <View key={opt.letter} style={cardStyle}>
                  <Text style={[styles.optionLetter, { color: textColor }]}>{opt.letter}</Text>
                  <Text style={[styles.optionText, { color: textColor }]}>{opt.text}</Text>
                </View>
              );
            })}
            <View style={styles.explanationCard}>
              <Text style={styles.explanationTitle}>{isCorrect ? "✓ You answered correctly" : `✗ Correct answer: ${q.correct_answer}`}</Text>
              <Text style={styles.explanationText}>{q.explanation}</Text>
            </View>
            <View style={styles.navRow}>
              <TouchableOpacity style={styles.navBtn} onPress={prevQuestion} disabled={currentQ === 0}>
                <Text style={[styles.navBtnText, currentQ === 0 && { color: TEXT.faint }]}>← Previous</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.navBtn} onPress={() => {
                if (currentQ < sectionQuestions.length - 1) { nextQuestion(); }
                else if (currentSection < SECTIONS.length - 1) { const next = currentSection + 1; setCurrentSection(next); setCurrentQ(0); setSectionQuestions(getSectionQuestions(next)); scrollRef.current?.scrollTo({ y: 0, animated: true }); }
                else { setPhase("results"); }
              }}>
                <Text style={styles.navBtnText}>Next →</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </View>
    );
  }

  // ── TEST MODE ──
  const q = sectionQuestions[currentQ];
  if (!q) return null;
  const sec = SECTIONS[currentSection];
  const selected = answers[q.id];
  const options = [
    { letter: "A", text: q.option_a },
    { letter: "B", text: q.option_b },
    { letter: "C", text: q.option_c },
    { letter: "D", text: q.option_d },
  ];
  const answeredInSection = sectionQuestions.filter((sq) => answers[sq.id]).length;
  const timeWarning = timeLeft < 300;

  return (
    <View style={styles.container}>
      <LinearGradient colors={[INK[900], "#1A1208", "#0A0806"]} style={StyleSheet.absoluteFill} />

      {/* Timer bar */}
      <View style={styles.timerBar}>
        <View style={styles.timerLeft}>
          <Text style={styles.timerSection}>{sec.label} M{sec.module}</Text>
          <Text style={styles.timerProgress}>{answeredInSection}/{sectionQuestions.length}</Text>
        </View>
        <View style={[styles.timerRight, timeWarning && styles.timerWarning]}>
          <Text style={[styles.timerText, timeWarning && styles.timerTextWarning]}>{formatTime(timeLeft)}</Text>
        </View>
      </View>

      <ScrollView ref={scrollRef} showsVerticalScrollIndicator={false} delaysContentTouches={false}>
        <View style={styles.testInner}>
          <View style={styles.qHeader}>
            <Text style={styles.qCount}>Question {currentQ + 1} of {sectionQuestions.length}</Text>
            <View style={styles.topicBadge}>
              <Text style={styles.topicBadgeText}>{q.topic}</Text>
            </View>
          </View>

          <View style={styles.questionCard}>
            <Text style={styles.questionText}>{q.question_text}</Text>
          </View>

          {options.map((opt) => (
            <TouchableOpacity
              key={opt.letter}
              style={selected === opt.letter ? styles.optionSelected : styles.option}
              onPress={() => selectAnswer(q.id, opt.letter)}
              activeOpacity={0.7}
            >
              <Text style={[styles.optionLetter, selected === opt.letter && { color: TEXT.accent }]}>{opt.letter}</Text>
              <Text style={[styles.optionText, selected === opt.letter && { color: TEXT.accent }]}>{opt.text}</Text>
            </TouchableOpacity>
          ))}

          <View style={styles.navRow}>
            <TouchableOpacity style={styles.navBtn} onPress={prevQuestion} disabled={currentQ === 0}>
              <Text style={[styles.navBtnText, currentQ === 0 && { color: TEXT.faint }]}>← Previous</Text>
            </TouchableOpacity>
            {currentQ === sectionQuestions.length - 1 ? (
              <TouchableOpacity activeOpacity={0.85} onPress={() => handleSectionEnd(currentSection)}>
                <LinearGradient colors={[CLAY[600], CLAY[700]]} style={styles.finishBtn}>
                  <Text style={styles.finishBtnText}>
                    {currentSection < SECTIONS.length - 1 ? "Finish Section" : "Submit Test"}
                  </Text>
                </LinearGradient>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity style={styles.navBtn} onPress={nextQuestion}>
                <Text style={styles.navBtnText}>Next →</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Question dots */}
          <View style={styles.dotRow}>
            {sectionQuestions.map((sq, i) => (
              <TouchableOpacity
                key={i}
                style={[styles.dot, answers[sq.id] && styles.dotAnswered, i === currentQ && styles.dotCurrent]}
                onPress={() => { setCurrentQ(i); setShowExplanation(false); scrollRef.current?.scrollTo({ y: 0, animated: true }); }}
              />
            ))}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  inner: { paddingHorizontal: 20, paddingTop: 64, paddingBottom: 40 },
  testInner: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 40 },
  backText: { fontSize: 14, color: TEXT.muted, marginBottom: 20 },
  title: { fontSize: 28, fontWeight: "700", color: TEXT.strong, fontFamily: SERIF, fontStyle: "italic", marginBottom: 6 },
  sub: { fontSize: 14, color: TEXT.muted, marginBottom: 24 },

  // Info card
  infoCard: { backgroundColor: INK[800], borderRadius: 14, padding: 18, marginBottom: 16, borderWidth: 1, borderColor: INK[700] },
  infoRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 10 },
  infoLabel: { fontSize: 14, color: TEXT.muted },
  infoValue: { fontSize: 14, fontWeight: "600", color: TEXT.primary },
  infoDivider: { height: 1, backgroundColor: INK[700] },

  // Rules
  rulesCard: { backgroundColor: INK[800], borderRadius: 14, padding: 18, marginBottom: 24, borderWidth: 1, borderColor: INK[700] },
  rulesTitle: { fontSize: 14, fontWeight: "600", color: TEXT.primary, marginBottom: 10 },
  rulesText: { fontSize: 13, color: TEXT.muted, marginBottom: 4, lineHeight: 20 },

  // Start button
  startBtn: { borderRadius: 14, paddingVertical: 18, alignItems: "center", marginBottom: 10 },
  startBtnText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  outlineBtn: { borderRadius: 14, paddingVertical: 16, alignItems: "center", borderWidth: 1, borderColor: INK[700] },
  outlineBtnText: { color: TEXT.secondary, fontSize: 15, fontWeight: "600" },

  // Timer bar
  timerBar: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    paddingHorizontal: 20, paddingTop: 60, paddingBottom: 12,
    backgroundColor: INK[800], borderBottomWidth: 1, borderBottomColor: INK[700],
  },
  timerLeft: {},
  timerSection: { fontSize: 13, fontWeight: "600", color: TEXT.primary },
  timerProgress: { fontSize: 11, color: TEXT.faint, marginTop: 2 },
  timerRight: { backgroundColor: INK[750], paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10 },
  timerWarning: { backgroundColor: "#A6402E30" },
  timerText: { fontSize: 16, fontWeight: "700", color: TEXT.primary, fontVariant: ["tabular-nums"] },
  timerTextWarning: { color: "#A6402E" },

  // Questions
  qHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10, marginTop: 8 },
  qCount: { fontSize: 13, color: TEXT.muted },
  topicBadge: { backgroundColor: CLAY[700] + "30", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  topicBadgeText: { fontSize: 11, color: TEXT.accent, fontWeight: "600" },
  questionCard: { backgroundColor: INK[800], borderRadius: 14, padding: 20, marginBottom: 14, borderWidth: 1, borderColor: INK[700] },
  questionText: { fontSize: 15, color: TEXT.primary, lineHeight: 23 },

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
  optionLetter: { fontSize: 14, fontWeight: "700", width: 22, color: TEXT.primary },
  optionText: { fontSize: 14, flex: 1, lineHeight: 20, color: TEXT.primary },

  // Navigation
  navRow: { flexDirection: "row", justifyContent: "space-between", marginTop: 16 },
  navBtn: { backgroundColor: INK[800], borderRadius: 12, paddingVertical: 14, paddingHorizontal: 20, borderWidth: 1, borderColor: INK[700] },
  navBtnText: { fontSize: 14, fontWeight: "600", color: TEXT.secondary },
  finishBtn: { borderRadius: 12, paddingVertical: 14, paddingHorizontal: 24 },
  finishBtnText: { color: "#fff", fontSize: 14, fontWeight: "700" },

  // Question dots
  dotRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 20, justifyContent: "center" },
  dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: INK[750] },
  dotAnswered: { backgroundColor: CLAY[600] },
  dotCurrent: { borderWidth: 2, borderColor: TEXT.strong },

  // Explanation
  explanationCard: { backgroundColor: INK[800], borderRadius: 14, padding: 16, marginTop: 4, marginBottom: 8, borderWidth: 1, borderColor: INK[700] },
  explanationTitle: { fontSize: 14, fontWeight: "600", color: TEXT.primary, marginBottom: 8 },
  explanationText: { fontSize: 13, color: TEXT.muted, lineHeight: 20 },

  // Break
  breakWrap: { flex: 1, justifyContent: "center", alignItems: "center", padding: 24 },
  breakEmoji: { fontSize: 56, marginBottom: 16 },
  breakTitle: { fontSize: 26, fontWeight: "700", color: TEXT.strong, fontFamily: SERIF, fontStyle: "italic" },
  breakSub: { fontSize: 14, color: TEXT.muted, marginTop: 4, marginBottom: 24 },
  breakDivider: { width: 40, height: 1, backgroundColor: INK[700], marginBottom: 24 },
  breakNext: { fontSize: 16, fontWeight: "600", color: TEXT.primary, marginBottom: 4 },
  breakMeta: { fontSize: 13, color: TEXT.faint, marginBottom: 32 },

  // Results
  resultsWrap: { alignItems: "center", paddingHorizontal: 24, paddingTop: 80, paddingBottom: 40 },
  resultsEmoji: { fontSize: 56, marginBottom: 14 },
  resultsTitle: { fontSize: 28, fontWeight: "700", color: TEXT.strong, fontFamily: SERIF, fontStyle: "italic" },
  resultsSub: { fontSize: 14, color: TEXT.muted, marginTop: 4, marginBottom: 28 },
  scoreRing: {
    width: 130, height: 130, borderRadius: 65, backgroundColor: INK[800],
    borderWidth: 3, borderColor: CLAY[600], alignItems: "center", justifyContent: "center", marginBottom: 24,
  },
  scoreNum: { fontSize: 32, fontWeight: "800", color: TEXT.strong },
  scoreOf: { fontSize: 14, color: TEXT.muted },
  scorePct: { fontSize: 14, fontWeight: "700", color: TEXT.accent, marginTop: 2 },
  scoreBreakdown: {
    backgroundColor: INK[800], borderRadius: 14, padding: 18, width: "100%",
    marginBottom: 24, borderWidth: 1, borderColor: INK[700],
  },
  scoreRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 12 },
  scoreLabel: { fontSize: 14, color: TEXT.muted },
  scoreValue: { fontSize: 14, fontWeight: "700", color: TEXT.primary },
  scoreDivider: { height: 1, backgroundColor: INK[700] },

  // Review
  reviewBadge: { fontSize: 11, fontWeight: "700", color: TEXT.accent, letterSpacing: 2, marginBottom: 12 },
  sectionTabs: { flexDirection: "row", gap: 6, marginBottom: 16 },
  secTab: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, backgroundColor: INK[800], borderWidth: 1, borderColor: INK[700] },
  secTabActive: { backgroundColor: CLAY[700], borderColor: CLAY[600] },
  secTabText: { fontSize: 11, fontWeight: "600", color: TEXT.faint },
  secTabTextActive: { color: TEXT.strong },
});
