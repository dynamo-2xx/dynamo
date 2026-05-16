import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type ShareableRecordType = "debate" | "change_my_mind" | "live_session" | "notebook";
export type ShareRole = "viewer" | "co_owner";

export interface RecordShareRow {
  id: string;
  record_type: ShareableRecordType;
  record_id: string;
  user_id: string;
  role: ShareRole;
  invited_by: string | null;
  invited_at: string;
  accepted_at: string | null;
}

export interface ProfileCard {
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
  affiliation: string | null;
}

/** Hook: list shares for a record, invite users, generate link, revoke. */
export function useRecordSharing(type: ShareableRecordType, id: string | null | undefined) {
  const [shares, setShares] = useState<RecordShareRow[]>([]);
  const [profiles, setProfiles] = useState<Record<string, ProfileCard>>({});
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("record_shares")
      .select("*")
      .eq("record_type", type)
      .eq("record_id", id);
    if (error) {
      console.error(error);
    } else {
      setShares((data || []) as RecordShareRow[]);
      const ids = Array.from(new Set((data || []).map((r: any) => r.user_id)));
      if (ids.length) {
        const { data: profs } = await supabase
          .from("profiles")
          .select("user_id, display_name, avatar_url, affiliation")
          .in("user_id", ids);
        const map: Record<string, ProfileCard> = {};
        (profs || []).forEach((p: any) => { map[p.user_id] = p; });
        setProfiles(map);
      }
    }
    setLoading(false);
  }, [type, id]);

  useEffect(() => { refresh(); }, [refresh]);

  const shareWithUser = useCallback(async (userId: string, role: ShareRole) => {
    if (!id) return;
    const { error } = await supabase.rpc("share_record_with_user", {
      _type: type, _id: id, _user_id: userId, _role: role,
    });
    if (error) { toast.error(error.message); return; }
    toast.success(role === "co_owner" ? "Invited as co-owner" : "Shared as viewer");
    refresh();
  }, [type, id, refresh]);

  const removeShare = useCallback(async (userId: string) => {
    if (!id) return;
    const { error } = await supabase
      .from("record_shares")
      .delete()
      .eq("record_type", type)
      .eq("record_id", id)
      .eq("user_id", userId);
    if (error) { toast.error(error.message); return; }
    toast.success("Access removed");
    refresh();
  }, [type, id, refresh]);

  const generateLink = useCallback(async (role: ShareRole): Promise<string | null> => {
    if (!id) return null;
    const { data, error } = await supabase.rpc("create_record_share_invitation", {
      _type: type, _id: id, _role: role,
    });
    if (error || !data || !data.length) { toast.error(error?.message || "Could not create link"); return null; }
    const token = (data[0] as any).invite_token as string;
    return `${window.location.origin}/share/${token}`;
  }, [type, id]);

  return { shares, profiles, loading, refresh, shareWithUser, removeShare, generateLink };
}

/** Search users by name/email via existing RPC. */
export async function searchUsersForSharing(q: string): Promise<ProfileCard[]> {
  if (!q || q.trim().length < 2) return [];
  const { data } = await supabase.rpc("search_profile_cards", { _q: q, _limit: 8 });
  return (data || []) as ProfileCard[];
}