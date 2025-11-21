import React, { useCallback, useMemo, useState } from "react";
import { Alert, ScrollView, View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { useLocalSearchParams, useRouter } from "expo-router";

import { Button } from "@/components/ui/Button";
import { Text } from "@/components/ui/Text";
import type { Habit } from "@/models/Habit";
import { deleteHabit, loadHabits, updateHabit } from "@/storage/HabitStorage";

function getTodayKey(): string {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getPreviousDayKey(key: string): string {
  const [yearString, monthString, dayString] = key.split("-");
  const year = Number(yearString);
  const month = Number(monthString);
  const day = Number(dayString);

  const date = new Date(year, month - 1, day);
  date.setDate(date.getDate() - 1);

  const previousYear = date.getFullYear();
  const previousMonth = String(date.getMonth() + 1).padStart(2, "0");
  const previousDay = String(date.getDate()).padStart(2, "0");

  return `${previousYear}-${previousMonth}-${previousDay}`;
}

function computeConsecutiveStreakFrom(
  startKey: string,
  completedDays: Set<string>
): number {
  let streak = 0;
  let currentKey = startKey;

  while (completedDays.has(currentKey)) {
    streak += 1;
    currentKey = getPreviousDayKey(currentKey);
  }

  return streak;
}

function computeStreak(history: string[]): number {
  if (history.length === 0) {
    return 0;
  }

  const completedDays = new Set(history);
  const todayKey = getTodayKey();

  if (completedDays.has(todayKey)) {
    // User has completed today: streak is consecutive days ending at today.
    return computeConsecutiveStreakFrom(todayKey, completedDays);
  }

  // No completed today: streak is consecutive days ending at the most recent completed.
  const sortedKeys = Array.from(completedDays).sort();
  const lastKey = sortedKeys[sortedKeys.length - 1];

  return computeConsecutiveStreakFrom(lastKey, completedDays);
}

export default function HabitDetails() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();

  const [habit, setHabit] = useState<Habit | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isUpdating, setIsUpdating] = useState<boolean>(false);

  const todayKey = getTodayKey();

  const isCompletedToday = useMemo(() => {
    if (!habit) {
      return false;
    }

    return habit.history.includes(todayKey);
  }, [habit, todayKey]);

  async function refreshHabit() {
    if (!id) {
      setHabit(null);
      return;
    }

    try {
      setIsLoading(true);
      const habits = await loadHabits();
      const foundHabit = habits.find(function findHabit(item) {
        return item.id === id;
      });

      setHabit(foundHabit ?? null);
    } finally {
      setIsLoading(false);
    }
  }

  useFocusEffect(
    useCallback(() => {
      void refreshHabit();
    }, [id])
  );

  async function handleToggleToday() {
    if (!habit || isUpdating) {
      return;
    }

    try {
      setIsUpdating(true);

      const alreadyCompleted = habit.history.includes(todayKey);

      const nextHistory = alreadyCompleted
        ? habit.history.filter(function filterHistory(date) {
            return date !== todayKey;
          })
        : [...habit.history, todayKey];

      const updatedHabit: Habit = {
        ...habit,
        history: nextHistory,
        currentStreak: computeStreak(nextHistory),
      };

      setHabit(updatedHabit);
      await updateHabit(updatedHabit);
    } catch (error) {
      console.error("Failed to update habit", error);
      Alert.alert(
        "Update failed",
        "We could not update this habit right now. Please try again."
      );
    } finally {
      setIsUpdating(false);
    }
  }

  function confirmDeleteHabit() {
    if (!habit) {
      return;
    }

    Alert.alert(
      "Delete habit",
      `Are you sure you want to delete "${habit.title}"?`,
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Delete",
          style: "destructive",
          onPress: function onDelete() {
            void performDeleteHabit();
          },
        },
      ]
    );
  }

  async function performDeleteHabit() {
    if (!habit) {
      return;
    }

    try {
      await deleteHabit(habit.id);
      router.back();
    } catch (error) {
      console.error("Failed to delete habit", error);
      Alert.alert(
        "Delete failed",
        "We could not delete this habit right now. Please try again."
      );
    }
  }

  function renderContent() {
    if (isLoading) {
      return <Text variant="muted">Loading habit...</Text>;
    }

    if (!habit) {
      return (
        <Text variant="muted">
          This habit could not be found. It may have been deleted.
        </Text>
      );
    }

    return (
      <>
        <Text variant="h1" className="mb-2">
          {habit.title}
        </Text>

        <Text variant="muted" className="mb-4">
          Target {habit.goalDays} days · Current streak {habit.currentStreak}
        </Text>

        <View className="gap-3 px-4 py-3 mb-6 rounded-xl border border-border bg-card">
          <Text variant="large" className="mb-1">
            Today
          </Text>
          <Text variant="muted" className="mb-3">
            Mark whether you have completed this habit today to keep your streak
            going.
          </Text>

          <Button
            onPress={handleToggleToday}
            disabled={isUpdating}
            variant={isCompletedToday ? "secondary" : "default"}
          >
            <Text>
              {isCompletedToday ? "Unmark today" : "I did this today"}
            </Text>
          </Button>
        </View>

        <View className="gap-3">
          <Button variant="destructive" onPress={confirmDeleteHabit}>
            <Text>Delete habit</Text>
          </Button>
        </View>
      </>
    );
  }

  return (
    <ScrollView
      className="flex-1 bg-background"
      contentContainerClassName="px-4 py-6"
    >
      {renderContent()}
    </ScrollView>
  );
}
