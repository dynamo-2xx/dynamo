import { supabase } from "@/integrations/supabase/client";

export type NotificationType =
  | "interest_received"
  | "time_proposed"
  | "interest_confirmed"
  | "time_counter_proposed"
  | "invitation"
  | "session_started"
  | "direct_message"
  | "generic";

export interface CreateNotificationInput {
  recipient_id: string;
  actor_id?: string | null;
  debate_id?: string | null;
  interest_id?: string | null;
  type: NotificationType;
  title: string;
  body?: string | null;
  metadata?: Record<string, unknown>;
}

/**
 * Insert a notification row. RLS allows any authenticated user to create
 * notifications for any recipient, which is required for cross-user pings.
 */
export async function createNotification(input: CreateNotificationInput) {
  const { error } = await (supabase as any).from("notifications").insert({
    recipient_id: input.recipient_id,
    actor_id: input.actor_id ?? null,
    debate_id: input.debate_id ?? null,
    interest_id: input.interest_id ?? null,
    type: input.type,
    title: input.title,
    body: input.body ?? null,
    metadata: input.metadata ?? {},
  });
  if (error) console.error("createNotification:", error);
  return !error;
}
