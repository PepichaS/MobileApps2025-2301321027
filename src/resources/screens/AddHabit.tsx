import React, { useState } from "react";
import { ScrollView, View } from "react-native";
import { useRouter } from "expo-router";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Text } from "@/components/ui/Text";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/Alert";
import type { Habit } from "@/models/Habit";
import { saveHabit } from "@/storage/HabitStorage";
import { Textarea } from "@/components/ui/Textarea";
import { Switch } from "@/components/ui/Switch";
import { scheduleHabitReminder } from "@/services/NotificationService";
import { AlertCircle, CheckCircle2 } from "lucide-react-native";
import { useInlineAlert } from "@/hooks/useInlineAlert";

function isValidTimeString(value: string): boolean {
  const trimmed = value.trim();

  if (!trimmed) {
    return false;
  }

  const parts = trimmed.split(":");

  if (parts.length !== 2) {
    return false;
  }

  const [hourString, minuteString] = parts;
  const hour = Number(hourString);
  const minute = Number(minuteString);

  if (
    Number.isNaN(hour) ||
    Number.isNaN(minute) ||
    !Number.isInteger(hour) ||
    !Number.isInteger(minute)
  ) {
    return false;
  }

  return hour >= 0 && hour <= 23 && minute >= 0 && minute <= 59;
}

function createHabitId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export default function AddHabit() {
  const router = useRouter();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [goalDays, setGoalDays] = useState("21");
  const [reminderEnabled, setReminderEnabled] = useState(false);
  const [reminderTime, setReminderTime] = useState("20:00");
  const [isSaving, setIsSaving] = useState(false);
  const { inlineAlert, showInlineAlert } = useInlineAlert();

  const hasError = title.trim().length === 0 || Number.isNaN(Number(goalDays));

  async function handleSave() {
    const cleanedTitle = title.trim();
    const cleanedDescription = description.trim();
    const parsedGoalDays = Number(goalDays);
    const cleanedReminderTime = reminderTime.trim();

    if (!cleanedTitle || Number.isNaN(parsedGoalDays) || parsedGoalDays <= 0) {
      showInlineAlert(
        "destructive",
        "Check your habit",
        "Please enter a name and a positive number of target days."
      );
      return;
    }

    if (reminderEnabled && cleanedReminderTime && !isValidTimeString(cleanedReminderTime)) {
      showInlineAlert(
        "destructive",
        "Check reminder time",
        "Please enter a valid reminder time in 24h format, e.g. 08:30 or 20:00."
      );
      return;
    }

    const habitId = createHabitId();

    const shouldCreateReminder =
      reminderEnabled &&
      cleanedReminderTime &&
      isValidTimeString(cleanedReminderTime);

    let reminderNotificationId: string | null = null;

    if (shouldCreateReminder) {
      const scheduledId = await scheduleHabitReminder(habitId, cleanedTitle, {
        time: cleanedReminderTime,
        enabled: true,
      });

      reminderNotificationId = scheduledId;

      if (!scheduledId) {
        showInlineAlert(
          "destructive",
          "Notifications disabled",
          "We could not enable a reminder for this habit. Please check your notification permissions."
        );
      }
    }

    const newHabit: Habit = {
      id: habitId,
      title: cleanedTitle,
      description: cleanedDescription || undefined,
      goalDays: parsedGoalDays,
      currentStreak: 0,
      history: [],
      createdAt: new Date().toISOString(),
      reminder: shouldCreateReminder
        ? {
            time: cleanedReminderTime,
            enabled: true,
          }
        : undefined,
      reminderNotificationId,
    };

    try {
      setIsSaving(true);
      await saveHabit(newHabit);

      showInlineAlert(
        "default",
        "Habit created",
        "Your new habit has been saved."
      );

      setTimeout(function goBack() {
        router.back();
      }, 800);
    } catch (error) {
      console.error("Failed to save habit", error);
      showInlineAlert(
        "destructive",
        "Something went wrong",
        "We couldn't save your habit. Please try again."
      );
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <ScrollView className="flex-1 bg-background" contentContainerClassName="px-4 py-6 gap-6">
      {inlineAlert && (
        <Alert
          variant={inlineAlert.variant}
          icon={inlineAlert.variant === "destructive" ? AlertCircle : CheckCircle2}
          className="mb-4"
        >
          <AlertTitle>{inlineAlert.title}</AlertTitle>
          <AlertDescription>{inlineAlert.message}</AlertDescription>
        </Alert>
      )}

      <View className="gap-2">
        <Text variant="h1">Add Habit</Text>
        <Text variant="muted">
          Give your habit a clear name and pick how many days you want to commit
          to it.
        </Text>
      </View>

      <View className="gap-4">
        <View className="gap-2">
          <Label>Habit name</Label>
          <Input
            placeholder="e.g. Code for 30 minutes"
            value={title}
            onChangeText={setTitle}
            autoFocus
            returnKeyType="next"
          />
        </View>

        <View className="gap-2">
          <Label>Description (optional)</Label>
          <Textarea
            placeholder="Why is this habit important? How will you do it?"
            value={description}
            onChangeText={setDescription}
          />
        </View>

        <View className="gap-2">
          <Label>Target days</Label>
          <Input
            placeholder="21"
            value={goalDays}
            onChangeText={setGoalDays}
            keyboardType="number-pad"
          />
          <Text variant="muted">
            How many days in a row you are aiming to complete this habit.
          </Text>
        </View>

        <View className="gap-2">
          <View className="flex-row justify-between items-center">
            <Label>Daily reminder</Label>
            <Switch
              checked={reminderEnabled}
              onCheckedChange={function onToggle(checked) {
                setReminderEnabled(Boolean(checked));
              }}
            />
          </View>
          <Input
            placeholder="08:30"
            value={reminderTime}
            onChangeText={setReminderTime}
            editable={reminderEnabled}
          />
          <Text variant="muted">
            Set an optional daily reminder time in 24h format (HH:MM).
          </Text>
        </View>
      </View>

      <View className="gap-3 mt-4">
        <Button onPress={handleSave} disabled={hasError || isSaving}>
          <Text>{isSaving ? "Saving…" : "Save habit"}</Text>
        </Button>
      </View>
    </ScrollView>
  );
}
