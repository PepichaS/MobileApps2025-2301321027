import { useEffect, useState } from "react";

export type InlineAlertVariant = "default" | "destructive";

export type InlineAlertState =
  | {
      variant: InlineAlertVariant;
      title: string;
      message: string;
    }
  | null;

export function useInlineAlert() {
  const [inlineAlert, setInlineAlert] = useState<InlineAlertState>(null);
  const [timeoutId, setTimeoutId] = useState<ReturnType<
    typeof setTimeout
  > | null>(null);

  function showInlineAlert(
    variant: InlineAlertVariant,
    title: string,
    message: string
  ) {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }

    setInlineAlert({
      variant,
      title,
      message,
    });

    const id = setTimeout(() => {
      setInlineAlert(null);
    }, 3000);

    setTimeoutId(id);
  }

  function clearInlineAlert() {
    setInlineAlert(null);
    if (timeoutId) {
      clearTimeout(timeoutId);
      setTimeoutId(null);
    }
  }

  useEffect(() => {
    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [timeoutId]);

  return {
    inlineAlert,
    showInlineAlert,
    clearInlineAlert,
  };
}


