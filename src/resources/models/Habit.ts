export interface Habit {
  id: string;
  title: string;
  goalDays: number;
  currentStreak: number;
  history: string[]; // ISO dates
  createdAt: string;
}
