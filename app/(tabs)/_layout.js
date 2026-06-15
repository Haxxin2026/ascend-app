import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";

const INK800 = "#1F1A13";
const INK900 = "#14100B";
const CLAY600 = "#C8643C";
const FAINT = "#5F5645";

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: INK900,
          borderTopColor: INK800,
          borderTopWidth: 1,
          height: 85,
          paddingTop: 8,
          paddingBottom: 28,
        },
        tabBarActiveTintColor: CLAY600,
        tabBarInactiveTintColor: FAINT,
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: "600",
          marginTop: 4,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home-outline" size={22} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="practice"
        options={{
          title: "Practice",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="create-outline" size={22} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="study"
        options={{
          title: "Timer",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="book-outline" size={22} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="heatmap"
        options={{
          title: "Heatmap",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="grid-outline" size={22} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="missions"
        options={{
          title: "Missions",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="flag-outline" size={22} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}