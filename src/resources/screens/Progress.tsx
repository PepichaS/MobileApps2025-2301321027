import React, { useCallback, useMemo, useState } from "react";
import { ScrollView, View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/Card";
import { Progress as ProgressBar } from "@/components/ui/Progress";
import { Text } from "@/components/ui/Text";
import type { Habit } from "@/models/Habit";
import { loadHabits } from "@/storage/HabitStorage";

function getOverallStats(habits: Habit[]) {
  if (habits.length === 0) {
    return {
      totalHabits: 0,
      totalCompletions: 0,
      bestStreak: 0,
      averageStreak: 0,
      completionPercent: 0,
      totalProofs: 0,
      daysWithProof: 0,
      habitsWithProof: 0,
    };
  }

  const totalHabits = habits.length;
  let totalCompletions = 0;
  let totalStreak = 0;
  let bestStreak = 0;
  let totalGoalDays = 0;
  let totalProofs = 0;
  let daysWithProof = 0;
  let habitsWithProof = 0;

  habits.forEach(function forEachHabit(habit) {
    totalCompletions += habit.history.length;
    totalStreak += habit.currentStreak;
    bestStreak = Math.max(bestStreak, habit.currentStreak);
    totalGoalDays += habit.goalDays;

    if (habit.proofsByDate) {
      let proofsForHabit = 0;

      Object.values(habit.proofsByDate).forEach(function forEachProofArray(proofs) {
        if (proofs && proofs.length > 0) {
          daysWithProof += 1;
          totalProofs += proofs.length;
          proofsForHabit += proofs.length;
        }
      });

      if (proofsForHabit > 0) {
        habitsWithProof += 1;
      }
    }
  });

  const averageStreak = totalStreak / totalHabits;
  const completionPercent =
    totalGoalDays > 0
      ? Math.min(100, (totalCompletions / totalGoalDays) * 100)
      : 0;

  return {
    totalHabits,
    totalCompletions,
    bestStreak,
    averageStreak,
    completionPercent,
    totalProofs,
    daysWithProof,
    habitsWithProof,
  };
}

export default function Progress() {
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

  const overall = useMemo(
    function computeOverall() {
      return getOverallStats(habits);
    },
    [habits]
  );

  function renderHabitsProgress() {
    if (habits.length === 0) {
      return (
        <Text variant="muted">
          Once you start adding habits and committing days, you will see
          detailed progress here.
        </Text>
      );
    }

    return habits.map(function mapHabit(habit) {
      const completedDays = habit.history.length;
      const ratio =
        habit.goalDays > 0
          ? Math.min(100, (completedDays / habit.goalDays) * 100)
          : 0;
      const proofDates = habit.proofsByDate
        ? Object.values(habit.proofsByDate).filter(function filterProofs(proofs) {
            return proofs && proofs.length > 0;
          })
        : [];
      const proofDays = proofDates.length;
      const proofCount = proofDates.reduce(function reduceProofs(total, proofs) {
        return total + (proofs ? proofs.length : 0);
      }, 0);

      return (
        <View key={habit.id} className="mb-4">
          <Text className="mb-1 font-semibold">{habit.title}</Text>
          <Text variant="muted" className="mb-1">
            {completedDays} / {habit.goalDays} days completed
          </Text>
          <ProgressBar value={ratio} />
          {proofCount > 0 && (
            <Text variant="muted" className="mt-1">
              {proofDays}{" "}
              {proofDays === 1 ? "day" : "days"} with proof, {proofCount}{" "}
              {proofCount === 1 ? "proof" : "proofs"} total
            </Text>
          )}
        </View>
      );
    });
  }

  return (
    <ScrollView
      className="flex-1 bg-background"
      contentContainerClassName="px-4 py-6 gap-4"
    >
      <Text variant="h1" className="mb-2 text-primary">
        Progress
      </Text>
      <Text variant="muted" className="mb-4">
        Track how your habits are performing overall and how close you are to
        your goals.
      </Text>

      <Card>
        <CardHeader>
          <CardTitle>Overview</CardTitle>
          <CardDescription>
            high-level view of your habits and streaks.
          </CardDescription>
        </CardHeader>
        <CardContent className="gap-2">
          {isLoading ? (
            <Text variant="muted">Loading your progress...</Text>
          ) : habits.length === 0 ? (
            <Text variant="muted">
              Add a habit and start committing days to see your progress
              summary.
            </Text>
          ) : (
            <>
              <Text>
                <Text className="font-semibold">{overall.totalHabits}</Text>{" "}
                habits
              </Text>
              <Text>
                <Text className="font-semibold">
                  {overall.totalCompletions}
                </Text>{" "}
                total completed days
              </Text>
              <Text>
                Best streak:{" "}
                <Text className="font-semibold">{overall.bestStreak}</Text> days
              </Text>
              <Text>
                Average streak:{" "}
                <Text className="font-semibold">
                  {overall.averageStreak.toFixed(1)}
                </Text>{" "}
                days
              </Text>
              {overall.totalProofs > 0 && (
                <>
                  <Text>
                    <Text className="font-semibold">
                      {overall.daysWithProof}
                    </Text>{" "}
                    {overall.daysWithProof === 1 ? "day" : "days"} with proof
                  </Text>
                  <Text>
                    <Text className="font-semibold">
                      {overall.totalProofs}
                    </Text>{" "}
                    {overall.totalProofs === 1 ? "proof" : "proofs"} captured
                    {" · "}
                    <Text className="font-semibold">
                      {overall.habitsWithProof}
                    </Text>{" "}
                    {overall.habitsWithProof === 1 ? "habit" : "habits"} with at
                    least one proof
                  </Text>
                </>
              )}
              <View className="mt-3">
                <Text className="mb-1">
                  Overall completion towards goals:{" "}
                  <Text className="font-semibold">
                    {overall.completionPercent.toFixed(0)}%
                  </Text>
                </Text>
                <ProgressBar value={overall.completionPercent} />
              </View>
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Per-habit progress</CardTitle>
          <CardDescription>
            How far each habit has progressed towards its goal.
          </CardDescription>
        </CardHeader>
        <CardContent>{renderHabitsProgress()}</CardContent>
      </Card>
    </ScrollView>
  );
}
