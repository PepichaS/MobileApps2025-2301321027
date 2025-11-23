import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, View } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect } from "@react-navigation/native";
import { useRouter } from "expo-router";
import {
  Plus,
  Flame,
  Camera,
  CheckCircle2,
  Trophy,
  Target,
  X,
  Lightbulb,
  Check,
} from "lucide-react-native";
import { Button } from "@/components/ui/Button";
import { Text } from "@/components/ui/Text";
import { Icon } from "@/components/ui/Icon";
import { Checkbox } from "@/components/ui/Checkbox";
import type { Habit } from "@/models/Habit";
import { loadHabits, updateHabit } from "@/storage/HabitStorage";

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
    return computeConsecutiveStreakFrom(todayKey, completedDays);
  }

  const sortedKeys = Array.from(completedDays).sort();
  const lastKey = sortedKeys[sortedKeys.length - 1];

  return computeConsecutiveStreakFrom(lastKey, completedDays);
}

const MOTIVATIONAL_MESSAGES = [
  {
    emoji: "🚀",
    message: "Every small step counts!",
    subtext: "Build momentum today",
  },
  {
    emoji: "💪",
    message: "You're building something amazing!",
    subtext: "One habit at a time",
  },
  {
    emoji: "⚡",
    message: "Consistency is your superpower!",
    subtext: "Show up today",
  },
  { emoji: "🌟", message: "Today is a fresh start!", subtext: "Make it count" },
  {
    emoji: "🎯",
    message: "Focus on progress, not perfection!",
    subtext: "You've got this",
  },
  {
    emoji: "✨",
    message: "Small wins lead to big changes!",
    subtext: "Keep going",
  },
  {
    emoji: "🔥",
    message: "Your future self will thank you!",
    subtext: "Stay committed",
  },
];

