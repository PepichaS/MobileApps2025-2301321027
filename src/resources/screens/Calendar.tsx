import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, View } from "react-native";
import { useRouter } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import { Calendar as RNCalendar } from "react-native-calendars";
import { useColorScheme } from "nativewind";
import { Camera, CheckCircle2, Sparkles, TrendingUp } from "lucide-react-native";
import { Text } from "@/components/ui/Text";
import { Icon } from "@/components/ui/Icon";
import type { Habit } from "@/models/Habit";
import { loadHabits } from "@/storage/HabitStorage";
import { THEME } from "@/lib/theme";

type MarkedDateEntry = {
  marked?: boolean;
  selected?: boolean;
  selectedColor?: string;
  customStyles?: {
    container?: Record<string, string | number>;
    text?: Record<string, string | number>;
  };
};

type MarkedDates = Record<string, MarkedDateEntry>;

function buildMarkedDatesFromHabits(
  habits: Habit[],
  selectedDate: string | null,
  colorScheme: "light" | "dark"
): MarkedDates {
  const completionCounts: Record<string, number> = {};
  const proofDates = new Set<string>();
  const totalHabits = habits.length;

  habits.forEach(function forEachHabit(habit) {
    habit.history.forEach(function forEachDate(dateKey) {
      completionCounts[dateKey] = (completionCounts[dateKey] ?? 0) + 1;
    });

    if (habit.proofsByDate) {
      Object.entries(habit.proofsByDate).forEach(function forEachProofEntry([
        dateKey,
        proofs,
      ]) {
        if (proofs && proofs.length > 0) {
          proofDates.add(dateKey);
        }
      });
    }
  });

  const marked: MarkedDates = {};

  Object.entries(completionCounts).forEach(function forEachEntry([
    dateKey,
    count,
  ]) {
    const hasProof = proofDates.has(dateKey);
    const isFullCompletion = count === totalHabits && totalHabits > 0;

    // More vibrant colors for completed days
    let bgColor = "rgba(34, 197, 94, 0.2)"; // light green
    let textColor = colorScheme === "dark" ? "#fff" : "#000";

    if (isFullCompletion) {
      // Gold for perfect days
      bgColor = colorScheme === "dark" 
        ? "rgba(251, 191, 36, 0.3)" 
        : "rgba(251, 191, 36, 0.4)";
      textColor = colorScheme === "dark" ? "#fbbf24" : "#92400e";
    } else if (hasProof) {
      // Blue for days with proof
      bgColor = colorScheme === "dark"
        ? "rgba(59, 130, 246, 0.3)"
        : "rgba(59, 130, 246, 0.4)";
      textColor = colorScheme === "dark" ? "#60a5fa" : "#1e40af";
    } else if (count >= 3) {
      // Darker green for 3+
      bgColor = colorScheme === "dark"
        ? "rgba(34, 197, 94, 0.4)"
        : "rgba(34, 197, 94, 0.5)";
      textColor = colorScheme === "dark" ? "#22c55e" : "#15803d";
    } else if (count === 2) {
      bgColor = colorScheme === "dark"
        ? "rgba(34, 197, 94, 0.3)"
        : "rgba(34, 197, 94, 0.35)";
    }

    marked[dateKey] = {
      marked: true,
      customStyles: {
        container: {
          backgroundColor: bgColor,
          borderRadius: 8,
        },
        text: {
          color: textColor,
          fontWeight: "600",
        },
      },
    };
  });

  if (selectedDate) {
    const existing = marked[selectedDate] || {};
    marked[selectedDate] = {
      ...existing,
      selected: true,
      customStyles: {
        ...existing.customStyles,
        container: {
          ...existing.customStyles?.container,
          borderWidth: 2,
          borderColor: THEME[colorScheme].primary,
        },
      },
    };
  }

  return marked;
}

