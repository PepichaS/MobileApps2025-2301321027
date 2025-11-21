import React from "react";
import { View } from "react-native";

import { Text } from "@/components/ui/Text";

export default function Progress() {
  return (
    <View className="flex-1 px-4 py-6 bg-background">
      <Text variant="h1">Progress</Text>
      <Text variant="muted">
        This screen will show streaks, completion percentage and charts for your
        habits.
      </Text>
    </View>
  );
}


