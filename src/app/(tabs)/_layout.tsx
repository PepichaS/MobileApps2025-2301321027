import { Tabs } from "expo-router";
import React from "react";
import { Plus, CalendarDays, Home, LineChart } from "lucide-react-native";
import { useColorScheme } from "nativewind";
import { Icon } from "@/components/ui/Icon";
import { THEME } from "@/lib/theme";
import { Text } from "@/components/ui/Text";
import { ThemeToggle } from "@/components/ThemeToggle";

export default function TabsLayout() {
  const { colorScheme } = useColorScheme();
  const theme = colorScheme === "dark" ? "dark" : "light";
  const colors = THEME[theme];

  return (
    <Tabs
      screenOptions={({ route }) => ({
        headerTitle: () => (
          <Text className="text-lg font-semibold text-muted-foreground">
            Just Commit.
          </Text>
        ),
        headerRight: () => <ThemeToggle />,
        headerStyle: {
          backgroundColor: colors.background,
        },
        headerShadowVisible: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.mutedForeground,
        tabBarStyle: {
          backgroundColor: colors.card,
          borderTopColor: colors.border,
        },
        tabBarIcon: ({ focused, size }) => {
          if (route.name === "index") {
            return <Icon as={Home} size={size} className="text-primary" />;
          }

          if (route.name === "add") {
            return (
              <Icon
                as={Plus}
                size={focused ? size + 8 : size + 4}
                className="text-primary"
              />
            );
          }

          if (route.name === "calendar") {
            return (
              <Icon as={CalendarDays} size={size} className="text-primary" />
            );
          }

          if (route.name === "progress") {
            return (
              <Icon as={LineChart} size={size} className="text-primary" />
            );
          }

          return null;
        },
      })}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Dashboard",
        }}
      />
      <Tabs.Screen
        name="add"
        options={{
          title: "Add",
        }}
      />
      <Tabs.Screen
        name="calendar"
        options={{
          title: "Calendar",
        }}
      />
      <Tabs.Screen
        name="progress"
        options={{
          title: "Progress",
        }}
      />
    </Tabs>
  );
}
