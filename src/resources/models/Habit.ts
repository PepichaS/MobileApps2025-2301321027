export interface HabitReminder {
  time: string; // Daily reminder time in 24h format, e.g. "08:30".
  enabled: boolean; // Whether this reminder is currently active.
}

export interface HabitProofLocation {
  latitude: number;
  longitude: number;
}

export interface HabitProof {
  photoUri?: string; // Optional URI of the photo taken as proof for this completion.
  location?: HabitProofLocation; // Optional GPS location captured when completing the habit.
  createdAt: string; // When this proof was created, as an ISO timestamp.
}

export interface Habit {
  id: string;
  title: string;
  description?: string; // Optional longer description of the habit (why, how, etc.).
  goalDays: number;
  currentStreak: number;
  history: string[]; // Days on which the habit was completed, stored as "YYYY-MM-DD" keys.
  completionTimesByDate?: Record<string, string>; // Optional map of completion timestamps per day key ("YYYY-MM-DD"). The value is an ISO timestamp representing when the habit was marked as completed on that day.
  reminder?: HabitReminder | null; // Optional reminder for the habit.
  reminderNotificationId?: string | null; // Identifier of the scheduled local notification for this habit's reminder, if any. Used so we can cancel or reschedule it later.
  proofsByDate?: Record<string, HabitProof[]>; // Optional proofs (photo + GPS) attached to specific completion days, keyed by the same "YYYY-MM-DD" date keys used in history. The value is an array of HabitProof objects.
  createdAt: string;
}
