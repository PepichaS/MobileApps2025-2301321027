import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Pressable, View } from "react-native";
import { useRouter } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import { Calendar as RNCalendar } from "react-native-calendars";
import { useColorScheme } from "nativewind";
import { Text } from "@/components/ui/Text";
import type { Habit } from "@/models/Habit";
import { loadHabits } from "@/storage/HabitStorage";
import { THEME } from "@/lib/theme";

type MarkedDateEntry = {
  marked?: boolean;
  selected?: boolean;
  selectedColor?: string;
  dotColor?: string;
};

type MarkedDates = Record<string, MarkedDateEntry>;

function buildMarkedDatesFromHabits(
  habits: Habit[],
  selectedDate: string | null
): MarkedDates {
  const completionCounts: Record<string, number> = {};
  const proofDates = new Set<string>();

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

    let dotColor = "#22c55e"; // light green for 1

    if (count >= 3) {
      dotColor = "#16a34a"; // stronger green for 3+
    } else if (count === 2) {
      dotColor = "#4ade80";
    }

    // If there is at least one proof on that date, tint the dot blue to highlight it.
    if (hasProof) {
      dotColor = "#3b82f6";
    }

    marked[dateKey] = {
      ...(marked[dateKey] ?? {}),
      marked: true,
      dotColor,
    };
  });

  if (selectedDate) {
    marked[selectedDate] = {
      ...(marked[selectedDate] ?? {}),
      selected: true,
    };
  }

  return marked;
}

export default function Calendar() {
  const router = useRouter();
  const { colorScheme } = useColorScheme();
  const theme = THEME[colorScheme === "dark" ? "dark" : "light"];
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
      setMarkedDates(buildMarkedDatesFromHabits(habits, selectedDate));
    },
    [habits, selectedDate]
  );

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

  function handleDayPress(day: { dateString: string }) {
    setSelectedDate(day.dateString);
  }

  function handleOpenHabit(habitId: string) {
    router.push(`/habit/${habitId}`);
  }

  return (
    <View className="flex-1 px-4 py-6 bg-background">
      <Text variant="h1" className="mb-4">
        Calendar
      </Text>
      <Text variant="muted" className="mb-4">
        Days with completed habits are marked. Darker dots mean more habits.
      </Text>

      <RNCalendar
        key={colorScheme}
        markedDates={markedDates}
        onDayPress={handleDayPress}
        theme={{
          calendarBackground: theme.card,
          dayTextColor: theme.foreground,
          textDisabledColor: theme.mutedForeground,
          todayTextColor: theme.primary,
          monthTextColor: theme.foreground,
          arrowColor: theme.primary,
          selectedDayBackgroundColor: theme.secondary,
          selectedDayTextColor: theme.secondaryForeground,
        }}
      />

      {selectedDate && (
        <View className="gap-2 mt-6">
          <Text variant="large">
            {selectedDate} – {selectedDateHabits.length}{" "}
            {selectedDateHabits.length === 1 ? "habit" : "habits"} completed
            {selectedDateProofCount > 0 && (
              <Text>
                {" "}
                · {selectedDateProofCount}{" "}
                {selectedDateProofCount === 1 ? "proof" : "proofs"}
              </Text>
            )}
          </Text>

          {selectedDateHabits.length > 0 ? (
            <View className="gap-1">
              {selectedDateHabits.map(function mapHabit(habit) {
                const proofsForDay = habit.proofsByDate?.[selectedDate] ?? [];
                const proofCount = proofsForDay.length;

                return (
                  <Pressable
                    key={habit.id}
                    onPress={function onPress() {
                      handleOpenHabit(habit.id);
                    }}
                  >
                    <Text variant="muted">
                      • {habit.title}
                      {proofCount > 0 && (
                        <Text>
                          {" "}
                          – {proofCount} {proofCount === 1 ? "proof" : "proofs"}
                        </Text>
                      )}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          ) : (
            <Text variant="muted">
              No habits were completed on this day yet.
            </Text>
          )}
        </View>
      )}
    </View>
  );
}
