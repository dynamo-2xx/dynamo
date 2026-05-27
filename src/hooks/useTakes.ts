import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface Take {
  id: string;
  author_id: string;
  body: string;
  like_count: number;
  comment_count: number;
  is_public: boolean;
  location: string | null;
  created_at: string;
  // hydrated
  author_name?: string | null;
  author_username?: string | null;
  author_avatar?: string | null;
}

export function useTakeCreate() {
  const { user } = useAuth();
  const [busy, setBusy] = useState(false);

  const createTake = useCallback(
    async (body: string): Promise<Take | null> => {
      if (!user) return null;
      const trimmed = body.trim();
      if (!trimmed) return null;
      setBusy(true);
      try {
        // snapshot author location if available
        const { data: prof } = await supabase
          .from("profiles")
          .select("location")
          .eq("user_id", user.id)
          .maybeSingle();

        const { data, error } = await supabase
          .from("takes" as any)
          .insert({
            author_id: user.id,
            body: trimmed,
            location: prof?.location ?? null,
          })
          .select("*")
          .single();
        if (error) throw error;
        return data as any;
      } finally {
        setBusy(false);
      }
    },
    [user],
  );

  return { createTake, busy };
}

export async function hydrateTakeAuthors(takes: Take[]): Promise<Take[]> {
  const ids = Array.from(new Set(takes.map((t) => t.author_id)));
  if (ids.length === 0) return takes;
  const { data } = await supabase
    .from("profiles")
    .select("user_id, display_name, username, avatar_url")
    .in("user_id", ids);
  const byId = new Map<string, any>();
  (data || []).forEach((p: any) => byId.set(p.user_id, p));
  return takes.map((t) => {
    const p = byId.get(t.author_id);
    return {
      ...t,
      author_name: p?.display_name ?? p?.username ?? null,
      author_username: p?.username ?? null,
      author_avatar: p?.avatar_url ?? null,
    };
  });
}