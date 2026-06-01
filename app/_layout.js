import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider } from '../context/AuthContext';

export default function RootLayout() {
  return (
    <AuthProvider>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="dashboard" />
        <Stack.Screen name="study" />
        <Stack.Screen name="heatmap" />
        <Stack.Screen name="missions" />
      </Stack>
      <StatusBar style="light" />
    </AuthProvider>
  );
}

