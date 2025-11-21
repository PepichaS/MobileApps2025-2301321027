import { Button } from "@/components/ui/Button";
import { Moon, Sun } from "lucide-react-native";
import { useColorScheme } from "nativewind";
import { Icon } from "@/components/ui/Icon";

const THEME_TOGGLE_ICONS = {
  light: <Icon as={Sun} size={22} />,
  dark: <Icon as={Moon} size={22} />,
};

export function ThemeToggle() {
  const { colorScheme, setColorScheme } = useColorScheme();

  function toggleColorScheme() {
    const newTheme = colorScheme === "dark" ? "light" : "dark";
    setColorScheme(newTheme);
  }

  return (
    <Button
      onPress={toggleColorScheme}
      variant="ghost"
      size="icon"
      className="mx-2 rounded-full size-9"
    >
      {THEME_TOGGLE_ICONS[colorScheme as keyof typeof THEME_TOGGLE_ICONS]}
    </Button>
  );
}