export default function Dashboard() {
  const router = useRouter();
  const [habits, setHabits] = useState<Habit[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [updatingHabitId, setUpdatingHabitId] = useState<string | null>(null);
  const [showWelcome, setShowWelcome] = useState<boolean>(false);

  const todayKey = getTodayKey();

  useEffect(() => {
    async function checkFirstTime() {
      try {
        const hasSeenWelcome = await AsyncStorage.getItem("hasSeenWelcome");
        if (!hasSeenWelcome) {
          setShowWelcome(true);
        }
      } catch (error) {
        console.error("Failed to check welcome status", error);
      }
    }
    void checkFirstTime();
  }, []);

  async function dismissWelcome() {
    try {
      await AsyncStorage.setItem("hasSeenWelcome", "true");
      setShowWelcome(false);
    } catch (error) {
      console.error("Failed to save welcome status", error);
    }
  }

  const dailyMotivation = useMemo(() => {
    const dayOfYear = Math.floor(
      (Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) /
        86400000
    );
    return MOTIVATIONAL_MESSAGES[dayOfYear % MOTIVATIONAL_MESSAGES.length];
  }, []);

  const stats = useMemo(() => {
    const completed = habits.filter((h) => h.history.includes(todayKey)).length;
    const total = habits.length;
    const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
    const totalStreak = habits.reduce((sum, h) => sum + h.currentStreak, 0);
    const bestStreak = Math.max(...habits.map((h) => h.currentStreak), 0);
    const withProof = habits.filter((h) => {
      const proofsToday = h.proofsByDate?.[todayKey];
      return proofsToday && proofsToday.length > 0;
    }).length;

    return { completed, total, percentage, totalStreak, bestStreak, withProof };
  }, [habits, todayKey]);

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

  async function handleToggleHabit(habit: Habit) {
    if (updatingHabitId) return;

    try {
      setUpdatingHabitId(habit.id);

      const alreadyCompleted = habit.history.includes(todayKey);
      const hasProof = habit.proofsByDate?.[todayKey]?.length ?? 0 > 0;

      if (alreadyCompleted && hasProof) {
        return;
      }

      const nextHistory = alreadyCompleted
        ? habit.history.filter((date) => date !== todayKey)
        : [...habit.history, todayKey];

      const nextCompletionTimesByDate = {
        ...(habit.completionTimesByDate ?? {}),
      };

      if (alreadyCompleted) {
        delete nextCompletionTimesByDate[todayKey];
      } else {
        nextCompletionTimesByDate[todayKey] = new Date().toISOString();
      }

      const updatedHabit: Habit = {
        ...habit,
        history: nextHistory,
        currentStreak: computeStreak(nextHistory),
        completionTimesByDate: nextCompletionTimesByDate,
      };

      setHabits((prev) =>
        prev.map((h) => (h.id === habit.id ? updatedHabit : h))
      );

      await updateHabit(updatedHabit);
    } finally {
      setUpdatingHabitId(null);
    }
  }

  function handleAddHabit() {
    router.push("/habit/add");
  }

  function handleOpenHabit(habitId: string) {
    router.push(`/habit/${habitId}`);
  }

  function renderEmptyState() {
    return (
      <View className="justify-center items-center px-6 py-12">
        <View className="justify-center items-center mb-4 w-16 h-16 rounded-full bg-primary/10">
          <Icon as={Target} size={32} className="text-primary" />
        </View>
        <Text className="mb-2 text-lg font-semibold text-center">
          Ready to build great habits?
        </Text>
        <Text variant="muted" className="mb-6 text-center">
          Start by creating your first habit. Every expert was once a beginner!
        </Text>
        <Button onPress={handleAddHabit} size="lg">
          <Icon as={Plus} size={20} className="text-primary-foreground" />
          <Text>Create your first habit</Text>
        </Button>
      </View>
    );
  }

  function renderHabitItem(habit: Habit) {
    const isCompleted = habit.history.includes(todayKey);
    const hasProof = habit.proofsByDate?.[todayKey]?.length ?? 0 > 0;
    const proofCount = habit.proofsByDate?.[todayKey]?.length ?? 0;
    const isOnStreak = habit.currentStreak > 0;
    const isUpdating = updatingHabitId === habit.id;

    return (
      <View
        key={habit.id}
        className="overflow-hidden mb-3 rounded-2xl border border-border bg-card"
      >
        <Pressable
          onPress={() => handleOpenHabit(habit.id)}
          className="px-4 py-4 active:bg-accent/50"
          disabled={isUpdating}
        >
          <View className="flex-row gap-3 items-start">
            {/* Checkbox */}
            <View className="mt-0.5">
              <Checkbox
                checked={isCompleted}
                disabled={isUpdating || (isCompleted && !!hasProof)}
                onCheckedChange={() => {
                  void handleToggleHabit(habit);
                }}
              />
            </View>

            {/* Content */}
            <View className="flex-1">
              <View className="flex-row gap-2 items-center mb-1">
                <Text
                  className={`text-base font-semibold ${isCompleted ? "text-muted-foreground" : ""}`}
                >
                  {habit.title}
                </Text>
                {isOnStreak && (
                  <View className="flex-row items-center gap-1 px-2 py-0.5 rounded-full bg-destructive/10">
                    <Icon as={Flame} size={12} className="text-destructive" />
                    <Text className="text-xs font-bold text-destructive">
                      {habit.currentStreak}
                    </Text>
                  </View>
                )}
              </View>

              <View className="flex-row flex-wrap gap-3 items-center">
                <Text variant="muted" className="text-xs">
                  {habit.history.length} / {habit.goalDays} days
                </Text>

                {hasProof && (
                  <View className="flex-row gap-1 items-center">
                    <Icon as={Camera} size={12} className="text-primary" />
                    <Text variant="muted" className="text-xs">
                      {proofCount} {proofCount === 1 ? "proof" : "proofs"}
                    </Text>
                  </View>
                )}
              </View>
            </View>

            {/* Status Icon */}
            {isCompleted && (
              <View className="mt-0.5">
                <Icon as={CheckCircle2} size={20} className="text-primary" />
              </View>
            )}
          </View>
        </Pressable>

        {/* Quick proof CTA */}
        {isCompleted && !hasProof && (
          <View className="px-4 pb-3">
            <Pressable
              onPress={() => handleOpenHabit(habit.id)}
              className="flex-row gap-2 items-center px-3 py-2 rounded-lg bg-primary/5 active:bg-primary/10"
            >
              <Icon as={Camera} size={16} className="text-primary" />
              <Text className="text-xs font-medium text-primary">
                Add proof with photo + GPS
              </Text>
            </Pressable>
          </View>
        )}
      </View>
    );
  }

  return (
    <ScrollView className="flex-1 bg-background">
      <View className="gap-6 px-4 py-6">
        {/* Welcome Banner - First Time Only */}
        {showWelcome && habits.length === 0 && (
          <View className="relative p-5 rounded-2xl border bg-accent border-border dark:bg-accent/50">
            <Pressable
              onPress={dismissWelcome}
              className="absolute top-3 right-3 justify-center items-center w-7 h-7 rounded-full border border-border bg-background/60"
            >
              <Icon as={X} size={14} className="text-muted-foreground" />
            </Pressable>

            <View className="flex-row gap-3 items-start pr-8">
              <View className="justify-center items-center w-12 h-12 rounded-full bg-primary/10">
                <Icon as={Lightbulb} size={24} className="text-primary" />
              </View>
              <View className="flex-1">
                <Text className="mb-2 text-lg font-bold text-accent-foreground">
                  Welcome to Just Commit! 👋
                </Text>
                <Text className="mb-3 text-sm text-muted-foreground">
                  Building habits is simple here:
                </Text>
                <View className="gap-2">
                  <View className="flex-row gap-2 items-start">
                    <Icon as={Check} size={16} className="text-primary" />
                    <Text className="flex-1 text-xs text-muted-foreground">
                      Create a habit and mark it complete daily
                    </Text>
                  </View>
                  <View className="flex-row gap-2 items-start">
                    <Icon as={Check} size={16} className="text-primary" />
                    <Text className="flex-1 text-xs text-muted-foreground">
                      Add photo + GPS proof to make it stick
                    </Text>
                  </View>
                  <View className="flex-row gap-2 items-start">
                    <Icon as={Check} size={16} className="text-primary" />
                    <Text className="flex-1 text-xs text-muted-foreground">
                      Build streaks and celebrate your wins!
                    </Text>
                  </View>
                </View>
              </View>
            </View>
          </View>
        )}

        {/* Motivational Header */}
        <View className="items-center px-6 py-8 bg-gradient-to-br rounded-2xl from-primary/5 to-primary/10">
          <Text className="mb-3 text-5xl">{dailyMotivation.emoji}</Text>
          <Text className="mb-1 text-xl font-bold text-center">
            {dailyMotivation.message}
          </Text>
          <Text variant="muted" className="text-center">
            {dailyMotivation.subtext}
          </Text>
        </View>

        {/* Stats Overview */}
        {habits.length > 0 && (
          <View className="gap-3">
            {/* Today's Progress */}
            <View className="p-4 rounded-2xl border border-border bg-card">
              <View className="flex-row justify-between items-center mb-3">
                <Text className="text-sm font-semibold">Today's Progress</Text>
                <Text className="text-2xl font-bold text-primary">
                  {stats.percentage}%
                </Text>
              </View>

              <View className="overflow-hidden mb-3 h-2 rounded-full bg-muted">
                <View
                  className="h-full rounded-full bg-primary"
                  style={{ width: `${stats.percentage}%` }}
                />
              </View>

              <Text variant="muted" className="text-xs">
                {stats.completed} of {stats.total} habits completed today
              </Text>
            </View>

            {/* Quick Stats */}
            <View className="flex-row gap-3">
              <View className="flex-1 p-4 rounded-2xl border border-border bg-card">
                <View className="flex-row gap-2 items-center mb-1">
                  <Icon as={Flame} size={16} className="text-destructive" />
                  <Text variant="muted" className="text-xs">
                    Best Streak
                  </Text>
                </View>
                <Text className="text-2xl font-bold">{stats.bestStreak}</Text>
                <Text variant="muted" className="text-xs">
                  days
                </Text>
              </View>

              <View className="flex-1 p-4 rounded-2xl border border-border bg-card">
                <View className="flex-row gap-2 items-center mb-1">
                  <Icon as={Camera} size={16} className="text-primary" />
                  <Text variant="muted" className="text-xs">
                    With Proof
                  </Text>
                </View>
                <Text className="text-2xl font-bold">{stats.withProof}</Text>
                <Text variant="muted" className="text-xs">
                  today
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* Celebration for 100% */}
        {habits.length > 0 && stats.percentage === 100 && (
          <View className="items-center px-6 py-8 rounded-2xl border-2 bg-primary/5 border-primary/20">
            <Icon as={Trophy} size={48} className="mb-3 text-primary" />
            <Text className="mb-1 text-xl font-bold text-center">
              🎉 Perfect Day! 🎉
            </Text>
            <Text variant="muted" className="text-center">
              You completed all your habits today. You're unstoppable!
            </Text>
          </View>
        )}

        {/* Habits List */}
        <View>
          <View className="flex-row justify-between items-center mb-4">
            <Text className="text-lg font-semibold">Your Habits</Text>
            <Button
              onPress={handleAddHabit}
              size="sm"
              variant="outline"
              className="flex-row gap-1"
            >
              <Icon as={Plus} size={16} />
              <Text>New</Text>
            </Button>
          </View>

          {isLoading ? (
            <View className="items-center py-12">
              <Text variant="muted">Loading your habits...</Text>
            </View>
          ) : habits.length === 0 ? (
            renderEmptyState()
          ) : (
            <View>{habits.map(renderHabitItem)}</View>
          )}
        </View>
      </View>
    </ScrollView>
  );
}
