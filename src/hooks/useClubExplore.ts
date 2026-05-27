import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { hydrateTakeAuthors, type Take } from "./useTakes";
import type { FeedNotebook } from "./useFeed";

export type ClubRecordKind = "debate" | "cmm" | "live" | "imported_record";

export interface ClubRecord {
  id: string;
  kind: ClubRecordKind;
  title: string;
  status: string; // 'scheduled'|'live'|'completed' etc.
  cover_image_url: string | null;
  created_at: string;
  starts_at: string | null;
  event_id: string;
  publisher_name?: string | null;
  publisher_avatar?: string | null;
  tag_ids?: string[];
}

export type ClubFeedItem =
  | { kind: "take"; sortKey: string; data: Take }
  | { kind: "notebook"; sortKey: string; data: FeedNotebook };

/** Fetches all session records spawned from this club's events. */
export function useClubRecords(clubId: string | undefined) {
  const [records, setRecords] = useState<ClubRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!clubId) return;
    setLoading(true);
    const { data: events } = await supabase
      .from("club_events")
      .select("id, event_type, session_id, starts_at, title")
      .eq("club_id", clubId)
      .not("session_id", "is", null);
    const evs = (events || []) as any[];
    const debateLikeIds = evs.filter((e) => e.event_type !== "live").map((e) => e.session_id);
    const liveIds = evs.filter((e) => e.event_type === "live").map((e) => e.session_id);

    const [debRes, liveRes] = await Promise.all([
      debateLikeIds.length
        ? supabase
            .from("debates")
            .select("id, topic, status, cover_image_url, created_at, created_by, format")
            .in("id", debateLikeIds)
        : Promise.resolve({ data: [] as any[] }),
      liveIds.length
        ? supabase
            .from("live_sessions")
            .select("id, title, status, cover_image_url, created_at, created_by")
            .in("id", liveIds)
        : Promise.resolve({ data: [] as any[] }),
    ]);

    const evByDebate = new Map<string, any>();
    const evByLive = new Map<string, any>();
    evs.forEach((e) => {
      if (e.event_type === "live") evByLive.set(e.session_id, e);
      else evByDebate.set(e.session_id, e);
    });

    const fromDebates: ClubRecord[] = ((debRes.data as any[]) || []).map((d) => {
      const e = evByDebate.get(d.id);
      return {
        id: d.id,
        kind: d.format === "change_my_mind" ? "cmm" : "debate",
        title: d.topic,
        status: d.status,
        cover_image_url: d.cover_image_url,
        created_at: d.created_at,
        starts_at: e?.starts_at ?? null,
        event_id: e?.id ?? "",
      } as ClubRecord;
    });
    const fromLive: ClubRecord[] = ((liveRes.data as any[]) || []).map((l) => {
      const e = evByLive.get(l.id);
      return {
        id: l.id,
        kind: "live",
        title: l.title || "Live session",
        status: l.status,
        cover_image_url: l.cover_image_url,
        created_at: l.created_at,
        starts_at: e?.starts_at ?? null,
        event_id: e?.id ?? "",
      } as ClubRecord;
    });

    // Tag ids for debate-like records
    const debIds = fromDebates.map((r) => r.id);
    if (debIds.length) {
      const { data: tagRows } = await (supabase as any)
        .from("debate_tags")
        .select("debate_id, tag_id")
        .in("debate_id", debIds);
      const byDeb = new Map<string, string[]>();
      (tagRows || []).forEach((r: any) => {
        const arr = byDeb.get(r.debate_id) || [];
        arr.push(r.tag_id);
        byDeb.set(r.debate_id, arr);
      });
      fromDebates.forEach((r) => (r.tag_ids = byDeb.get(r.id) || []));
    }
    const liveRecIds = fromLive.map((r) => r.id);
    if (liveRecIds.length) {
      const { data: tagRows } = await (supabase as any)
        .from("live_session_tags")
        .select("live_session_id, tag_id")
        .in("live_session_id", liveRecIds);
      const byLive = new Map<string, string[]>();
      (tagRows || []).forEach((r: any) => {
        const arr = byLive.get(r.live_session_id) || [];
        arr.push(r.tag_id);
        byLive.set(r.live_session_id, arr);
      });
      fromLive.forEach((r) => (r.tag_ids = byLive.get(r.id) || []));
    }

    const all = [...fromDebates, ...fromLive].sort((a, b) => {
      const ax = (a.starts_at ? new Date(a.starts_at).getTime() : 0) || new Date(a.created_at).getTime();
      const bx = (b.starts_at ? new Date(b.starts_at).getTime() : 0) || new Date(b.created_at).getTime();
      return bx - ax;
    });
    setRecords(all);
    setLoading(false);
  }, [clubId]);

  useEffect(() => {
    load();
  }, [load]);

  return { records, loading, refresh: load };
}

