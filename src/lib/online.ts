import { toast } from "@/hooks/use-toast";

/**
 * §13: Block writes when offline. Call before any mutation; returns true if OK to proceed.
 */
export const requireOnline = (): boolean => {
  if (typeof navigator !== "undefined" && navigator.onLine === false) {
    toast({
      title: "You're offline",
      description: "Try again when you're back online.",
      variant: "destructive",
    });
    return false;
  }
  return true;
};

export const isOnline = () =>
  typeof navigator === "undefined" ? true : navigator.onLine;