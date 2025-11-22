import AsyncStorage from "@react-native-async-storage/async-storage";
import type { Habit, HabitProof } from "@/models/Habit";

const HABITS_STORAGE_KEY = "habits";

async function loadHabits(): Promise<Habit[]> {
  try {
    const json = await AsyncStorage.getItem(HABITS_STORAGE_KEY);
    if (!json) {
      return [];
    }

    const parsed = JSON.parse(json) as Habit[] | unknown;

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed as Habit[];
  } catch (error) {
    console.error("Failed to load habits from storage", error);
    return [];
  }
}

async function persistHabits(habits: Habit[]): Promise<void> {
  try {
    const json = JSON.stringify(habits);
    await AsyncStorage.setItem(HABITS_STORAGE_KEY, json);
  } catch (error) {
    console.error("Failed to save habits to storage", error);
  }
}

async function saveHabit(habit: Habit): Promise<void> {
  const habits = await loadHabits();
  const nextHabits = [...habits, habit];

  await persistHabits(nextHabits);
}

async function updateHabit(updatedHabit: Habit): Promise<void> {
  const habits = await loadHabits();

  const nextHabits = habits.map((habit) =>
    habit.id === updatedHabit.id ? updatedHabit : habit
  );

  await persistHabits(nextHabits);
}

async function deleteHabit(id: string): Promise<void> {
  const habits = await loadHabits();
  const nextHabits = habits.filter((habit) => habit.id !== id);

  await persistHabits(nextHabits);
}

async function addHabitProof(
  habitId: string,
  dateKey: string,
  proof: HabitProof
): Promise<void> {
  const habits = await loadHabits();

  const nextHabits = habits.map(function mapHabit(habit) {
    if (habit.id !== habitId) {
      return habit;
    }

    const existingProofsByDate = habit.proofsByDate ?? {};
    const existingProofsForDay = existingProofsByDate[dateKey] ?? [];

    const nextProofsByDate = {
      ...existingProofsByDate,
      [dateKey]: [...existingProofsForDay, proof],
    };

    return {
      ...habit,
      proofsByDate: nextProofsByDate,
    };
  });

  await persistHabits(nextHabits);
}

export { saveHabit, loadHabits, updateHabit, deleteHabit, addHabitProof };
