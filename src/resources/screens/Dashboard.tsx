import React from "react";
import { View } from "react-native";

import { Button } from "@/components/ui/Button";
import { Text } from "@/components/ui/Text";
import { useRouter } from "expo-router";

export default function Dashboard() {
  const router = useRouter();

  function handleAddHabit() {
    router.push("/(tabs)/add");
  }

  return (
    <View className="flex-1 px-4 py-6 bg-background">
      <View className="mb-6">
        <Text variant="h1" className="text-primary">
          Commit Habit Builder
        </Text>
        <Text variant="muted">
          Track your daily commits, keep your streak alive and build habits that
          last.
        </Text>
      </View>

      <View className="gap-3">
        <Button onPress={handleAddHabit}>
          <Text>New habit</Text>
        </Button>

        <View className="p-4 mt-4 rounded-xl border border-border bg-card">
          <Text variant="large">Today</Text>
          <Text variant="muted">
            Your habits list will appear here once you start adding them.
          </Text>
        </View>
      </View>
    </View>
  );
}


