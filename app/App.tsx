import { StatusBar } from "expo-status-bar";
import { View } from "react-native";
import { PortalHost } from "@rn-primitives/portal";
import "./global.css";
import { Button } from "@/components/ui/Button";
import { Text } from "@/components/ui/Text";

export default function App() {
  return (
    <View className="flex-1 justify-center items-center bg-white">
      <Text className="mx-4 text-xl font-bold text-center">
        Open up App.tsx to start working on your app!
      </Text>
      <StatusBar style="auto" />
      <PortalHost />
    </View>
  );
}
