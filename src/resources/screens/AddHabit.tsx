import React from "react";
import { View } from "react-native";

import { Text } from "@/components/ui/Text";

export default function AddHabit() {
  return (
    <View className="flex-1 px-4 py-6 bg-background">
      <Text variant="h1">Add Habit</Text>
      <Text variant="muted">
        Here you will be able to define the name, description, target days and
        reminder time for a new habit.
      </Text>
    </View>
  );
}


