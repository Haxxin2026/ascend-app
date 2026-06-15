import { useRouter } from "expo-router";
import { useEffect } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { supabase } from "../lib/supabase";

export default function Index() {
  const router = useRouter();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        router.replace("/(tabs)");
      } else {
        router.replace("/(auth)/signin");
      }
    });
  }, []);

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#C8643C" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#14100B",
    justifyContent: "center",
    alignItems: "center",
  },
});