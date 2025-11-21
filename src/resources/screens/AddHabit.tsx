import React, { useState } from "react";
import { Alert, ScrollView, View } from "react-native";
import { useRouter } from "expo-router";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Text } from "@/components/ui/Text";
import type { Habit } from "@/models/Habit";
import { saveHabit } from "@/storage/HabitStorage";

function createHabitId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export default function AddHabit() {
  const router = useRouter();

  const [title, setTitle] = useState("");
  const [goalDays, setGoalDays] = useState("21");
  const [isSaving, setIsSaving] = useState(false);

  const hasError = title.trim().length === 0 || Number.isNaN(Number(goalDays));

  async function handleSave() {
    const cleanedTitle = title.trim();
    const parsedGoalDays = Number(goalDays);

    if (!cleanedTitle || Number.isNaN(parsedGoalDays) || parsedGoalDays <= 0) {
      Alert.alert(
        "Check your habit",
        "Please enter a name and a positive number of target days."
      );
      return;
    }

    const newHabit: Habit = {
      id: createHabitId(),
      title: cleanedTitle,
      goalDays: parsedGoalDays,
      currentStreak: 0,
      history: [],
      createdAt: new Date().toISOString(),
    };

    try {
      setIsSaving(true);
      await saveHabit(newHabit);
      router.back();
    } catch (error) {
      console.error("Failed to save habit", error);
      Alert.alert(
        "Something went wrong",
        "We couldn't save your habit. Please try again."
      );
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <ScrollView className="flex-1 bg-background" contentContainerClassName="px-4 py-6 gap-6">
      <View className="gap-2">
        <Text variant="h1">Add Habit</Text>
        <Text variant="muted">
          Give your habit a clear name and pick how many days you want to commit
          to it.
        </Text>
      </View>

      <View className="gap-4">
        <View className="gap-2">
          <Label>Habit name</Label>
          <Input
            placeholder="e.g. Code for 30 minutes"
            value={title}
            onChangeText={setTitle}
            autoFocus
            returnKeyType="next"
          />
        </View>

        <View className="gap-2">
          <Label>Target days</Label>
          <Input
            placeholder="21"
            value={goalDays}
            onChangeText={setGoalDays}
            keyboardType="number-pad"
          />
          <Text variant="muted">
            How many days in a row you are aiming to complete this habit.
          </Text>
        </View>
      </View>

      <View className="gap-3 mt-4">
        <Button onPress={handleSave} disabled={hasError || isSaving}>
          <Text>{isSaving ? "Saving…" : "Save habit"}</Text>
        </Button>
      </View>
    </ScrollView>
  );
}
