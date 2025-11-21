import React, { useCallback, useState } from "react";
import { FlatList, Pressable, View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { useRouter } from "expo-router";

import { Button } from "@/components/ui/Button";
import { Text } from "@/components/ui/Text";
import type { Habit } from "@/models/Habit";
import { loadHabits } from "@/storage/HabitStorage";

export default function Dashboard() {
  const router = useRouter();
  const [habits, setHabits] = useState<Habit[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  async function refreshHabits() {
    try {
      setIsLoading(true);
      const storedHabits = await loadHabits();
      setHabits(storedHabits);
    } finally {
      setIsLoading(false);
    }
  }

  useFocusEffect(
    useCallback(() => {
      void refreshHabits();
    }, [])
  );

  function handleAddHabit() {
    router.push("/habit/add");
  }

  function handleOpenHabit(habitId: string) {
    router.push(`/habit/${habitId}`);
  }

  function renderHabitItem({ item }: { item: Habit }) {
    return (
      <Pressable
        onPress={function onPress() {
          handleOpenHabit(item.id);
        }}
        className="px-4 py-3 mb-2 rounded-xl border border-border bg-card active:bg-accent"
      >
        <Text className="font-semibold">{item.title}</Text>
        <Text variant="muted">
          Target {item.goalDays} days · Streak {item.currentStreak}
        </Text>
      </Pressable>
    );
  }

  function renderHabitsSection() {
    if (isLoading) {
      return (
        <Text variant="muted">
          Loading your habits...
        </Text>
      );
    }

    if (habits.length === 0) {
      return (
        <Text variant="muted">
          Your habits list will appear here once you start adding them.
        </Text>
      );
    }

    return (
      <FlatList
        data={habits}
        keyExtractor={function keyExtractor(item) {
          return item.id;
        }}
        renderItem={renderHabitItem}
      />
    );
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
          <Text variant="large" className="mb-2">
            Today
          </Text>
          {renderHabitsSection()}
        </View>
      </View>
    </View>
  );
}
