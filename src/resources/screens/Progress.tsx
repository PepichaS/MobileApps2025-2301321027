import React, { useCallback, useMemo, useState } from "react";
import { Pressable, ScrollView, View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { useRouter } from "expo-router";
import {
  Award,
  Camera,
  Flame,
  Lock,
  Target,
  TrendingUp,
  Trophy,
  Zap,
} from "lucide-react-native";
import { Progress as ProgressBar } from "@/components/ui/Progress";
import { Text } from "@/components/ui/Text";
import { Icon } from "@/components/ui/Icon";
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

  const overall = useMemo(
    function computeOverall() {
      return getOverallStats(habits);
    },
    [habits]
  );

  const achievements = useMemo(() => {
    const allAchievements = [
      {
        icon: Flame,
        title: "Week Warrior",
        description: "Maintain a 7-day streak",
        unlockedDescription: "Maintained a 7-day streak",
        color: "text-orange-500",
        bgColor: "bg-orange-500/10",
        requirement: 7,
        isUnlocked: overall.bestStreak >= 7,
        progressValue: overall.bestStreak,
      },
      {
        icon: Trophy,
        title: "Habit Master",
        description: "Achieve a 21-day streak",
        unlockedDescription: "Achieved a 21-day streak",
        color: "text-amber-500",
        bgColor: "bg-amber-500/10",
        requirement: 21,
        isUnlocked: overall.bestStreak >= 21,
        progressValue: overall.bestStreak,
      },
      {
        icon: Camera,
        title: "Evidence Pro",
        description: "Capture 10 proofs",
        unlockedDescription: "Captured 10+ proofs",
        color: "text-blue-500",
        bgColor: "bg-blue-500/10",
        requirement: 10,
        isUnlocked: overall.totalProofs >= 10,
        progressValue: overall.totalProofs,
      },
      {
        icon: Target,
        title: "Goal Crusher",
        description: "Reach 100% completion",
        unlockedDescription: "Reached your goal!",
        color: "text-green-500",
        bgColor: "bg-green-500/10",
        requirement: 100,
        isUnlocked: overall.completionPercent >= 100,
        progressValue: Math.round(overall.completionPercent),
      },
    ];

    return allAchievements;
  }, [overall]);

  function handleOpenHabit(habitId: string) {
    router.push(`/habit/${habitId}`);
  }

  function renderEmptyState() {
    return (
      <View className="justify-center items-center px-6 py-12">
        <View className="justify-center items-center mb-4 w-16 h-16 rounded-full bg-primary/10">
          <Icon as={TrendingUp} size={32} className="text-primary" />
        </View>
        <Text className="mb-2 text-lg font-semibold text-center">
          Your progress starts here
        </Text>
        <Text variant="muted" className="text-center">
          Complete habits to see detailed analytics and track your journey
        </Text>
      </View>
    );
  }

  function renderHabitCard(habit: Habit) {
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

    const isComplete = ratio >= 100;
    const isOnTrack = ratio >= 50;

    return (
      <Pressable
        key={habit.id}
        onPress={() => handleOpenHabit(habit.id)}
        className="p-4 mb-3 rounded-2xl border border-border bg-card active:bg-accent/50"
      >
        {/* Header */}
        <View className="flex-row justify-between items-start mb-3">
          <View className="flex-1">
            <Text className="mb-1 text-base font-semibold">{habit.title}</Text>
            <View className="flex-row gap-2 items-center">
              {habit.currentStreak > 0 && (
                <View className="flex-row gap-1 items-center">
                  <Icon as={Flame} size={14} className="text-destructive" />
                  <Text variant="muted" className="text-xs">
                    {habit.currentStreak} day streak
                  </Text>
                </View>
              )}
              {proofCount > 0 && (
                <View className="flex-row gap-1 items-center">
                  <Icon as={Camera} size={14} className="text-primary" />
                  <Text variant="muted" className="text-xs">
                    {proofCount} proofs
                  </Text>
                </View>
              )}
            </View>
          </View>

          {isComplete && (
            <View className="justify-center items-center w-10 h-10 rounded-full bg-green-500/10">
              <Icon as={Trophy} size={20} className="text-green-500" />
            </View>
          )}
        </View>

        {/* Progress */}
        <View className="gap-2">
          <View className="flex-row justify-between items-center">
            <Text variant="muted" className="text-xs">
              {completedDays} / {habit.goalDays} days
            </Text>
            <Text className="text-sm font-bold text-primary">
              {ratio.toFixed(0)}%
            </Text>
          </View>

          <ProgressBar value={ratio} />

          {/* Status Badge */}
          {isComplete ? (
            <View className="flex-row items-center gap-1.5 self-start px-2 py-1 rounded-full bg-green-500/10">
              <Icon as={Award} size={12} className="text-green-500" />
              <Text className="text-xs font-semibold text-green-500">
                Goal Reached!
              </Text>
            </View>
          ) : isOnTrack ? (
            <View className="flex-row items-center gap-1.5 self-start px-2 py-1 rounded-full bg-blue-500/10">
              <Icon as={TrendingUp} size={12} className="text-blue-500" />
              <Text className="text-xs font-semibold text-blue-500">
                On Track
              </Text>
            </View>
          ) : (
            <View className="flex-row items-center gap-1.5 self-start px-2 py-1 rounded-full bg-amber-500/10">
              <Icon as={Zap} size={12} className="text-amber-500" />
              <Text className="text-xs font-semibold text-amber-500">
                Keep Going
              </Text>
            </View>
          )}
        </View>
      </Pressable>
    );
  }

  return (
    <ScrollView
      className="flex-1 bg-background"
      contentContainerClassName="px-4 py-6 gap-6"
    >
      <View>
        <Text variant="h1" className="mb-2 text-left">
          Your Progress
        </Text>
        <Text variant="muted">
          Celebrate your wins and track your journey to better habits
        </Text>
      </View>

      {isLoading ? (
        <View className="items-center py-12">
          <Text variant="muted">Loading your progress...</Text>
        </View>
      ) : habits.length === 0 ? (
        renderEmptyState()
      ) : (
        <>
          {/* Big Stats Grid */}
          <View className="gap-3">
            <View className="flex-row gap-3">
              {/* Best Streak */}
              <View className="flex-1 p-4 bg-gradient-to-br rounded-2xl border from-destructive/10 to-destructive/5 border-destructive/20">
                <View className="flex-row items-center gap-1.5 mb-2">
                  <Icon as={Flame} size={20} className="text-destructive" />
                  <Text variant="muted" className="text-xs">Best Streak</Text>
                </View>
                <Text className="text-3xl font-bold">
                  {overall.bestStreak}
                </Text>
                <Text variant="muted" className="text-xs">days</Text>
              </View>

              {/* Total Habits */}
              <View className="flex-1 p-4 bg-gradient-to-br rounded-2xl border from-primary/10 to-primary/5 border-primary/20">
                <View className="flex-row items-center gap-1.5 mb-2">
                  <Icon as={Target} size={20} className="text-primary" />
                  <Text variant="muted" className="text-xs">Active Habits</Text>
                </View>
                <Text className="text-3xl font-bold">
                  {overall.totalHabits}
                </Text>
              </View>
            </View>

            <View className="flex-row gap-3">
              {/* Total Completions */}
              <View className="flex-1 p-4 rounded-2xl border bg-card border-border">
                <View className="flex-row items-center gap-1.5 mb-2">
                  <Icon as={TrendingUp} size={16} className="text-primary" />
                  <Text variant="muted" className="text-xs">Total Days</Text>
                </View>
                <Text className="text-2xl font-bold">
                  {overall.totalCompletions}
                </Text>
              </View>

              {/* Average Streak */}
              <View className="flex-1 p-4 rounded-2xl border bg-card border-border">
                <View className="flex-row items-center gap-1.5 mb-2">
                  <Icon as={Zap} size={16} className="text-primary" />
                  <Text variant="muted" className="text-xs">Avg Streak</Text>
                </View>
                <Text className="text-2xl font-bold">
                  {overall.averageStreak.toFixed(1)}
                </Text>
                <Text variant="muted" className="text-xs">days</Text>
              </View>

              {/* Proofs */}
              <View className="flex-1 p-4 rounded-2xl border bg-card border-border">
                <View className="flex-row items-center gap-1.5 mb-2">
                  <Icon as={Camera} size={16} className="text-primary" />
                  <Text variant="muted" className="text-xs">Proofs</Text>
                </View>
                <Text className="text-2xl font-bold">
                  {overall.totalProofs}
                </Text>
              </View>
            </View>
          </View>

          {/* Overall Completion */}
          <View className="p-5 rounded-2xl border border-border bg-card">
            <View className="flex-row justify-between items-center mb-3">
              <Text className="text-lg font-semibold">Overall Progress</Text>
              <Text className="text-3xl font-bold text-primary">
                {overall.completionPercent.toFixed(0)}%
              </Text>
            </View>
            <ProgressBar value={overall.completionPercent} className="h-3" />
            <Text variant="muted" className="mt-2 text-xs">
              Progress towards all your habit goals
            </Text>
          </View>

          {/* Achievements */}
          <View>
            <View className="flex-row justify-between items-center mb-3">
              <Text className="text-lg font-semibold">
                🏆 Achievements
              </Text>
              <Text variant="muted" className="text-xs">
                {achievements.filter((a) => a.isUnlocked).length} / {achievements.length}
              </Text>
            </View>
            <View className="gap-2">
              {achievements.map((achievement, index) => (
                <View
                  key={index}
                  className={`flex-row items-center gap-3 p-4 rounded-2xl ${
                    achievement.isUnlocked
                      ? achievement.bgColor
                      : "bg-muted/30 border border-border"
                  }`}
                >
                  <View
                    className={`justify-center items-center w-12 h-12 rounded-full ${
                      achievement.isUnlocked
                        ? "bg-background/50"
                        : "bg-muted/50"
                    }`}
                  >
                    {achievement.isUnlocked ? (
                      <Icon
                        as={achievement.icon}
                        size={24}
                        className={achievement.color}
                      />
                    ) : (
                      <Icon
                        as={Lock}
                        size={20}
                        className="text-muted-foreground"
                      />
                    )}
                  </View>
                  <View className="flex-1">
                    <Text
                      className={`font-semibold mb-0.5 ${
                        achievement.isUnlocked ? "" : "text-muted-foreground"
                      }`}
                    >
                      {achievement.title}
                    </Text>
                    <Text variant="muted" className="text-xs">
                      {achievement.isUnlocked
                        ? achievement.unlockedDescription
                        : achievement.description}
                    </Text>
                    {!achievement.isUnlocked && (
                      <Text variant="muted" className="mt-1 text-xs">
                        Progress: {achievement.progressValue} / {achievement.requirement}
                      </Text>
                    )}
                  </View>
                </View>
              ))}
            </View>
          </View>

          {/* Per-Habit Progress */}
          <View>
            <Text className="mb-3 text-lg font-semibold">
              Individual Habits
            </Text>
            <View>{habits.map(renderHabitCard)}</View>
          </View>
        </>
      )}
    </ScrollView>
  );
}
