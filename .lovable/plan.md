
## Goal

Fix `/my-debates` so:
1. Imported records appear (and the "Imported" format filter works).
2. The Change My Mind format filter works.
3. The **Active** chip means "happening right now or open to join", not "everything that isn't archived/scheduled".

No schema, RLS, or backend changes — UI/data-loading only.

---

## 1. Load imported records into My Agenda

In `src/pages/MyDebatesPage.tsx`, extend the loader (the `useEffect` around lines 125–196) to also fetch the current user's imported records, mirroring the pattern already used in `src/hooks/useHomeDebates.ts` (lines 75–93):

```ts
const { data: imported } = await supabase
  .from("imported_records" as any)
  .select("id, title, cover_image_url, created_at, user_id, is_public")
  .eq("user_id", user.id)
  .order("created_at", { ascending: false });

const importedItems: DebateCoverItem[] = ((imported as any[]) || []).map((r) => ({
  kind: "imported_record",
  id: r.id,
  topic: r.title || "Imported record",
  status: "completed",
  cover_image_url: r.cover_image_url,
  created_at: r.created_at,
  is_public: !!r.is_public,
  created_by: r.user_id,
  participant_count: 0,
}));
```

Merge `importedItems` into the existing `all` array before sorting.

Bulk actions (`bulkPrivacy`, `bulkArchive`, `bulkDelete`) already split by `kind === "live_session"` only — extend them to also branch on `kind === "imported_record"` and run against `imported_records` (privacy + delete only; skip "archive" for imported since the table has no `archived` status — gray-out / no-op those rows).

`DebateCoverCard` already renders an **Imported** pill and links to `/import/:id`, so no card-level work is needed.

---

## 2. Fix the format filter (CMM + Imported)

Two small changes:

- **Select `format`** in both `debates` queries so each item carries it.
- In the loader, set `format: d.format` on debate items, then in `visible` pass it through:

```ts
if (!matches({ kind: i.kind, format: (i as any).format ?? null })) return false;
```

Add `format?: string | null` to `DebateCoverItem` in `src/components/home/DebateCoverCard.tsx`. With this, the existing `classify()` in `MyAgendaFiltersContext` correctly routes `change_my_mind` → `cmm` and `imported_record` → `imported`.

---

## 3. Redefine the **Active** chip

Update `classifyAgenda` so "Active" only matches things a user can join or watch live right now. Everything finished moves to **Archive**.

```ts
function classifyAgenda(item: DebateCoverItem): AgendaFilter {
  // Finished / draft / explicitly archived → Archive
  if (item.status === "archived" || item.status === "draft" || item.status === "completed")
    return "archive";

  // Live right now OR a published debate awaiting participants → Active
  if (item.status === "live") return "active";

  const sched = item.scheduled_at ? new Date(item.scheduled_at).getTime() : 0;
  if (item.status === "scheduled") {
    // Scheduled with a future time = Scheduled; without a time but published = Active (open to join)
    if (sched && sched > Date.now()) return "scheduled";
    if (item.is_public) return "active";
    return "scheduled";
  }

  return "archive";
}
```

Result of the **Active** chip after this change:
- Debates currently live (`status = 'live'`)
- Published debates with `status = 'scheduled'` and no future `scheduled_at` (open lobby, waiting for people to queue/join)
- Live sessions currently recording (`status = 'live'`)

Excluded from Active (moved to Archive/Scheduled):
- Completed debates and completed live recordings
- Imported records (always `completed` → land in Archive)
- Scheduled debates with a future `scheduled_at` → **Scheduled**
- Drafts and archived items → **Archive**

---

## Files touched

- `src/pages/MyDebatesPage.tsx` — loader (add imported_records + select format), bulk action branches, `classifyAgenda` rewrite.
- `src/components/home/DebateCoverCard.tsx` — add `format?: string | null` to `DebateCoverItem`.

## Out of scope

- Backend, RLS, schema changes.
- Card visual changes (Imported pill + link already exist).
- Explore / Home / My Study.
