import React, { useCallback, useMemo, useState, useEffect } from "react";
import { Image, ScrollView, View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Button } from "@/components/ui/Button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/Alert";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/AlertDialog";
import { Text } from "@/components/ui/Text";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Switch } from "@/components/ui/Switch";
import type { Habit, HabitProof } from "@/models/Habit";
import {
  deleteHabit,
  loadHabits,
  updateHabit,
  addHabitProof,
} from "@/storage/HabitStorage";
import {
  cancelHabitReminder,
  scheduleHabitReminder,
} from "@/services/NotificationService";
import {
  AlertCircle,
  Camera,
  Check,
  CheckCircle2,
  Circle,
  Edit,
  Flame,
  Loader2,
  MapPin,
  Trash2,
} from "lucide-react-native";
import { useInlineAlert } from "@/hooks/useInlineAlert";
import { Textarea } from "@/components/ui/Textarea";
import { Icon } from "@/components/ui/Icon";
import * as ImagePicker from "expo-image-picker";
import * as Location from "expo-location";

function getTodayKey(): string {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getPreviousDayKey(key: string): string {
  const [yearString, monthString, dayString] = key.split("-");
  const year = Number(yearString);
  const month = Number(monthString);
  const day = Number(dayString);

  const date = new Date(year, month - 1, day);
  date.setDate(date.getDate() - 1);

  const previousYear = date.getFullYear();
  const previousMonth = String(date.getMonth() + 1).padStart(2, "0");
  const previousDay = String(date.getDate()).padStart(2, "0");

  return `${previousYear}-${previousMonth}-${previousDay}`;
}

function computeConsecutiveStreakFrom(
  startKey: string,
  completedDays: Set<string>
): number {
  let streak = 0;
  let currentKey = startKey;

  while (completedDays.has(currentKey)) {
    streak += 1;
    currentKey = getPreviousDayKey(currentKey);
  }

  return streak;
}

function computeStreak(history: string[]): number {
  if (history.length === 0) {
    return 0;
  }

  const completedDays = new Set(history);
  const todayKey = getTodayKey();

  if (completedDays.has(todayKey)) {
    // User has completed today: streak is consecutive days ending at today.
    return computeConsecutiveStreakFrom(todayKey, completedDays);
  }

  // No completed today: streak is consecutive days ending at the most recent completed.
  const sortedKeys = Array.from(completedDays).sort();
  const lastKey = sortedKeys[sortedKeys.length - 1];

  return computeConsecutiveStreakFrom(lastKey, completedDays);
}

function formatTime(isoString: string): string {
  const date = new Date(isoString);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");

  return `${hours}:${minutes}`;
}

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

export default function HabitDetails() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();

  const [habit, setHabit] = useState<Habit | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isUpdating, setIsUpdating] = useState<boolean>(false);
  const [isAddingProof, setIsAddingProof] = useState<boolean>(false);
  const { inlineAlert, showInlineAlert } = useInlineAlert();
  const [reminderEnabled, setReminderEnabled] = useState(false);
  const [reminderTime, setReminderTime] = useState("20:00");
  const [isEditingInfo, setIsEditingInfo] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editGoalDays, setEditGoalDays] = useState("");

  const todayKey = getTodayKey();

  const isCompletedToday = useMemo(() => {
    if (!habit) {
      return false;
    }

    return habit.history.includes(todayKey);
  }, [habit, todayKey]);

  useEffect(
    function syncReminderFromHabit() {
      if (!habit) {
        setReminderEnabled(false);
        setIsEditingInfo(false);
        return;
      }

      if (habit.reminder) {
        setReminderEnabled(habit.reminder.enabled);
        setReminderTime(habit.reminder.time);
      } else {
        setReminderEnabled(false);
      }

      // When a new habit is loaded, keep the latest data ready for editing.
      setEditTitle(habit.title);
      setEditDescription(habit.description ?? "");
      setEditGoalDays(String(habit.goalDays));
    },
    [habit]
  );

  async function refreshHabit() {
    if (!id) {
      setHabit(null);
      return;
    }

    try {
      setIsLoading(true);
      const habits = await loadHabits();
      const foundHabit = habits.find(function findHabit(item) {
        return item.id === id;
      });

      setHabit(foundHabit ?? null);
    } finally {
      setIsLoading(false);
    }
  }

  useFocusEffect(
    useCallback(() => {
      void refreshHabit();
    }, [id])
  );

  async function handleToggleToday() {
    if (!habit || isUpdating) {
      return;
    }

    const proofsForToday = habit.proofsByDate?.[todayKey] ?? [];

    if (habit.history.includes(todayKey) && proofsForToday.length > 0) {
      showInlineAlert(
        "destructive",
        "Cannot unmark today",
        "Remove today’s proofs first before unmarking this habit."
      );
      return;
    }

    try {
      setIsUpdating(true);

      const alreadyCompleted = habit.history.includes(todayKey);

      const nextHistory = alreadyCompleted
        ? habit.history.filter(function filterHistory(date) {
            return date !== todayKey;
          })
        : [...habit.history, todayKey];

      const nextCompletionTimesByDate = {
        ...(habit.completionTimesByDate ?? {}),
      };

      if (alreadyCompleted) {
        // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
        delete nextCompletionTimesByDate[todayKey];
      } else {
        nextCompletionTimesByDate[todayKey] = new Date().toISOString();
      }

      const updatedHabit: Habit = {
        ...habit,
        history: nextHistory,
        currentStreak: computeStreak(nextHistory),
        completionTimesByDate: nextCompletionTimesByDate,
      };

      setHabit(updatedHabit);
      await updateHabit(updatedHabit);

      showInlineAlert(
        "default",
        alreadyCompleted ? "Marked as incomplete" : "Marked as done",
        alreadyCompleted
          ? "Today has been unmarked for this habit."
          : "Nice work! Today is now counted towards your streak."
      );
    } catch (error) {
      console.error("Failed to update habit", error);
      showInlineAlert(
        "destructive",
        "Update failed",
        "We could not update this habit right now. Please try again."
      );
    } finally {
      setIsUpdating(false);
    }
  }

  async function handleAddTodayProof() {
    if (!habit || isAddingProof) {
      return;
    }

    try {
      setIsAddingProof(true);

      const cameraPermission =
        await ImagePicker.requestCameraPermissionsAsync();

      if (cameraPermission.status !== "granted") {
        showInlineAlert(
          "destructive",
          "Camera permission denied",
          "We need camera access to attach a photo as proof."
        );
        return;
      }

      const photoResult = await ImagePicker.launchCameraAsync({
        quality: 0.7,
        base64: false,
      });

      if (
        photoResult.canceled ||
        !photoResult.assets ||
        photoResult.assets.length === 0
      ) {
        showInlineAlert(
          "destructive",
          "No photo captured",
          "We could not capture a photo. Please try again."
        );
        return;
      }

      const asset = photoResult.assets[0];

      let proofLocation: { latitude: number; longitude: number } | undefined;

      try {
        const locationPermission =
          await Location.requestForegroundPermissionsAsync();

        if (locationPermission.status === "granted") {
          const currentLocation = await Location.getCurrentPositionAsync({});
          proofLocation = {
            latitude: currentLocation.coords.latitude,
            longitude: currentLocation.coords.longitude,
          };
        }
      } catch (locationError) {
        console.error("Failed to get location for habit proof", locationError);
      }

      const proof: HabitProof = {
        photoUri: asset.uri,
        location: proofLocation,
        createdAt: new Date().toISOString(),
      };

      await addHabitProof(habit.id, todayKey, proof);
      await refreshHabit();

      showInlineAlert(
        "default",
        "Proof added",
        "Your photo and location (if available) were attached for today."
      );
    } catch (error) {
      console.error("Failed to add habit proof", error);
      showInlineAlert(
        "destructive",
        "Could not add proof",
        "We could not attach proof for this habit today. Please try again."
      );
    } finally {
      setIsAddingProof(false);
    }
  }

  async function handleDeleteTodayProof(index: number) {
    if (!habit || isUpdating) {
      return;
    }

    const existingProofsByDate = habit.proofsByDate ?? {};
    const proofsForDay = existingProofsByDate[todayKey] ?? [];

    if (index < 0 || index >= proofsForDay.length) {
      return;
    }

    const nextProofsForDay = proofsForDay.filter(function filterProofs(_, i) {
      return i !== index;
    });

    const nextProofsByDate: Habit["proofsByDate"] = { ...existingProofsByDate };

    if (nextProofsForDay.length > 0) {
      nextProofsByDate[todayKey] = nextProofsForDay;
    } else {
      // Remove the key entirely if there are no proofs left for today.
      // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
      delete nextProofsByDate[todayKey];
    }

    try {
      setIsUpdating(true);

      const updatedHabit: Habit = {
        ...habit,
        proofsByDate: nextProofsByDate,
      };

      await updateHabit(updatedHabit);
      setHabit(updatedHabit);

      showInlineAlert(
        "default",
        "Proof deleted",
        "The selected proof has been removed for today."
      );
    } catch (error) {
      console.error("Failed to delete habit proof", error);
      showInlineAlert(
        "destructive",
        "Delete failed",
        "We could not delete this proof right now. Please try again."
      );
    } finally {
      setIsUpdating(false);
    }
  }

  async function handleDeleteHabit() {
    if (!habit) {
      return;
    }

    try {
      if (habit.reminderNotificationId) {
        await cancelHabitReminder(habit.reminderNotificationId);
      }

      await deleteHabit(habit.id);
      router.back();
    } catch (error) {
      console.error("Failed to delete habit", error);
      showInlineAlert(
        "destructive",
        "Delete failed",
        "We could not delete this habit right now. Please try again."
      );
    }
  }

  async function handleSaveHabitInfo() {
    if (!habit) {
      return;
    }

    const cleanedTitle = editTitle.trim();
    const cleanedDescription = editDescription.trim();
    const parsedGoalDays = Number(editGoalDays);

    if (!cleanedTitle || Number.isNaN(parsedGoalDays) || parsedGoalDays <= 0) {
      showInlineAlert(
        "destructive",
        "Check habit info",
        "Please enter a name and a positive number of target days."
      );
      return;
    }

    try {
      setIsUpdating(true);

      const updatedHabit: Habit = {
        ...habit,
        title: cleanedTitle,
        description: cleanedDescription || undefined,
        goalDays: parsedGoalDays,
      };

      await updateHabit(updatedHabit);
      setHabit(updatedHabit);
      setIsEditingInfo(false);

      showInlineAlert(
        "default",
        "Habit updated",
        "The habit information has been saved."
      );
    } catch (error) {
      console.error("Failed to update habit info", error);
      showInlineAlert(
        "destructive",
        "Update failed",
        "We could not update this habit right now. Please try again."
      );
    } finally {
      setIsUpdating(false);
    }
  }

  function handleStartEditInfo() {
    if (!habit) {
      return;
    }

    setEditTitle(habit.title);
    setEditDescription(habit.description ?? "");
    setEditGoalDays(String(habit.goalDays));
    setIsEditingInfo(true);
  }

  function handleCancelEditInfo() {
    if (!habit) {
      setIsEditingInfo(false);
      return;
    }

    setEditTitle(habit.title);
    setEditDescription(habit.description ?? "");
    setEditGoalDays(String(habit.goalDays));
    setIsEditingInfo(false);
  }

  async function handleSaveReminder() {
    if (!habit) {
      return;
    }

    const cleanedTime = reminderTime.trim();

    if (reminderEnabled && !isValidTimeString(cleanedTime)) {
      showInlineAlert(
        "destructive",
        "Check reminder time",
        "Please enter a valid reminder time in 24h format, e.g. 08:30 or 20:00."
      );
      return;
    }

    try {
      setIsUpdating(true);

      let nextNotificationId: string | null =
        habit.reminderNotificationId ?? null;

      if (habit.reminderNotificationId) {
        await cancelHabitReminder(habit.reminderNotificationId);
        nextNotificationId = null;
      }

      if (reminderEnabled && isValidTimeString(cleanedTime)) {
        const scheduledId = await scheduleHabitReminder(habit.id, habit.title, {
          time: cleanedTime,
          enabled: true,
        });

        nextNotificationId = scheduledId ?? null;

        if (!scheduledId) {
          showInlineAlert(
            "destructive",
            "Notifications disabled",
            "We could not enable a reminder for this habit. Please check your notification permissions."
          );
        }
      }

      const updatedHabit: Habit = {
        ...habit,
        reminder: reminderEnabled
          ? {
              time: cleanedTime,
              enabled: true,
            }
          : undefined,
        reminderNotificationId: nextNotificationId,
      };

      await updateHabit(updatedHabit);
      setHabit(updatedHabit);

      showInlineAlert(
        "default",
        "Reminder updated",
        "The reminder settings for this habit have been saved."
      );
    } catch (error) {
      console.error("Failed to update reminder", error);
      showInlineAlert(
        "destructive",
        "Reminder update failed",
        "We could not update the reminder right now. Please try again."
      );
    } finally {
      setIsUpdating(false);
    }
  }

  function renderContent() {
    if (isLoading) {
      return <Text variant="muted">Loading habit...</Text>;
    }

    if (!habit) {
      return (
        <>
          {inlineAlert && (
            <Alert
              variant={inlineAlert.variant}
              icon={
                inlineAlert.variant === "destructive"
                  ? AlertCircle
                  : CheckCircle2
              }
              className="mb-4"
            >
              <AlertTitle>{inlineAlert.title}</AlertTitle>
              <AlertDescription>{inlineAlert.message}</AlertDescription>
            </Alert>
          )}

          <Text variant="muted">
            This habit could not be found. It may have been deleted.
          </Text>
        </>
      );
    }

    return (
      <>
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

        {isEditingInfo ? (
          <View className="gap-4 p-4 mb-6 rounded-2xl border border-border bg-card">
            <View className="flex-row justify-between items-center">
              <Text className="text-lg font-semibold">Edit Habit</Text>
              <Icon as={Edit} size={20} className="text-muted-foreground" />
            </View>

            <View className="gap-2">
              <Label>Habit name</Label>
              <Input
                value={editTitle}
                onChangeText={setEditTitle}
                placeholder="Habit title"
              />
            </View>

            <View className="gap-2">
              <Label>Description (optional)</Label>
              <Textarea
                value={editDescription}
                onChangeText={setEditDescription}
                placeholder="Why is this habit important?"
              />
            </View>

            <View className="gap-2">
              <Label>Target days</Label>
              <Input
                value={editGoalDays}
                onChangeText={setEditGoalDays}
                keyboardType="number-pad"
              />
            </View>

            <View className="flex-row gap-3 mt-2">
              <Button
                onPress={handleSaveHabitInfo}
                disabled={isUpdating}
                className="flex-1"
              >
                <Text>Save Changes</Text>
              </Button>
              <Button
                variant="outline"
                disabled={isUpdating}
                onPress={handleCancelEditInfo}
                className="flex-1"
              >
                <Text>Cancel</Text>
              </Button>
            </View>
          </View>
        ) : (
          <View className="gap-4 mb-6">
            {/* Header Card */}
            <View className="p-5 rounded-2xl border border-border bg-card">
              <Text className="mb-2 text-2xl font-bold">{habit.title}</Text>

              {habit.description && (
                <Text variant="muted" className="mb-4">
                  {habit.description}
                </Text>
              )}

              {/* Stats Grid */}
              <View className="flex-row gap-3 mb-4">
                <View className="flex-1 p-3 rounded-xl bg-primary/5">
                  <Text variant="muted" className="mb-1 text-xs">
                    Progress
                  </Text>
                  <Text className="text-xl font-bold">
                    {habit.history.length}/{habit.goalDays}
                  </Text>
                  <Text variant="muted" className="text-xs">
                    days
                  </Text>
                </View>

                {habit.currentStreak > 0 && (
                  <View className="flex-1 p-3 rounded-xl bg-destructive/10">
                    <View className="flex-row gap-1 items-center mb-1">
                      <Icon as={Flame} size={12} className="text-destructive" />
                      <Text variant="muted" className="text-xs">
                        Streak
                      </Text>
                    </View>
                    <Text className="text-xl font-bold text-destructive">
                      {habit.currentStreak}
                    </Text>
                    <Text variant="muted" className="text-xs">
                      days
                    </Text>
                  </View>
                )}
              </View>

              <Button
                variant="outline"
                onPress={handleStartEditInfo}
                disabled={isUpdating}
                size="sm"
              >
                <Icon as={Edit} size={16} />
                <Text>Edit Details</Text>
              </Button>
            </View>
          </View>
        )}

        {/* Today's Completion - Prominent */}
        <View className="gap-4 mb-6">
          <View
            className={`p-5 rounded-2xl border-2 ${
              isCompletedToday
                ? "bg-primary/5 border-primary/30"
                : "bg-card border-border"
            }`}
          >
            <View className="flex-row justify-between items-center mb-3">
              <Text className="text-lg font-semibold">Today's Habit</Text>
              {isCompletedToday && (
                <View className="flex-row gap-1 items-center px-3 py-1 rounded-full bg-primary/10">
                  <Icon as={Check} size={12} className="text-primary" />
                  <Text className="text-xs font-bold text-primary">Done</Text>
                </View>
              )}
            </View>

            {habit.completionTimesByDate?.[todayKey] && (
              <Text variant="muted" className="mb-3 text-xs">
                Completed at{" "}
                {formatTime(habit.completionTimesByDate[todayKey]!)}
              </Text>
            )}

            <Button
              onPress={handleToggleToday}
              disabled={
                isUpdating ||
                (isCompletedToday &&
                  Boolean(habit.proofsByDate?.[todayKey]?.length))
              }
              variant={isCompletedToday ? "secondary" : "default"}
              size="lg"
              className="mb-3"
            >
              <Icon
                as={isCompletedToday ? CheckCircle2 : Circle}
                size={20}
                className={isCompletedToday ? "":"text-primary-foreground"}
              />
              <Text>{isCompletedToday ? "Completed!" : "Mark as Done"}</Text>
            </Button>

            {isCompletedToday && (
              <Button
                variant="outline"
                disabled={isUpdating || isAddingProof}
                onPress={handleAddTodayProof}
                size="lg"
                className="bg-primary/5"
              >
                {isAddingProof ? (
                  <>
                    <Icon
                      as={Loader2}
                      size={20}
                      className="animate-spin text-primary-foreground"
                    />
                    <Text>Adding Proof...</Text>
                  </>
                ) : (
                  <>
                    <Icon as={Camera} size={20} />
                    <Text>Add Photo + GPS Proof</Text>
                  </>
                )}
              </Button>
            )}

            {!isCompletedToday && (
              <Text variant="muted" className="mt-2 text-xs text-center">
                Complete today's habit to add photo proof
              </Text>
            )}
          </View>

          {/* Today's Proofs Gallery */}
          {habit.proofsByDate?.[todayKey] &&
            habit.proofsByDate[todayKey]!.length > 0 && (
              <View className="p-4 pb-2 rounded-2xl border border-primary/20 bg-primary/5">
                <View className="flex-row justify-between items-center mb-2.5">
                  <View className="flex-row gap-2 items-center">
                    <Icon as={Camera} size={18} className="text-primary" />
                    <Text className="font-semibold">Today's Proofs</Text>
                  </View>
                  <View className="px-2 py-1 rounded-full bg-primary/20">
                    <Text className="text-xs font-bold text-primary">
                      {habit.proofsByDate[todayKey]!.length}
                    </Text>
                  </View>
                </View>

                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  className="py-3"
                >
                  <View className="flex-row gap-3 last:mr-2">
                    {habit.proofsByDate[todayKey]!.map(
                      function mapProof(proof, index) {
                        return (
                          <View
                            key={`${proof.createdAt}-${index}`}
                            className="relative"
                          >
                            {proof.photoUri && (
                              <Image
                                source={{ uri: proof.photoUri }}
                                className="w-32 h-32 rounded-xl bg-muted"
                                resizeMode="cover"
                              />
                            )}

                            {/* Overlay Info */}
                            <View className="absolute right-0 bottom-0 left-0 p-2 py-1.5 rounded-b-xl bg-black/70">
                              <Text className="text-white text-[10px] font-medium">
                                {formatTime(proof.createdAt)}
                              </Text>
                              {proof.location && (
                                <View className="flex-row items-center gap-1 mt-0.5">
                                  <Icon
                                    as={MapPin}
                                    size={10}
                                    className="text-white"
                                  />
                                  <Text className="text-white text-[9px]">
                                    {proof.location.latitude.toFixed(3)},{" "}
                                    {proof.location.longitude.toFixed(3)}
                                  </Text>
                                </View>
                              )}
                            </View>

                            {/* Delete Button */}
                            <Button
                              variant="destructive"
                              className="absolute -top-2 -right-2 justify-center items-center w-8 h-8 rounded-full bg-destructive/90 border-destructive"
                              disabled={isUpdating}
                              onPress={function onPress() {
                                void handleDeleteTodayProof(index);
                              }}
                            >
                              <Icon
                                as={Trash2}
                                className="text-white"
                                size={14}
                              />
                            </Button>
                          </View>
                        );
                      }
                    )}
                  </View>
                </ScrollView>
              </View>
            )}
        </View>

        {/* Reminder Settings */}
        <View className="gap-3 p-4 mb-6 rounded-2xl border border-border bg-card">
          <View className="flex-row justify-between items-center">
            <View className="flex-1">
              <Text className="mb-1 font-semibold">Daily Reminder</Text>
              <Text variant="muted" className="text-xs">
                Get notified at a specific time each day
              </Text>
            </View>
            <Switch
              checked={reminderEnabled}
              onCheckedChange={function onToggle(checked) {
                setReminderEnabled(Boolean(checked));
              }}
            />
          </View>

          {reminderEnabled && (
            <>
              <View className="gap-2">
                <Label className="text-xs">Time (24h format)</Label>
                <Input
                  placeholder="08:30"
                  value={reminderTime}
                  onChangeText={setReminderTime}
                  editable={reminderEnabled}
                />
              </View>
              {habit.reminder?.enabled && (
                <Text variant="muted" className="text-xs">
                  Current: {habit.reminder.time}
                </Text>
              )}
              <Button
                variant="outline"
                disabled={isUpdating}
                onPress={handleSaveReminder}
                size="sm"
              >
                <Text>Save Reminder</Text>
              </Button>
            </>
          )}
        </View>

        {/* Danger Zone */}
        <View className="p-4 rounded-2xl border border-destructive/30 bg-destructive/5">
          <Text className="mb-2 font-semibold text-destructive">
            Danger Zone
          </Text>
          <Text variant="muted" className="mb-3 text-xs">
            Deleting this habit will remove all progress and proofs permanently
          </Text>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" size="sm">
                <Icon as={Trash2} size={16} className="text-white" />
                <Text>Delete Habit</Text>
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete habit?</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to delete "{habit?.title}"? This will
                  permanently remove all progress, proofs, and cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>
                  <Text>Cancel</Text>
                </AlertDialogCancel>
                <AlertDialogAction
                  onPress={function onPress() {
                    void handleDeleteHabit();
                  }}
                >
                  <Text>Delete</Text>
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </View>
      </>
    );
  }

  return (
    <ScrollView
      className="flex-1 bg-background"
      contentContainerClassName="px-4 py-6"
    >
      {renderContent()}
    </ScrollView>
  );
}
