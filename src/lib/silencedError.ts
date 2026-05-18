import { toast } from "@/hooks/use-toast";

/**
 * §15 Trust & Safety — translates the `check_violation` raised by the
 * `enforce_user_not_silenced()` trigger into a friendly toast.
 * Returns true if the error was handled as a silence error.
 */
export function handleSilencedError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const e = error as { code?: string; message?: string };
  const isSilenced =
    e.code === "23514" ||
    /silenced|muted|suspended|banned|check_violation/i.test(e.message || "");
  if (!isSilenced) return false;
  toast({
    title: "Account temporarily restricted",
    description:
      "You can't post right now because your account is muted, suspended, or banned. Check your email or settings for details.",
    variant: "destructive",
  });
  return true;
}