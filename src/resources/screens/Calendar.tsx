import React, { useCallback, useEffect, useMemo, useState } from "react";
import { View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { Calendar as RNCalendar } from "react-native-calendars";
import { Text } from "@/components/ui/Text";
import type { Habit } from "@/models/Habit";
import { loadHabits } from "@/storage/HabitStorage";

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
  const counts: Record<string, number> = {};

  habits.forEach(function forEachHabit(habit) {
    habit.history.forEach(function forEachDate(dateKey) {
      counts[dateKey] = (counts[dateKey] ?? 0) + 1;
    });
  });

  const marked: MarkedDates = {};

  Object.entries(counts).forEach(function forEachEntry([dateKey, count]) {
    let dotColor = "#22c55e"; // light green for 1

    if (count >= 3) {
      dotColor = "#16a34a"; // stronger green for 3+
    } else if (count === 2) {
      dotColor = "#4ade80";
    }

    marked[dateKey] = {
      marked: true,
      dotColor,
      selected: selectedDate === dateKey,
      selectedColor: selectedDate === dateKey ? "#111827" : undefined,
    };
  });

  if (selectedDate && !marked[selectedDate]) {
    marked[selectedDate] = {
      selected: true,
      selectedColor: "#111827",
    };
  }

  return marked;
}

export default function Calendar() {
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

  function handleDayPress(day: { dateString: string }) {
    setSelectedDate(day.dateString);
  }

  return (
    <View className="flex-1 px-4 py-6 bg-background">
      <Text variant="h1" className="mb-4">
        Calendar
      </Text>
      <Text variant="muted" className="mb-4">
        Days with completed habits are marked. Darker dots mean more habits.
      </Text>

      <RNCalendar markedDates={markedDates} onDayPress={handleDayPress} />

      {selectedDate && (
        <View className="gap-2 mt-6">
          <Text variant="large">
            {selectedDate} – {selectedDateHabits.length}{" "}
            {selectedDateHabits.length === 1 ? "habit" : "habits"} completed
          </Text>

          {selectedDateHabits.length > 0 ? (
            <View className="gap-1">
              {selectedDateHabits.map(function mapHabit(habit) {
                return (
                  <Text key={habit.id} variant="muted">
                    • {habit.title}
                  </Text>
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


