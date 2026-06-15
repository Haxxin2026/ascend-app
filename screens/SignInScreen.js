import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { supabase } from "../lib/supabase";

const INK = { 900: "#14100B", 800: "#1F1A13", 700: "#382E20" };
const CLAY = { 600: "#C8643C", 700: "#A8492A" };
const TEXT = { strong: "#FCF8F1", primary: "#F0E8DA", muted: "#968A76", faint: "#5F5645", accent: "#C8643C" };
const SERIF = Platform.OS === "ios" ? "Georgia" : "serif";

export default function SignInScreen() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSignIn() {
    if (!email || !password) { Alert.alert("Error", "Please fill in all fields."); return; }
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) { Alert.alert("Error", error.message); return; }
    router.replace("/(tabs)");
  }

  return (
    <View style={styles.container}>
      <LinearGradient colors={[INK[900], "#1A1208", "#0A0806"]} style={StyleSheet.absoluteFill} />
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.inner}>
        <View style={styles.topSection}>
          <Text style={styles.brand}>Ascend</Text>
          <Text style={styles.tagline}>Aim higher.</Text>
        </View>

        <View style={styles.formSection}>
          <Text style={styles.formTitle}>Sign in</Text>
          <TextInput
            style={styles.input}
            placeholder="Email"
            placeholderTextColor={TEXT.faint}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />
          <TextInput
            style={styles.input}
            placeholder="Password"
            placeholderTextColor={TEXT.faint}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />
          <TouchableOpacity onPress={handleSignIn} disabled={loading} activeOpacity={0.85}>
            <LinearGradient colors={[CLAY[600], CLAY[700]]} style={styles.btn}>
              <Text style={styles.btnText}>{loading ? "Signing in..." : "Sign in"}</Text>
            </LinearGradient>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => router.push("/(auth)/signup")} style={styles.linkWrap}>
            <Text style={styles.linkText}>Don't have an account? <Text style={styles.linkAccent}>Sign up</Text></Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  inner: { flex: 1, paddingHorizontal: 24, justifyContent: "center" },
  topSection: { alignItems: "center", marginBottom: 48 },
  brand: { fontSize: 42, fontWeight: "700", color: TEXT.strong, fontFamily: SERIF, fontStyle: "italic" },
  tagline: { fontSize: 14, color: TEXT.muted, marginTop: 4, letterSpacing: 2, textTransform: "uppercase" },
  formSection: {},
  formTitle: { fontSize: 20, fontWeight: "600", color: TEXT.primary, marginBottom: 20 },
  input: {
    backgroundColor: INK[800], borderRadius: 12, paddingHorizontal: 16, paddingVertical: 16,
    fontSize: 15, color: TEXT.primary, marginBottom: 12, borderWidth: 1, borderColor: INK[700],
  },
  btn: { borderRadius: 12, paddingVertical: 18, alignItems: "center", marginTop: 4 },
  btnText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  linkWrap: { alignItems: "center", marginTop: 20 },
  linkText: { fontSize: 14, color: TEXT.muted },
  linkAccent: { color: TEXT.accent, fontWeight: "600" },
});
