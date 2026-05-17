import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

/**
 * §15 Trust & Safety — Client wrapper around content_reports inserts.
 * Surfaces friendly errors for the per-user 24h rate limit.
 */
export type ReportTargetType =
  | "message" | "transcript_entry" | "debate" | "live_session" | "change_my_mind"
  | "profile" | "club" | "club_event" | "notebook" | "my_take" | "comment";

export type ReportReason =
  | "spam" | "harassment" | "hate" | "sexual" | "violence"
  | "misinformation" | "self_harm" | "other";

export interface ReportInput {
  targetType: ReportTargetType;
  targetId: string;
  reason: ReportReason;
  details?: string;
  severity?: 1 | 2 | 3 | 4 | 5;
}

export async function reportContent(input: ReportInput): Promise<boolean> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    toast({ title: "Sign in to report", variant: "destructive" });
    return false;
  }
  const { error } = await supabase
    .from("content_reports" as any)
    .insert({
      reporter_id: user.id,
      target_type: input.targetType,
      target_id: input.targetId,
      reason: input.reason,
      details: input.details ?? null,
      severity: input.severity ?? 1,
    } as any);
  if (error) {
    const msg = /rate limit/i.test(error.message)
      ? "You've filed a lot of reports today. Try again later."
      : error.message;
    toast({ title: "Couldn't file report", description: msg, variant: "destructive" });
    return false;
  }
  toast({ title: "Report received", description: "Our team will review it." });
  return true;
}