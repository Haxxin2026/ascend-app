import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { supabase } from "../lib/supabase";

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
    const { data } = await supabase
      .from("users")
      .select("subjects")
      .eq("id", userId)
      .single();
    setSubjects(data?.subjects || []);
  }

async function loadTopics(subject) {
    setSelectedSubject(subject);
    const { data } = await supabase
      .from("questions")
      .select("topic")
      .eq("subject", subject);

    if (data) {
      const unique = [...new Set(data.map((q) => q.topic))];
      setAvailableTopics(unique);
    }
  }

   async function startPractice(difficulty) {
    let query = supabase
      .from("questions")
      .select("*")
      .eq("subject", selectedSubject)
      .eq("topic", selectedTopic);

    if (difficulty !== "All") {
      query = query.eq("difficulty", difficulty);
    }

    const { data } = await query.order("created_at", { ascending: false });

    if (!data || data.length === 0) {
      Alert.alert("No questions", "No questions available for this difficulty yet.");
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
        user_id: user.id,
        question_id: question.id,
        selected_answer: answer,
        is_correct: isCorrect,
      });

      if (isCorrect) {
        const { data: profile } = await supabase
          .from("users")
          .select("xp, level")
          .eq("id", user.id)
          .single();
        const newXp = (profile?.xp || 0) + 10;
        const newLevel = Math.floor(newXp / 200) + 1;
        await supabase
          .from("users")
          .update({ xp: newXp, level: newLevel })
          .eq("id", user.id);
      }
    }
  }

  function nextQuestion() {
    if (currentIndex + 1 >= questions.length) {
      setFinished(true);
    } else {
      setCurrentIndex((prev) => prev + 1);
      setSelectedAnswer(null);
      setShowResult(false);
    }
  }

  function getOptionStyle(option) {
    if (!showResult) {
      return selectedAnswer === option ? styles.optionSelected : styles.option;
    }
    const question = questions[currentIndex];
    if (option === question.correct_answer) return styles.optionCorrect;
    if (option === selectedAnswer && option !== question.correct_answer)
      return styles.optionWrong;
    return styles.option;
  }

  function getOptionTextStyle(option) {
    if (!showResult) {
      return selectedAnswer === option
        ? styles.optionTextSelected
        : styles.optionText;
    }
    const question = questions[currentIndex];
    if (option === question.correct_answer) return styles.optionTextCorrect;
    if (option === selectedAnswer && option !== question.correct_answer)
      return styles.optionTextWrong;
    return styles.optionText;
  }

  if (!selectedSubject) {
    return (
      <ScrollView style={styles.container}>
        <View style={styles.inner}>
          <TouchableOpacity
            style={styles.backLink}
            onPress={() => router.back()}
          >
            <Text style={styles.backLinkText}>← Back</Text>
          </TouchableOpacity>

          <Text style={styles.title}>Practice questions</Text>
          <Text style={styles.subtitle}>
            Pick a subject to start practicing
          </Text>

          {subjects.map((sub) => (
            <TouchableOpacity
              key={sub}
              style={styles.subjectCard}
              onPress={() => loadTopics(sub)}
            >
              <Text style={styles.subjectCardText}>{sub}</Text>
              <Text style={styles.subjectArrow}>→</Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    );
  }

  if (!selectedTopic) {
    return (
      <ScrollView style={styles.container}>
        <View style={styles.inner}>
          <TouchableOpacity
            style={styles.backLink}
            onPress={() => {
              setSelectedSubject(null);
              setAvailableTopics([]);
            }}
          >
            <Text style={styles.backLinkText}>← Back</Text>
          </TouchableOpacity>

          <Text style={styles.title}>{selectedSubject}</Text>
          <Text style={styles.subtitle}>
            Pick a topic or practice everything
          </Text>

          <TouchableOpacity
            style={styles.allTopicsCard}
            onPress={() => setSelectedTopic("All Topics")}
          >
            <Text style={styles.allTopicsText}>All Topics (mixed)</Text>
            <Text style={styles.subjectArrow}>→</Text>
          </TouchableOpacity>

          {availableTopics.map((topic) => (
            <TouchableOpacity
              key={topic}
              style={styles.subjectCard}
              onPress={() => setSelectedTopic(topic)}
            >
              <Text style={styles.subjectCardText}>{topic}</Text>
              <Text style={styles.subjectArrow}>→</Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    );
  }

  if (!selectedDifficulty) {
    return (
      <ScrollView style={styles.container}>
        <View style={styles.inner}>
          <TouchableOpacity
            style={styles.backLink}
            onPress={() => setSelectedTopic(null)}
          >
            <Text style={styles.backLinkText}>← Back</Text>
          </TouchableOpacity>

          <Text style={styles.title}>{selectedTopic}</Text>
          <Text style={styles.subtitle}>
            Pick a difficulty level
          </Text>

          <TouchableOpacity
            style={styles.allTopicsCard}
            onPress={() => startPractice("All")}
          >
            <Text style={styles.allTopicsText}>All Difficulties (mixed)</Text>
            <Text style={[styles.subjectArrow, { color: "#fff" }]}>→</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.difficultyCard, styles.diffEasy]}
            onPress={() => startPractice("easy")}
          >
            <View>
              <Text style={styles.diffLabel}>Easy</Text>
              <Text style={styles.diffDesc}>Build your foundation</Text>
            </View>
            <Text style={styles.subjectArrow}>→</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.difficultyCard, styles.diffMedium]}
            onPress={() => startPractice("medium")}
          >
            <View>
              <Text style={styles.diffLabel}>Medium</Text>
              <Text style={styles.diffDesc}>Challenge yourself</Text>
            </View>
            <Text style={styles.subjectArrow}>→</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.difficultyCard, styles.diffHard]}
            onPress={() => startPractice("hard")}
          >
            <View>
              <Text style={styles.diffLabel}>Hard</Text>
              <Text style={styles.diffDesc}>Test your mastery</Text>
            </View>
            <Text style={styles.subjectArrow}>→</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    );
  }


  if (finished) {
    const percentage = Math.round((score / questions.length) * 100);
    return (
      <View style={styles.container}>
        <View style={styles.finishedCard}>
          <Text style={styles.finishedEmoji}>
            {percentage >= 80 ? "🎉" : percentage >= 50 ? "💪" : "📚"}
          </Text>
          <Text style={styles.finishedTitle}>Practice complete!</Text>
          <Text style={styles.finishedSubject}>{selectedSubject}</Text>

          <View style={styles.scoreCircle}>
            <Text style={styles.scoreNumber}>{score}/{questions.length}</Text>
            <Text style={styles.scorePercent}>{percentage}%</Text>
          </View>

          <Text style={styles.scoreMessage}>
            {percentage >= 80
              ? "Excellent! You're crushing it."
              : percentage >= 50
              ? "Good effort. Keep practicing!"
              : "Keep going. Review the explanations."}
          </Text>

          <TouchableOpacity
            style={styles.retryBtn}
            onPress={() => startPractice(selectedSubject)}
          >
            <Text style={styles.retryBtnText}>Try again</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.doneBtn}
            onPress={() => {
              setSelectedSubject(null);
              setSelectedTopic(null);
              setSelectedDifficulty(null);
              setAvailableTopics([]);
              setQuestions([]);
            }}
          >
            <Text style={styles.doneBtnText}>Pick another subject</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => router.back()}
          >
            <Text style={styles.backBtnText}>Back to dashboard</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const question = questions[currentIndex];
  const options = [
    { letter: "A", text: question.option_a },
    { letter: "B", text: question.option_b },
    { letter: "C", text: question.option_c },
    { letter: "D", text: question.option_d },
  ];

  return (
    <ScrollView style={styles.container}>
      <View style={styles.inner}>
        <TouchableOpacity
          style={styles.backLink}
          onPress={() => {
            setSelectedDifficulty(null);
            setQuestions([]);
            setCurrentIndex(0);
            setSelectedAnswer(null);
            setShowResult(false);
          }}
        >
          <Text style={styles.backLinkText}>← Back to topics</Text>
        </TouchableOpacity>
        <View style={styles.progressHeader}>
          <Text style={styles.progressLabel}>
            Question {currentIndex + 1} of {questions.length}
          </Text>
          <Text style={styles.topicBadge}>{question.topic}</Text>
        </View>

        <View style={styles.progressBarBg}>
          <View
            style={[
              styles.progressBarFill,
              {
                width: `${((currentIndex + 1) / questions.length) * 100}%`,
              },
            ]}
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
            <Text style={styles.optionLetter}>{opt.letter}</Text>
            <Text style={getOptionTextStyle(opt.letter)}>{opt.text}</Text>
          </TouchableOpacity>
        ))}

        {showResult && (
          <View style={styles.explanationCard}>
            <Text style={styles.explanationTitle}>
              {selectedAnswer === question.correct_answer
                ? "✅ Correct! +10 XP"
                : "❌ Incorrect"}
            </Text>
            <Text style={styles.explanationText}>{question.explanation}</Text>
          </View>
        )}

        {showResult && (
          <TouchableOpacity style={styles.nextBtn} onPress={nextQuestion}>
            <Text style={styles.nextBtnText}>
              {currentIndex + 1 >= questions.length
                ? "See results"
                : "Next question"}
            </Text>
          </TouchableOpacity>
        )}
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
  subtitle: { fontSize: 15, color: "#8888A0", marginBottom: 24 },
  subjectCard: {
    backgroundColor: "#1A1A24",
    borderRadius: 14,
    padding: 18,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#2A2A3A",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  subjectCardText: { fontSize: 16, fontWeight: "600", color: "#F1F1F3" },
  subjectArrow: { fontSize: 18, color: "#7C3AED" },
  progressHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  progressLabel: { fontSize: 14, color: "#8888A0" },
  topicBadge: {
    fontSize: 12,
    color: "#7C3AED",
    backgroundColor: "#1E1040",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  progressBarBg: {
    height: 6,
    backgroundColor: "#2A2A3A",
    borderRadius: 3,
    overflow: "hidden",
    marginBottom: 24,
  },
  progressBarFill: { height: 6, backgroundColor: "#7C3AED", borderRadius: 3 },
  questionCard: {
    backgroundColor: "#1A1A24",
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#2A2A3A",
  },
  questionText: { fontSize: 17, color: "#F1F1F3", lineHeight: 26 },
  option: {
    backgroundColor: "#1A1A24",
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#2A2A3A",
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  optionSelected: {
    backgroundColor: "#1E1040",
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#7C3AED",
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  optionCorrect: {
    backgroundColor: "#0A1A0E",
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#22C55E",
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  optionWrong: {
    backgroundColor: "#1C1012",
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#EF4444",
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  optionLetter: {
    fontSize: 15,
    fontWeight: "700",
    color: "#8888A0",
    width: 24,
  },
  optionText: { fontSize: 15, color: "#F1F1F3", flex: 1 },
  optionTextSelected: { fontSize: 15, color: "#7C3AED", flex: 1 },
  optionTextCorrect: { fontSize: 15, color: "#22C55E", flex: 1 },
  optionTextWrong: { fontSize: 15, color: "#EF4444", flex: 1 },
  explanationCard: {
    backgroundColor: "#1A1A24",
    borderRadius: 14,
    padding: 16,
    marginTop: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#2A2A3A",
  },
  explanationTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: "#F1F1F3",
    marginBottom: 8,
  },
  explanationText: { fontSize: 14, color: "#8888A0", lineHeight: 22 },
  nextBtn: {
    backgroundColor: "#7C3AED",
    height: 54,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
  },
  nextBtnText: { color: "#fff", fontSize: 16, fontWeight: "600" },
  finishedCard: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
    paddingTop: 80,
  },
  finishedEmoji: { fontSize: 64, marginBottom: 16 },
  finishedTitle: { fontSize: 28, fontWeight: "700", color: "#F1F1F3", marginBottom: 8 },
  finishedSubject: { fontSize: 16, color: "#8888A0", marginBottom: 32 },
  scoreCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "#1A1A24",
    borderWidth: 3,
    borderColor: "#7C3AED",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  scoreNumber: { fontSize: 28, fontWeight: "700", color: "#F1F1F3" },
  scorePercent: { fontSize: 14, color: "#7C3AED" },
  scoreMessage: { fontSize: 16, color: "#8888A0", marginBottom: 32, textAlign: "center" },
  retryBtn: {
    backgroundColor: "#7C3AED",
    height: 50,
    borderRadius: 14,
    paddingHorizontal: 40,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
    width: "100%",
  },
  retryBtnText: { color: "#fff", fontSize: 16, fontWeight: "600" },
  doneBtn: {
    backgroundColor: "#1A1A24",
    height: 50,
    borderRadius: 14,
    paddingHorizontal: 40,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#7C3AED",
    width: "100%",
  },
  doneBtnText: { color: "#7C3AED", fontSize: 16, fontWeight: "600" },
  backBtn: {
    height: 50,
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
  },
  backBtnText: { color: "#8888A0", fontSize: 14 },


allTopicsCard: {
    backgroundColor: "#7C3AED",
    borderRadius: 14,
    padding: 18,
    marginBottom: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  allTopicsText: { fontSize: 16, fontWeight: "600", color: "#fff" },

  difficultyCard: {
    borderRadius: 14,
    padding: 18,
    marginBottom: 10,
    borderWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  diffEasy: {
    backgroundColor: "#0A1A0E",
    borderColor: "#22C55E",
  },
  diffMedium: {
    backgroundColor: "#1A1806",
    borderColor: "#EAB308",
  },
  diffHard: {
    backgroundColor: "#1C1012",
    borderColor: "#EF4444",
  },
  diffLabel: { fontSize: 16, fontWeight: "600", color: "#F1F1F3", marginBottom: 2 },
  diffDesc: { fontSize: 13, color: "#8888A0" },

});

