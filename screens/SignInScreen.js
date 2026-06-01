import { supabase } from "../lib/supabase";

import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useAuth } from "../context/AuthContext";

import { useRouter } from "expo-router";

export default function SignInScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const { signIn } = useAuth();

  const router = useRouter();

  async function handleSignIn() {
    if (!email || !password) {
      Alert.alert("Missing info", "Please enter email and password.");
      return;
    }

    setLoading(true);
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    setLoading(false);

    if (error) {
      Alert.alert("Login failed", error.message);
    } else {
      router.replace("/dashboard");
    }
  }

  return (
    <View style={styles.container}>
      <View style={styles.inner}>
        <Text style={styles.title}>Welcome back</Text>
        <Text style={styles.subtitle}>
          Sign in to continue your streak.
        </Text>

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
          placeholder="Password"
          placeholderTextColor="#888"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />

        <TouchableOpacity
          style={styles.signInBtn}
          onPress={handleSignIn}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.signInBtnText}>Sign in</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.linkBtn}
          onPress={() => router.push("/(auth)/signup")}
        >
          <Text style={styles.linkText}>
            Don't have an account? Sign up
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0F0F14", justifyContent: "center" },
  inner: { padding: 24 },
  title: { fontSize: 28, fontWeight: "700", color: "#F1F1F3", marginBottom: 8 },
  subtitle: { fontSize: 15, color: "#8888A0", marginBottom: 32 },
  input: { height: 50, borderRadius: 12, borderWidth: 1, borderColor: "#2A2A3A", backgroundColor: "#1A1A24", paddingHorizontal: 16, fontSize: 15, color: "#F1F1F3", marginBottom: 12 },
  signInBtn: { backgroundColor: "#7C3AED", height: 50, borderRadius: 12, alignItems: "center", justifyContent: "center", marginTop: 8 },
  signInBtnText: { color: "#fff", fontSize: 16, fontWeight: "600" },
  linkBtn: { marginTop: 24, alignItems: "center" },
  linkText: { color: "#7C3AED", fontSize: 14 },
});

