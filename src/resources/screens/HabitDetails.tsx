import React from "react";
import { View } from "react-native";
import { useLocalSearchParams } from "expo-router";

import { Text } from "@/components/ui/Text";

export default function HabitDetails() {
  const { id } = useLocalSearchParams<{ id?: string }>();

  return (
    <View className="flex-1 px-4 py-6 bg-background">
      <Text variant="h1">Habit Details</Text>
      <Text variant="muted">
        Details for habit <Text variant="code">{id ?? "unknown"}</Text> will
        appear here, including today&apos;s status, notes, streak and history.
      </Text>
    </View>
  );
}


