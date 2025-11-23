import React, { useState } from "react";
import { Pressable, ScrollView, View } from "react-native";
import { useRouter } from "expo-router";
import { Bell, CheckCircle2, Info, Target, Zap } from "lucide-react-native";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Text } from "@/components/ui/Text";
import { Icon } from "@/components/ui/Icon";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/Alert";
import type { Habit } from "@/models/Habit";
import { saveHabit } from "@/storage/HabitStorage";
import { Textarea } from "@/components/ui/Textarea";
import { Switch } from "@/components/ui/Switch";
import { scheduleHabitReminder } from "@/services/NotificationService";
import { AlertCircle } from "lucide-react-native";
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

const GOAL_PRESETS = [
  {
    days: 7,
    label: "1 Week",
    description: "Start small",
    icon: Zap,
    color: "text-blue-500",
    bgColor: "bg-blue-500/10",
  },
  {
    days: 21,
    label: "21 Days",
    description: "Build the habit",
    icon: Target,
    color: "text-green-500",
    bgColor: "bg-green-500/10",
  },
  {
    days: 30,
    label: "1 Month",
    description: "Solid foundation",
    icon: CheckCircle2,
    color: "text-purple-500",
    bgColor: "bg-purple-500/10",
  },
  {
    days: 66,
    label: "66 Days",
    description: "Science-backed",
    icon: Info,
    color: "text-amber-500",
    bgColor: "bg-amber-500/10",
  },
];