const PAGE = 20;

/** Club-scoped feed: takes with this club_id + notebooks attached to this club's records. */
export function useClubFeed(clubId: string | undefined, recordIds: string[]) {
  const [items, setItems] = useState<ClubFeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);
  const [cursor, setCursor] = useState<string | null>(null);
  const recordKey = recordIds.join(",");

  const load = useCallback(
    async (reset = false) => {
      if (!clubId) return;
      setLoading(true);
      const before = reset ? null : cursor;

      let takesQ = supabase
        .from("takes" as any)
        .select("*")
        .eq("is_public", true)
        .eq("club_id", clubId)
        .order("created_at", { ascending: false })
        .limit(PAGE);
      if (before) takesQ = takesQ.lt("created_at", before);

      let nbReq: Promise<any> = Promise.resolve({ data: [] as any[] });
      if (recordIds.length > 0) {
        let nbQ = supabase
          .from("session_notebooks" as any)
          .select(
            "id,user_id,record_type,record_id,display_title,my_take,thoughts,publish_caption,share_token,published_at,created_at",
          )
          .eq("published", true)
          .is("deleted_at", null)
          .in("record_id", recordIds)
          .order("published_at", { ascending: false })
          .limit(PAGE);
        if (before) nbQ = nbQ.lt("published_at", before);
        nbReq = nbQ;
      }

      const [takesRes, nbRes] = await Promise.all([
        takesQ as unknown as Promise<any>,
        nbReq,
      ]);
      const takesData = ((takesRes.data as any) || []) as Take[];
      const nbData = ((nbRes.data as any) || []) as FeedNotebook[];

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
      ((nbAuthorRows as any).data || []).forEach((p: any) => byAuthor.set(p.user_id, p));
      const nbWithAuthors = nbData.map((n) => ({
        ...n,
        author_name: byAuthor.get(n.user_id)?.display_name ?? null,
        author_avatar: byAuthor.get(n.user_id)?.avatar_url ?? null,
      }));

      const merged: ClubFeedItem[] = [
        ...takesHydrated.map((t): ClubFeedItem => ({ kind: "take", sortKey: t.created_at, data: t })),
        ...nbWithAuthors.map(
          (n): ClubFeedItem => ({ kind: "notebook", sortKey: n.published_at || n.created_at, data: n }),
        ),
      ].sort((a, b) => new Date(b.sortKey).getTime() - new Date(a.sortKey).getTime());

      const next = reset ? merged : [...items, ...merged];
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
    [cursor, items, clubId, recordKey], // eslint-disable-line react-hooks/exhaustive-deps
  );

  useEffect(() => {
    setItems([]);
    setCursor(null);
    setHasMore(true);
    (async () => {
      await load(true);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clubId, recordKey]);

  const prepend = useCallback((take: Take) => {
    setItems((prev) => [{ kind: "take", sortKey: take.created_at, data: take }, ...prev]);
  }, []);

  return { items, loading, hasMore, loadMore: () => load(false), prepend };
}

/** Club pinned items: admin curation. */
export interface ClubPin {
  id: string;
  kind: "record" | "take" | "notebook";
  target_id: string;
  sort_order: number;
}

export function useClubPins(clubId: string | undefined) {
  const [pins, setPins] = useState<ClubPin[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!clubId) return;
    setLoading(true);
    const { data } = await (supabase as any)
      .from("club_pinned_items")
      .select("id, kind, target_id, sort_order")
      .eq("club_id", clubId)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: false });
    setPins((data || []) as ClubPin[]);
    setLoading(false);
  }, [clubId]);

  useEffect(() => {
    load();
  }, [load]);

  const pin = useCallback(
    async (kind: ClubPin["kind"], targetId: string, userId: string) => {
      if (!clubId) return;
      await (supabase as any)
        .from("club_pinned_items")
        .insert({ club_id: clubId, kind, target_id: targetId, pinned_by: userId });
      load();
    },
    [clubId, load],
  );
  const unpin = useCallback(
    async (id: string) => {
      await (supabase as any).from("club_pinned_items").delete().eq("id", id);
      load();
    },
    [load],
  );

  return { pins, loading, pin, unpin, refresh: load };
}