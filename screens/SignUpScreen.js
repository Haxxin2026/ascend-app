import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { supabase } from "../lib/supabase";

const INK = { 900: "#14100B", 800: "#1F1A13", 750: "#2A2218", 700: "#382E20" };
const CLAY = { 600: "#C8643C", 700: "#A8492A" };
const TEXT = { strong: "#FCF8F1", primary: "#F0E8DA", secondary: "#CABBA6", muted: "#968A76", faint: "#5F5645", accent: "#C8643C" };
const SERIF = Platform.OS === "ios" ? "Georgia" : "serif";

const SUBJECTS = [
  "SAT Reading and Writing", "SAT Math", "AP Calculus", "AP Physics",
  "AP History", "AP English", "ACT Prep", "General Study",
];
const GOALS = [15, 30, 45, 60, 90];

export default function SignUpScreen() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [selectedSubjects, setSelectedSubjects] = useState([]);
  const [dailyGoal, setDailyGoal] = useState(30);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(false);

  function toggleSubject(sub) {
    setSelectedSubjects((prev) =>
      prev.includes(sub) ? prev.filter((s) => s !== sub) : [...prev, sub]
    );
  }

  async function handleSignUp() {
    if (!email || !password || !username) { Alert.alert("Error", "Please fill in all fields."); return; }
    setLoading(true);
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) { setLoading(false); Alert.alert("Error", error.message); return; }
    if (data.user) {
      await supabase.from("users").update({
        username, subjects: selectedSubjects, daily_goal_min: dailyGoal,
      }).eq("id", data.user.id);
    }
    setLoading(false);
    router.replace("/(tabs)");
  }

  return (
    <View style={styles.container}>
      <LinearGradient colors={[INK[900], "#1A1208", "#0A0806"]} style={StyleSheet.absoluteFill} />
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
        <ScrollView showsVerticalScrollIndicator={false}>
          <View style={styles.inner}>
            <Text style={styles.brand}>Ascend</Text>
            <Text style={styles.stepText}>Step {step} of 3</Text>

            {/* Step 1: Subjects */}
            {step === 1 && (
              <View>
                <Text style={styles.stepTitle}>What are you studying?</Text>
                <Text style={styles.stepSub}>Pick all that apply.</Text>
                <View style={styles.chipGrid}>
                  {SUBJECTS.map((sub) => (
                    <TouchableOpacity
                      key={sub}
                      style={[styles.chip, selectedSubjects.includes(sub) && styles.chipActive]}
                      onPress={() => toggleSubject(sub)}
                    >
                      <Text style={[styles.chipText, selectedSubjects.includes(sub) && styles.chipTextActive]}>{sub}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <TouchableOpacity
                  onPress={() => { if (selectedSubjects.length > 0) setStep(2); else Alert.alert("Pick at least one subject"); }}
                  activeOpacity={0.85}
                >
                  <LinearGradient colors={[CLAY[600], CLAY[700]]} style={styles.btn}>
                    <Text style={styles.btnText}>Continue</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            )}

            {/* Step 2: Daily Goal */}
            {step === 2 && (
              <View>
                <Text style={styles.stepTitle}>Set your daily goal</Text>
                <Text style={styles.stepSub}>How many minutes per day do you want to study?</Text>
                {GOALS.map((g) => (
                  <TouchableOpacity
                    key={g}
                    style={[styles.goalRow, dailyGoal === g && styles.goalRowActive]}
                    onPress={() => setDailyGoal(g)}
                  >
                    <Text style={[styles.goalText, dailyGoal === g && styles.goalTextActive]}>{g} minutes</Text>
                    {dailyGoal === g && <Text style={styles.goalCheck}>✓</Text>}
                  </TouchableOpacity>
                ))}
                <View style={styles.btnRow}>
                  <TouchableOpacity style={styles.backBtn} onPress={() => setStep(1)}>
                    <Text style={styles.backBtnText}>Back</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => setStep(3)} style={{ flex: 1 }} activeOpacity={0.85}>
                    <LinearGradient colors={[CLAY[600], CLAY[700]]} style={styles.btn}>
                      <Text style={styles.btnText}>Continue</Text>
                    </LinearGradient>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* Step 3: Account */}
            {step === 3 && (
              <View>
                <Text style={styles.stepTitle}>Create your account</Text>
                <Text style={styles.stepSub}>Almost there. Enter your details below.</Text>
                <TextInput style={styles.input} placeholder="Username" placeholderTextColor={TEXT.faint} value={username} onChangeText={setUsername} />
                <TextInput style={styles.input} placeholder="Email" placeholderTextColor={TEXT.faint} value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
                <TextInput style={styles.input} placeholder="Password" placeholderTextColor={TEXT.faint} value={password} onChangeText={setPassword} secureTextEntry />
                <View style={styles.btnRow}>
                  <TouchableOpacity style={styles.backBtn} onPress={() => setStep(2)}>
                    <Text style={styles.backBtnText}>Back</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={handleSignUp} disabled={loading} style={{ flex: 1 }} activeOpacity={0.85}>
                    <LinearGradient colors={[CLAY[600], CLAY[700]]} style={styles.btn}>
                      <Text style={styles.btnText}>{loading ? "Creating..." : "Create account"}</Text>
                    </LinearGradient>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            <TouchableOpacity onPress={() => router.push("/(auth)/signin")} style={styles.linkWrap}>
              <Text style={styles.linkText}>Already have an account? <Text style={styles.linkAccent}>Sign in</Text></Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  inner: { paddingHorizontal: 24, paddingTop: 80, paddingBottom: 40 },
  brand: { fontSize: 36, fontWeight: "700", color: TEXT.strong, fontFamily: SERIF, fontStyle: "italic", textAlign: "center", marginBottom: 8 },
  stepText: { fontSize: 13, color: TEXT.accent, textAlign: "center", marginBottom: 32, letterSpacing: 1, textTransform: "uppercase" },

  stepTitle: { fontSize: 24, fontWeight: "700", color: TEXT.strong, marginBottom: 6 },
  stepSub: { fontSize: 14, color: TEXT.muted, marginBottom: 24 },

  chipGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 24 },
  chip: { paddingHorizontal: 16, paddingVertical: 12, borderRadius: 12, backgroundColor: INK[800], borderWidth: 1, borderColor: INK[700] },
  chipActive: { backgroundColor: CLAY[700], borderColor: CLAY[600] },
  chipText: { fontSize: 14, color: TEXT.muted, fontWeight: "500" },
  chipTextActive: { color: TEXT.strong },

  goalRow: {
    backgroundColor: INK[800], borderRadius: 12, paddingVertical: 16, paddingHorizontal: 18,
    marginBottom: 8, borderWidth: 1, borderColor: INK[700],
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
  },
  goalRowActive: { borderColor: CLAY[600], backgroundColor: CLAY[700] + "20" },
  goalText: { fontSize: 15, color: TEXT.primary, fontWeight: "500" },
  goalTextActive: { color: TEXT.accent },
  goalCheck: { fontSize: 16, color: TEXT.accent, fontWeight: "700" },

  input: {
    backgroundColor: INK[800], borderRadius: 12, paddingHorizontal: 16, paddingVertical: 16,
    fontSize: 15, color: TEXT.primary, marginBottom: 12, borderWidth: 1, borderColor: INK[700],
  },

  btn: { borderRadius: 12, paddingVertical: 18, alignItems: "center" },
  btnText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  btnRow: { flexDirection: "row", gap: 10, marginTop: 8 },
  backBtn: {
    borderRadius: 12, paddingVertical: 18, paddingHorizontal: 20,
    backgroundColor: INK[800], borderWidth: 1, borderColor: INK[700],
  },
  backBtnText: { color: TEXT.secondary, fontSize: 15, fontWeight: "600" },

  linkWrap: { alignItems: "center", marginTop: 24 },
  linkText: { fontSize: 14, color: TEXT.muted },
  linkAccent: { color: TEXT.accent, fontWeight: "600" },
});