export default function Calendar() {
  const router = useRouter();
  const { colorScheme } = useColorScheme();
  const theme = THEME[colorScheme === "dark" ? "dark" : "light"];
  const themeMode = colorScheme === "dark" ? "dark" : "light";
  const [habits, setHabits] = useState<Habit[]>([]);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [markedDates, setMarkedDates] = useState<MarkedDates>({});

  async function refreshHabits() {
    const storedHabits = await loadHabits();
    setHabits(storedHabits);
  }

  useFocusEffect(
    useCallback(() => {
      void refreshHabits();
    }, [])
  );

  useEffect(
    function computeMarkedDates() {
      setMarkedDates(buildMarkedDatesFromHabits(habits, selectedDate, themeMode));
    },
    [habits, selectedDate, themeMode]
  );

  const calendarStats = useMemo(() => {
    const allDates = new Set<string>();
    let totalProofs = 0;
    let daysWithProof = 0;
    let perfectDays = 0;

    habits.forEach((habit) => {
      habit.history.forEach((date) => allDates.add(date));
    });

    allDates.forEach((date) => {
      const habitsOnDate = habits.filter((h) => h.history.includes(date));
      if (habitsOnDate.length === habits.length && habits.length > 0) {
        perfectDays++;
      }

      let proofsOnDate = 0;
      habits.forEach((h) => {
        const proofs = h.proofsByDate?.[date];
        if (proofs && proofs.length > 0) {
          proofsOnDate += proofs.length;
        }
      });

      if (proofsOnDate > 0) {
        daysWithProof++;
        totalProofs += proofsOnDate;
      }
    });

    return {
      totalActiveDays: allDates.size,
      totalProofs,
      daysWithProof,
      perfectDays,
    };
  }, [habits]);

  const selectedDateHabits = useMemo(
    function computeSelectedDateHabits() {
      if (!selectedDate) {
        return [];
      }

      return habits.filter(function filterHabits(habit) {
        return habit.history.includes(selectedDate);
      });
    },
    [habits, selectedDate]
  );

  const selectedDateProofCount = useMemo(
    function computeSelectedDateProofCount() {
      if (!selectedDate) {
        return 0;
      }

      let totalProofs = 0;

      habits.forEach(function forEachHabit(habit) {
        const proofsForDay = habit.proofsByDate?.[selectedDate];

        if (proofsForDay && proofsForDay.length > 0) {
          totalProofs += proofsForDay.length;
        }
      });

      return totalProofs;
    },
    [habits, selectedDate]
  );

  const isPerfectDay = useMemo(() => {
    if (!selectedDate || habits.length === 0) return false;
    return selectedDateHabits.length === habits.length;
  }, [selectedDate, selectedDateHabits, habits]);

  function handleDayPress(day: { dateString: string }) {
    setSelectedDate(day.dateString);
  }

  function handleOpenHabit(habitId: string) {
    router.push(`/habit/${habitId}`);
  }

  return (
    <ScrollView className="flex-1 bg-background">
      <View className="gap-6 px-4 py-6">
        {/* Header with Stats */}
        <View>
          <Text variant="h1" className="mb-2 text-left">
            Your Journey
          </Text>
          <Text variant="muted" className="mb-4">
            Every day is a new opportunity to build better habits
          </Text>

          {/* Calendar Stats */}
          {habits.length > 0 && (
            <View className="flex-row gap-3 mb-4">
              <View className="flex-1 p-3 rounded-xl border bg-primary/5 border-primary/10">
                <View className="flex-row items-center gap-1.5 mb-1">
                  <Icon as={TrendingUp} size={14} className="text-primary" />
                  <Text variant="muted" className="text-xs">Active Days</Text>
                </View>
                <Text className="text-xl font-bold">{calendarStats.totalActiveDays}</Text>
              </View>

              <View className="flex-1 p-3 rounded-xl border bg-destructive/5 border-destructive/10">
                <View className="flex-row items-center gap-1.5 mb-1">
                  <Icon as={Sparkles} size={14} className="text-destructive" />
                  <Text variant="muted" className="text-xs">Perfect Days</Text>
                </View>
                <Text className="text-xl font-bold">{calendarStats.perfectDays}</Text>
              </View>

              <View className="flex-1 p-3 rounded-xl border bg-primary/5 border-primary/10">
                <View className="flex-row items-center gap-1.5 mb-1">
                  <Icon as={Camera} size={14} className="text-primary" />
                  <Text variant="muted" className="text-xs">Proofs</Text>
                </View>
                <Text className="text-xl font-bold">{calendarStats.totalProofs}</Text>
              </View>
            </View>
          )}
        </View>

        {/* Legend */}
        <View className="p-4 rounded-xl border bg-card border-border">
          <Text className="mb-3 text-sm font-semibold">Legend</Text>
          <View className="gap-2">
            <View className="flex-row gap-3 items-center">
              <View className="w-8 h-8 rounded-lg bg-green-500/20" />
              <Text variant="muted" className="flex-1 text-xs">Some habits completed</Text>
            </View>
            <View className="flex-row gap-3 items-center">
              <View className="w-8 h-8 rounded-lg bg-amber-500/30" />
              <Text variant="muted" className="flex-1 text-xs">Perfect day (all habits!)</Text>
            </View>
            <View className="flex-row gap-3 items-center">
              <View className="w-8 h-8 rounded-lg bg-blue-500/30" />
              <Text variant="muted" className="flex-1 text-xs">Day with photo proofs</Text>
            </View>
          </View>
        </View>

        {/* Calendar */}
        <View className="overflow-hidden p-2 rounded-2xl border border-border bg-card">
          <RNCalendar
            key={colorScheme}
            markedDates={markedDates}
            onDayPress={handleDayPress}
            markingType="custom"
            theme={{
              calendarBackground: "transparent",
              dayTextColor: theme.foreground,
              textDisabledColor: theme.mutedForeground,
              todayTextColor: theme.primary,
              monthTextColor: theme.foreground,
              textMonthFontWeight: "600",
              textMonthFontSize: 18,
              arrowColor: theme.primary,
              selectedDayBackgroundColor: theme.primary,
              selectedDayTextColor: theme.primaryForeground,
            }}
          />
        </View>

        {/* Selected Day Details */}
        {selectedDate && (
          <View className="gap-3">
            {isPerfectDay && (
              <View className="p-4 rounded-2xl border-2 bg-amber-500/10 border-amber-500/30">
                <View className="flex-row gap-2 items-center mb-1">
                  <Icon as={Sparkles} size={20} className="text-amber-500" />
                  <Text className="text-lg font-bold text-amber-500 dark:text-amber-400">
                    Perfect Day!
                  </Text>
                </View>
                <Text variant="muted" className="text-xs">
                  You completed all your habits on this day 🎉
                </Text>
              </View>
            )}

            <View className="p-4 rounded-2xl border border-border bg-card">
              <View className="flex-row justify-between items-center mb-3">
                <Text className="text-lg font-semibold">{selectedDate}</Text>
                <View className="flex-row gap-4 items-center">
                  <View className="flex-row gap-1 items-center">
                    <Icon as={CheckCircle2} size={16} className="text-primary" />
                    <Text className="text-sm font-semibold">
                      {selectedDateHabits.length}
                    </Text>
                  </View>
                  {selectedDateProofCount > 0 && (
                    <View className="flex-row gap-1 items-center">
                      <Icon as={Camera} size={16} className="text-primary" />
                      <Text className="text-sm font-semibold">
                        {selectedDateProofCount}
                      </Text>
                    </View>
                  )}
                </View>
              </View>

              {selectedDateHabits.length > 0 ? (
                <View className="gap-2">
                  {selectedDateHabits.map(function mapHabit(habit) {
                    const proofsForDay = habit.proofsByDate?.[selectedDate] ?? [];
                    const proofCount = proofsForDay.length;

                    return (
                      <Pressable
                        key={habit.id}
                        onPress={function onPress() {
                          handleOpenHabit(habit.id);
                        }}
                        className="flex-row gap-3 items-center p-3 rounded-xl bg-primary/5 active:bg-primary/10"
                      >
                        <Icon as={CheckCircle2} size={18} className="text-primary" />
                        <View className="flex-1">
                          <Text className="font-medium">{habit.title}</Text>
                          {proofCount > 0 && (
                            <View className="flex-row items-center gap-1 mt-0.5">
                              <Icon as={Camera} size={12} className="text-primary" />
                              <Text variant="muted" className="text-xs">
                                {proofCount} {proofCount === 1 ? "proof" : "proofs"}
                              </Text>
                            </View>
                          )}
                        </View>
                      </Pressable>
                    );
                  })}
                </View>
              ) : (
                <View className="items-center py-6">
                  <Text variant="muted" className="text-center">
                    No habits were completed on this day
                  </Text>
                </View>
              )}
            </View>
          </View>
        )}
      </View>
    </ScrollView>
  );
}