export default function AddHabit() {
  const router = useRouter();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [goalDays, setGoalDays] = useState("21");
  const [selectedPreset, setSelectedPreset] = useState(21);
  const [reminderEnabled, setReminderEnabled] = useState(false);
  const [reminderTime, setReminderTime] = useState("20:00");
  const [isSaving, setIsSaving] = useState(false);
  const { inlineAlert, showInlineAlert } = useInlineAlert();

  const hasError = title.trim().length === 0 || Number.isNaN(Number(goalDays));

  function handlePresetSelect(days: number) {
    setSelectedPreset(days);
    setGoalDays(String(days));
  }

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

    if (
      reminderEnabled &&
      cleanedReminderTime &&
      !isValidTimeString(cleanedReminderTime)
    ) {
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
    <ScrollView
      className="flex-1 bg-background"
      contentContainerClassName="px-4 py-6 gap-6"
    >
      {inlineAlert && (
        <Alert
          variant={inlineAlert.variant}
          icon={
            inlineAlert.variant === "destructive" ? AlertCircle : CheckCircle2
          }
          className="mb-4"
        >
          <AlertTitle>{inlineAlert.title}</AlertTitle>
          <AlertDescription>{inlineAlert.message}</AlertDescription>
        </Alert>
      )}

      {/* Header */}
      <View className="gap-2">
        <Text className="text-3xl font-bold">Create New Habit</Text>
        <Text variant="muted">
          Let's build something great together! Start by giving your habit a
          name.
        </Text>
      </View>

      {/* Step 1: Name */}
      <View className="gap-4 p-5 rounded-2xl border border-border bg-card">
        <View className="flex-row gap-2 items-center">
          <View className="justify-center items-center w-8 h-8 rounded-full bg-primary">
            <Text className="text-sm font-bold text-primary-foreground">1</Text>
          </View>
          <Text className="text-lg font-semibold">Name your habit</Text>
        </View>

        <View className="gap-2">
          <Input
            placeholder="e.g., Morning workout, Read 30 minutes, etc..."
            value={title}
            onChangeText={setTitle}
            autoFocus
            returnKeyType="next"
            className="text-base"
          />
          <Text variant="muted" className="text-xs">
            💡 Tip: Be specific! "Run 3km" is better than "Exercise"
          </Text>
        </View>
      </View>

      {/* Step 2: Description */}
      <View className="gap-4 p-5 rounded-2xl border border-border bg-card">
        <View className="flex-row gap-2 items-center">
          <View className="justify-center items-center w-8 h-8 rounded-full bg-primary">
            <Text className="text-sm font-bold text-primary-foreground">2</Text>
          </View>
          <Text className="text-lg font-semibold">Why does it matter?</Text>
          <Text variant="muted" className="text-xs">
            (optional)
          </Text>
        </View>

        <Textarea
          placeholder="This will help me stay healthy and energized throughout the day..."
          value={description}
          onChangeText={setDescription}
          className="min-h-[80px]"
        />
        <Text variant="muted" className="text-xs">
          Writing down your "why" increases success by 42%!
        </Text>
      </View>

      {/* Step 3: Target Days */}
      <View className="gap-4 p-5 rounded-2xl border border-border bg-card">
        <View className="flex-row gap-2 items-center">
          <View className="justify-center items-center w-8 h-8 rounded-full bg-primary">
            <Text className="text-sm font-bold text-primary-foreground">3</Text>
          </View>
          <Text className="text-lg font-semibold">Choose your goal</Text>
        </View>

        <Text variant="muted" className="text-xs">
          Pick a timeframe that challenges you but feels achievable
        </Text>

        {/* Preset Options */}
        <View className="gap-2">
          {GOAL_PRESETS.map((preset) => (
            <Pressable
              key={preset.days}
              onPress={() => handlePresetSelect(preset.days)}
              className={`flex-row items-center gap-3 p-4 rounded-xl border-2 ${
                selectedPreset === preset.days
                  ? "border-primary bg-primary/5"
                  : "border-border bg-background"
              }`}
            >
              <View
                className={`w-12 h-12 rounded-xl ${preset.bgColor} items-center justify-center`}
              >
                <Icon as={preset.icon} size={24} className={preset.color} />
              </View>
              <View className="flex-1">
                <Text className="font-semibold mb-0.5">{preset.label}</Text>
                <Text variant="muted" className="text-xs">
                  {preset.description}
                </Text>
              </View>
              {selectedPreset === preset.days && (
                <Icon as={CheckCircle2} size={20} className="text-primary" />
              )}
            </Pressable>
          ))}
        </View>

        {/* Custom Input */}
        <View className="gap-2 mt-2">
          <Label className="text-xs">Or enter custom days</Label>
          <Input
            placeholder="Custom days"
            value={goalDays}
            onChangeText={(value) => {
              setGoalDays(value);
              setSelectedPreset(Number(value));
            }}
            keyboardType="number-pad"
          />
        </View>
      </View>

      {/* Step 4: Reminder */}
      <View className="gap-4 p-5 rounded-2xl border border-border bg-card">
        <View className="flex-row gap-2 items-center">
          <View className="justify-center items-center w-8 h-8 rounded-full bg-primary">
            <Text className="text-sm font-bold text-primary-foreground">4</Text>
          </View>
          <Text className="text-lg font-semibold">Set a reminder</Text>
          <Text variant="muted" className="text-xs">
            (optional)
          </Text>
        </View>

        <View className="flex-row justify-between items-center p-3 rounded-xl bg-primary/5">
          <View className="flex-row flex-1 gap-3 items-center">
            <Icon as={Bell} size={20} className="text-primary" />
            <View className="flex-1">
              <Text className="font-medium">Daily notifications</Text>
              <Text variant="muted" className="text-xs">
                Never miss your habit
              </Text>
            </View>
          </View>
          <Switch
            checked={reminderEnabled}
            onCheckedChange={function onToggle(checked) {
              setReminderEnabled(Boolean(checked));
            }}
          />
        </View>

        {reminderEnabled && (
          <View className="gap-2">
            <Label className="text-xs">Reminder time (24h format)</Label>
            <Input
              placeholder="20:00"
              value={reminderTime}
              onChangeText={setReminderTime}
            />
            <Text variant="muted" className="text-xs">
              ⏰ We'll remind you at {reminderTime || "your chosen time"} every
              day
            </Text>
          </View>
        )}
      </View>

      {/* Create Button */}
      <View className="gap-3">
        <Button onPress={handleSave} disabled={hasError || isSaving} size="lg">
          <Icon as={CheckCircle2} size={20} />
          <Text className="text-base font-semibold">
            {isSaving ? "Creating your habit..." : "Create Habit"}
          </Text>
        </Button>

        {hasError && (
          <Text variant="muted" className="text-xs text-center">
            Please fill in the habit name and select a target
          </Text>
        )}
      </View>
    </ScrollView>
  );
}
