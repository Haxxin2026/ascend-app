import { supabase } from "../lib/supabase";

import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useAuth } from "../context/AuthContext";

const SUBJECTS = [
  "SAT Reading and Writing",
  "SAT Math",
  "AP Calculus",
  "AP Physics",
  "AP History",
  "AP English",
  "ACT Prep",
  "General Study",
];

const GOALS = [
  { min: 15, label: "15 min", desc: "Quick and focused" },
  { min: 30, label: "30 min", desc: "The sweet spot" },
  { min: 60, label: "60 min", desc: "Serious mode" },
];

import { useRouter } from "expo-router";
export default function SignUpScreen()  {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [selectedSubjects, setSelectedSubjects] = useState([]);
  const [dailyGoal, setDailyGoal] = useState(30);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1);

  const { signUp } = useAuth();

  const router = useRouter();

  function toggleSubject(subject) {
    setSelectedSubjects((prev) =>
      prev.includes(subject)
        ? prev.filter((s) => s !== subject)
        : [...prev, subject]
    );
  }

  async function handleSignUp() {
    if (!email || !password || !username) {
      Alert.alert("Missing info", "Please fill in all fields.");
      return;
    }
    if (password.length < 6) {
      Alert.alert("Weak password", "Password must be at least 6 characters.");
      return;
    }

    setLoading(true);

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) {
      setLoading(false);
      Alert.alert("Signup failed", error.message);
      return;
    }

    if (data.user) {
      await supabase
        .from("users")
        .update({
          username,
          subjects: selectedSubjects,
          daily_goal_min: dailyGoal,
        })
        .eq("id", data.user.id);
    }

    setLoading(false);
    router.replace("/(tabs)");
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.inner}>
        <View style={styles.dots}>
          {[1, 2, 3].map((s) => (
            <View
              key={s}
              style={[styles.dot, step === s && styles.dotActive]}
            />
          ))}
        </View>

        {step === 1 && (
          <View>
            <Text style={styles.title}>What are you studying?</Text>
            <Text style={styles.subtitle}>
              Pick everything that applies. This powers your heatmap.
            </Text>
            <View style={styles.chips}>
              {SUBJECTS.map((subject) => (
                <TouchableOpacity
                  key={subject}
                  style={[
                    styles.chip,
                    selectedSubjects.includes(subject) && styles.chipSelected,
                  ]}
                  onPress={() => toggleSubject(subject)}
                >
                  <Text
                    style={[
                      styles.chipText,
                      selectedSubjects.includes(subject) &&
                        styles.chipTextSelected,
                    ]}
                  >
                    {subject}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity
              style={styles.nextBtn}
              onPress={() => setStep(2)}
            >
              <Text style={styles.nextBtnText}>Next</Text>
            </TouchableOpacity>
          </View>
        )}

        {step === 2 && (
          <View>
            <Text style={styles.title}>Set your daily goal</Text>
            <Text style={styles.subtitle}>
              Consistency beats intensity. Be honest with yourself.
            </Text>
            {GOALS.map((goal) => (
              <TouchableOpacity
                key={goal.min}
                style={[
                  styles.goalBtn,
                  dailyGoal === goal.min && styles.goalBtnSelected,
                ]}
                onPress={() => setDailyGoal(goal.min)}
              >
                <Text style={styles.goalLabel}>{goal.label}</Text>
                <Text style={styles.goalDesc}>{goal.desc}</Text>
              </TouchableOpacity>
            ))}
            <View style={styles.navRow}>
              <TouchableOpacity
                style={styles.backBtn}
                onPress={() => setStep(1)}
              >
                <Text style={styles.backBtnText}>Back</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.nextBtn, { flex: 1 }]}
                onPress={() => setStep(3)}
              >
                <Text style={styles.nextBtnText}>Next</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {step === 3 && (
          <View>
            <Text style={styles.title}>Create your account</Text>
            <Text style={styles.subtitle}>
              Almost there. This saves your progress.
            </Text>
            <TextInput
              style={styles.input}
              placeholder="Username"
              placeholderTextColor="#888"
              value={username}
              onChangeText={setUsername}
              autoCapitalize="none"
            />
            <TextInput
              style={styles.input}
              placeholder="Email"
              placeholderTextColor="#888"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />
            <TextInput
              style={styles.input}
              placeholder="Password (6+ characters)"
              placeholderTextColor="#888"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />
            <View style={styles.navRow}>
              <TouchableOpacity
                style={styles.backBtn}
                onPress={() => setStep(2)}
              >
                <Text style={styles.backBtnText}>Back</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.nextBtn, { flex: 1 }]}
                onPress={handleSignUp}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.nextBtnText}>Create account</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        )}

        <TouchableOpacity
          style={styles.linkBtn}
          onPress={() => router.push("/(auth)/signin")}
        >
          <Text style={styles.linkText}>
            Already have an account? Sign in
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0F0F14" },
  inner: { padding: 24, paddingTop: 60 },
  dots: { flexDirection: "row", gap: 6, justifyContent: "center", marginBottom: 32 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: "#2A2A3A" },
  dotActive: { width: 24, borderRadius: 4, backgroundColor: "#7C3AED" },
  title: { fontSize: 26, fontWeight: "700", color: "#F1F1F3", marginBottom: 8 },
  subtitle: { fontSize: 15, color: "#8888A0", marginBottom: 28, lineHeight: 22 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 32 },
  chip: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, borderWidth: 1, borderColor: "#2A2A3A", backgroundColor: "#1A1A24" },
  chipSelected: { backgroundColor: "#EDE9FE", borderColor: "#7C3AED" },
  chipText: { fontSize: 14, color: "#8888A0" },
  chipTextSelected: { color: "#7C3AED", fontWeight: "600" },
  goalBtn: { padding: 16, borderRadius: 12, borderWidth: 1, borderColor: "#2A2A3A", backgroundColor: "#1A1A24", marginBottom: 10 },
  goalBtnSelected: { borderColor: "#7C3AED", backgroundColor: "#1E1040" },
  goalLabel: { fontSize: 16, fontWeight: "600", color: "#F1F1F3", marginBottom: 2 },
  goalDesc: { fontSize: 13, color: "#8888A0" },
  input: { height: 50, borderRadius: 12, borderWidth: 1, borderColor: "#2A2A3A", backgroundColor: "#1A1A24", paddingHorizontal: 16, fontSize: 15, color: "#F1F1F3", marginBottom: 12 },
  nextBtn: { backgroundColor: "#7C3AED", height: 50, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  nextBtnText: { color: "#fff", fontSize: 16, fontWeight: "600" },
  backBtn: { backgroundColor: "#1A1A24", height: 50, borderRadius: 12, alignItems: "center", justifyContent: "center", paddingHorizontal: 24 },
  backBtnText: { color: "#8888A0", fontSize: 15 },
  navRow: { flexDirection: "row", gap: 10, marginTop: 8 },
  linkBtn: { marginTop: 24, alignItems: "center" },
  linkText: { color: "#7C3AED", fontSize: 14 },
});

