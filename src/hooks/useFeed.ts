import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { hydrateTakeAuthors, type Take } from "./useTakes";

export type FeedMode = "for_you" | "local";

export interface FeedNotebook {
  id: string;
  user_id: string;
  record_type: "live_session" | "debate" | "change_my_mind" | "imported_record";
  record_id: string;
  display_title: string | null;
  my_take: string | null;
  thoughts: any;
  publish_caption: string | null;
  share_token: string | null;
  published_at: string;
  created_at: string;
  author_name?: string | null;
  author_avatar?: string | null;
}

export type FeedItem =
  | { kind: "take"; sortKey: string; data: Take }
  | { kind: "notebook"; sortKey: string; data: FeedNotebook };

const PAGE = 20;

export function useFeed(mode: FeedMode) {
  const { user } = useAuth();
  const [items, setItems] = useState<FeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);
  const [cursor, setCursor] = useState<string | null>(null);
  const [viewerLocation, setViewerLocation] = useState<string | null>(null);
  const [followIds, setFollowIds] = useState<string[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!user) return;
      const [{ data: prof }, { data: follows }] = await Promise.all([
        supabase.from("profiles").select("location").eq("user_id", user.id).maybeSingle(),
        supabase.from("connections").select("followed_id").eq("follower_id", user.id),
      ]);
      if (cancelled) return;
      setViewerLocation(prof?.location ?? null);
      setFollowIds((follows || []).map((r: any) => r.followed_id));
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  const load = useCallback(
    async (reset = false) => {
      setLoading(true);
      const before = reset ? null : cursor;

      // Pull takes
      let takesQ = supabase
        .from("takes" as any)
        .select("*")
        .eq("is_public", true)
        .order("created_at", { ascending: false })
        .limit(PAGE);
      if (before) takesQ = takesQ.lt("created_at", before);
      if (mode === "local" && viewerLocation) {
        takesQ = takesQ.eq("location", viewerLocation);
      }

      // Pull notebooks
      let nbQ = supabase
        .from("session_notebooks" as any)
        .select(
          "id,user_id,record_type,record_id,display_title,my_take,thoughts,publish_caption,share_token,published_at,created_at",
        )
        .eq("published", true)
        .is("deleted_at", null)
        .order("published_at", { ascending: false })
        .limit(PAGE);
      if (before) nbQ = nbQ.lt("published_at", before);

      const [{ data: takesRaw }, { data: nbRaw }] = await Promise.all([takesQ, nbQ]);
      let takesData = ((takesRaw as any) || []) as Take[];
      let nbData = ((nbRaw as any) || []) as FeedNotebook[];

      // For-you: prefer follows + global popular (we just include all globally; followed bubbles)
      // Local: for notebooks, filter to authors whose profile.location matches viewer
      if (mode === "local" && viewerLocation && nbData.length) {
        const authorIds = Array.from(new Set(nbData.map((n) => n.user_id)));
        const { data: prof } = await supabase
          .from("profiles")
          .select("user_id,location")
          .in("user_id", authorIds);
        const sameLoc = new Set(
          (prof || [])
            .filter((p: any) => (p.location || "") === viewerLocation)
            .map((p: any) => p.user_id),
        );
        nbData = nbData.filter((n) => sameLoc.has(n.user_id));
      }

      // Hydrate authors
      const [takesHydrated, nbAuthorRows] = await Promise.all([
        hydrateTakeAuthors(takesData),
        nbData.length
          ? supabase
              .from("profiles")
              .select("user_id,display_name,avatar_url")
              .in("user_id", Array.from(new Set(nbData.map((n) => n.user_id))))
          : Promise.resolve({ data: [] as any[] }),
      ]);
      const byAuthor = new Map<string, any>();
      ((nbAuthorRows as any).data || []).forEach((p: any) =>
        byAuthor.set(p.user_id, p),
      );
      const nbWithAuthors = nbData.map((n) => ({
        ...n,
        author_name: byAuthor.get(n.user_id)?.display_name ?? null,
        author_avatar: byAuthor.get(n.user_id)?.avatar_url ?? null,
      }));

      const merged: FeedItem[] = [
        ...takesHydrated.map(
          (t): FeedItem => ({ kind: "take", sortKey: t.created_at, data: t }),
        ),
        ...nbWithAuthors.map(
          (n): FeedItem => ({
            kind: "notebook",
            sortKey: n.published_at || n.created_at,
            data: n,
          }),
        ),
      ];

      // For-you ranking nudge: items from followed authors first within same hour bucket
      if (mode === "for_you" && followIds.length) {
        const followed = new Set(followIds);
        merged.sort((a, b) => {
          const at = new Date(a.sortKey).getTime();
          const bt = new Date(b.sortKey).getTime();
          const ah = Math.floor(at / 3600_000);
          const bh = Math.floor(bt / 3600_000);
          if (ah !== bh) return bt - at;
          const aF = followed.has(
            a.kind === "take" ? a.data.author_id : a.data.user_id,
          )
            ? 1
            : 0;
          const bF = followed.has(
            b.kind === "take" ? b.data.author_id : b.data.user_id,
          )
            ? 1
            : 0;
          if (aF !== bF) return bF - aF;
          return bt - at;
        });
      } else {
        merged.sort(
          (a, b) => new Date(b.sortKey).getTime() - new Date(a.sortKey).getTime(),
        );
      }

      const next = reset ? merged : [...items, ...merged];
      // Dedupe by kind+id
      const seen = new Set<string>();
      const deduped = next.filter((it) => {
        const k = `${it.kind}:${it.data.id}`;
        if (seen.has(k)) return false;
        seen.add(k);
        return true;
      });

      setItems(deduped);
      const last = merged[merged.length - 1];
      setCursor(last?.sortKey ?? null);
      setHasMore(merged.length >= PAGE);
      setLoading(false);
    },
    [cursor, items, mode, viewerLocation, followIds],
  );

  // Reset on mode change
  useEffect(() => {
    setItems([]);
    setCursor(null);
    setHasMore(true);
    // initial load
    (async () => {
      await load(true);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, viewerLocation, followIds.join(",")]);

  const prepend = useCallback((take: Take) => {
    setItems((prev) => [
      { kind: "take", sortKey: take.created_at, data: take },
      ...prev,
    ]);
  }, []);

  return { items, loading, hasMore, loadMore: () => load(false), prepend };
}