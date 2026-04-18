---
name: RLS Helpers
description: can_view_debate SECURITY DEFINER pattern for debate-scoped tables
type: feature
---

All debate-scoped tables (`arguments`, `debate_participants`, `debate_sides`, `debate_subtopics`, `round_summaries`) gate SELECT through `public.can_view_debate(_debate_id uuid)`.

Function returns true if: debate is_public, OR auth.uid() = created_by, OR auth.uid() is in debate_participants.

`debates` itself uses inline policy (same logic) to avoid recursion.

When adding a new debate-scoped table, use `USING (public.can_view_debate(debate_id))` for SELECT — never `USING (true)`.

Realtime: `realtime.messages` has RLS enabled with permissive auth-only policies; tighten per-channel if needed via topic naming.
