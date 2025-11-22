import * as Notifications from "expo-notifications";
import { SchedulableTriggerInputTypes } from "expo-notifications";

import type { HabitReminder } from "@/models/Habit";

async function ensureNotificationPermissions(): Promise<boolean> {
  const settings = await Notifications.getPermissionsAsync();

  if (
    settings.granted ||
    (settings.ios &&
      (settings.ios.status === Notifications.IosAuthorizationStatus.PROVISIONAL ||
        settings.ios.status === Notifications.IosAuthorizationStatus.AUTHORIZED))
  ) {
    return true;
  }

  const request = await Notifications.requestPermissionsAsync();

  return !!(
    request.granted ||
    (request.ios &&
      (request.ios.status === Notifications.IosAuthorizationStatus.PROVISIONAL ||
        request.ios.status === Notifications.IosAuthorizationStatus.AUTHORIZED))
  );
}

async function scheduleHabitReminder(
  habitId: string,
  habitTitle: string,
  reminder: HabitReminder
): Promise<string | null> {
  const hasPermission = await ensureNotificationPermissions();

  if (!hasPermission) {
    return null;
  }

  const [hourString, minuteString] = reminder.time.split(":");
  const hour = Number(hourString);
  const minute = Number(minuteString);

  if (
    Number.isNaN(hour) ||
    Number.isNaN(minute) ||
    !Number.isInteger(hour) ||
    !Number.isInteger(minute)
  ) {
    return null;
  }

  try {
    const notificationId = await Notifications.scheduleNotificationAsync({
      content: {
        title: "Habit reminder",
        body: habitTitle,
        data: {
          habitId,
        },
      },
      // Daily reminder at a specific local time
      trigger: {
        type: SchedulableTriggerInputTypes.DAILY,
        hour,
        minute,
      },
    });

    return notificationId;
  } catch (error) {
    console.error("Failed to schedule habit reminder", error);
    return null;
  }
}

async function cancelHabitReminder(
  notificationId: string | null | undefined
): Promise<void> {
  if (!notificationId) {
    return;
  }

  try {
    await Notifications.cancelScheduledNotificationAsync(notificationId);
  } catch (error) {
    console.error("Failed to cancel habit reminder", error);
  }
}

export { ensureNotificationPermissions, scheduleHabitReminder, cancelHabitReminder };


