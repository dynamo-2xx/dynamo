import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import type { User } from "@supabase/supabase-js";

/**
 * §1 Auth: gate account-bound actions on email verification.
 * Returns true if verified (OK to proceed), false if blocked (toast shown).
 */
export const requireVerified = (user: User | null, action = "do this"): boolean => {
  if (!user) {
    toast({
      title: "Sign in required",
      description: `You need an account to ${action}.`,
      variant: "destructive",
    });
    return false;
  }
  if (!user.email_confirmed_at && !user.confirmed_at) {
    toast({
      title: "Verify your email",
      description: `Check your inbox to ${action}.`,
      variant: "destructive",
    });
    return false;
  }
  return true;
};

export const isVerified = (user: User | null): boolean =>
  !!user && !!(user.email_confirmed_at || (user as any).confirmed_at);

let lastResend = 0;
export const resendVerification = async (email: string): Promise<boolean> => {
  const now = Date.now();
  if (now - lastResend < 60_000) {
    toast({
      title: "Please wait",
      description: "You can resend once per minute.",
    });
    return false;
  }
  lastResend = now;
  const { error } = await supabase.auth.resend({ type: "signup", email });
  if (error) {
    toast({ title: "Couldn't resend", description: error.message, variant: "destructive" });
    return false;
  }
  toast({ title: "Verification email sent", description: "Check your inbox." });
  return true;
};