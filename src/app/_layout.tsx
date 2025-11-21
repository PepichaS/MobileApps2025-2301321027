import "@/styles/global.css";

import { ThemeProvider as NavigationThemeProvider } from "@react-navigation/native";
import { Stack } from "expo-router";
import React from "react";
import { View } from "react-native";
import { useColorScheme } from "nativewind";
import { StatusBar } from "expo-status-bar";
import { PortalHost } from "@rn-primitives/portal";

import { NAV_THEME, THEME } from "@/lib/theme";

function RootStack() {
  const { colorScheme } = useColorScheme();
  const theme = colorScheme === "dark" ? "dark" : "light";
  const isDark = theme === "dark";

  return (
    <NavigationThemeProvider value={NAV_THEME[theme]}>
      <View className={`flex-1 bg-background ${isDark ? "dark" : ""}`}>
        <StatusBar style={colorScheme === "dark" ? "light" : "dark"} />
        <Stack>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen
            name="habit/[id]"
            options={{
              headerTitle: "Habit Details",
              headerBackButtonDisplayMode: "minimal",
              headerStyle: {
                backgroundColor: THEME[theme].background,
              },
              headerShadowVisible: false,
            }}
          />
          <Stack.Screen
            name="habit/add"
            options={{
              headerTitle: "New Habit",
              headerBackButtonDisplayMode: "minimal",
              headerStyle: {
                backgroundColor: THEME[theme].background,
              },
              headerShadowVisible: false,
            }}
          />
        </Stack>
        <PortalHost />
      </View>
    </NavigationThemeProvider>
  );
}

export default function RootLayout() {
  return <RootStack />;
}
