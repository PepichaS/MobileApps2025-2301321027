import "@/styles/global.css";

import { ThemeProvider as NavigationThemeProvider } from "@react-navigation/native";
import { Stack } from "expo-router";
import React, { useEffect } from "react";
import { View } from "react-native";
import { useColorScheme } from "nativewind";
import { StatusBar } from "expo-status-bar";
import { PortalHost } from "@rn-primitives/portal";
import * as Notifications from "expo-notifications";

import { NAV_THEME, THEME } from "@/lib/theme";
import { SchedulableTriggerInputTypes } from "expo-notifications";

Notifications.setNotificationHandler({
  handleNotification: async function handleNotification() {
    return {
      // Keep alert semantics for older platforms
      shouldShowAlert: true,
      // New required flags for SDK 54+
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: false,
      shouldSetBadge: false,
    };
  },
});

function RootStack() {
  const { colorScheme } = useColorScheme();
  const theme = colorScheme === "dark" ? "dark" : "light";
  const isDark = theme === "dark";

  useEffect(function setupNotifications() {
    async function registerAndSchedule() {
      const existingPermissions = await Notifications.getPermissionsAsync();
      let finalStatus = existingPermissions.status;

      if (existingPermissions.status !== "granted") {
        const requestResult = await Notifications.requestPermissionsAsync();
        finalStatus = requestResult.status;
      }

      if (finalStatus !== "granted") {
        return;
      }

      // Ensure we only have one daily reminder
      await Notifications.cancelAllScheduledNotificationsAsync();

      await Notifications.scheduleNotificationAsync({
        content: {
          title: "Don't forget your habit today!",
          body: "Open Commit Habit Builder and keep your streak going.",
        },
        trigger: {
          type: SchedulableTriggerInputTypes.DAILY,
          hour: 9,
          minute: 0,
        },
      });
    }

    void registerAndSchedule();
  }, []);

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
