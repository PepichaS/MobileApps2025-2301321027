import React from "react";
import { View } from "react-native";

import { Text } from "@/components/ui/Text";

export default function Calendar() {
  return (
    <View className="flex-1 px-4 py-6 bg-background">
      <Text variant="h1">Calendar</Text>
      <Text variant="muted">
        Here you will see a calendar view of your habit commits over time.
      </Text>
    </View>
  );
}


