import { useState, useCallback, useEffect } from "react";
import TagPicker from "@/components/tags/TagPicker";
import type { Tag } from "@/hooks/useTags";
import { motion, AnimatePresence, Reorder } from "framer-motion";
import { ArrowRight, Plus, Minus, X, Sparkles, Globe, Lock, Users, Mail, GripVertical, Clock, Mic, MapPin, Calendar as CalendarIcon, Swords, Handshake, Award, ChevronDown, ArrowLeft, Send, Play } from "lucide-react";
import AppLayout from "@/components/AppLayout";
import DynamoLoader from "@/components/DynamoLoader";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";

interface GeneratedDebate {
  topic: string;
  subtopics: string[];
  sides: string[];
  turnsPerSubtopic: number;
  timePerTurn: string;
  prepTime: string;
}

interface InvitedEntry {
  username: string;
  userId?: string | null;
  sideId?: string | null; // null = unassigned; matches a side id from sideIds[] or a synthetic index
  avatarUrl?: string | null;
  source: "manual" | "interested";
  email?: string | null;
}

interface InterestedUser {
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
  side_id: string | null;
  role: string;
}

const TAGLINES = [
  "People to the Power!",
  "Your voice. Your power.",
  "Debate with purpose.",
  "Shape the conversation.",
  "Ideas worth defending.",
  "Speak up. Stand out.",
];

const TIME_OPTIONS = ["30s", "1 min", "2 min", "3 min", "5 min"];
const PREP_TIME_OPTIONS = ["0s", "15s", "30s", "45s", "1 min", "1.5 min", "2 min", "2.5 min", "3 min", "3.5 min", "4 min", "4.5 min", "5 min"];

const CreateDebatePage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const editId = searchParams.get("edit");
  const [step, setStep] = useState<1 | 2 | 3 | 4>(editId ? 2 : 1);
  const [editLoading, setEditLoading] = useState(!!editId);
  const [loadedStatus, setLoadedStatus] = useState<string | null>(null);
  const [prompt, setPrompt] = useState("");
  const [debate, setDebate] = useState<GeneratedDebate | null>(null);
  const [isPublic, setIsPublic] = useState(false);
  const [saving, setSaving] = useState(false);
  const [inviteInput, setInviteInput] = useState("");
  const [invitedEntries, setInvitedEntries] = useState<InvitedEntry[]>([]);
  const [sideIds, setSideIds] = useState<string[]>([]); // parallel to debate.sides; real DB IDs in edit mode, synthetic in create mode
  const [interestedUsers, setInterestedUsers] = useState<InterestedUser[]>([]);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [tapSelectedId, setTapSelectedId] = useState<string | null>(null);
  // Pointer-based drag state for cross-device (touch + mouse) drag-and-drop.
  const [pointerDragId, setPointerDragId] = useState<string | null>(null);
  const [pointerPos, setPointerPos] = useState<{ x: number; y: number } | null>(null);
  const [hoverDropZone, setHoverDropZone] = useState<string | null>(null);
  // Index into debate.sides — which side the creator is joining as.
  const [creatorSideIndex, setCreatorSideIndex] = useState<number>(0);
  const [taglineIndex, setTaglineIndex] = useState(0);
  const [location, setLocation] = useState("");
  const [scheduledAt, setScheduledAt] = useState(""); // datetime-local string
  const [mode, setMode] = useState<"adversarial" | "collaborative">("adversarial");
  const [resolutionPreview, setResolutionPreview] = useState<string>(""); // AI-generated suggestion (cached)
  const [resolutionLoading, setResolutionLoading] = useState(false);
  const [hoveringCollab, setHoveringCollab] = useState(false);
  const [resolutionAdded, setResolutionAdded] = useState(false); // true once user has solidified it (or confirmed in collab mode)
  const [feedbackEnabled, setFeedbackEnabled] = useState(false);
  const [feedbackExplainerOpen, setFeedbackExplainerOpen] = useState(false);
  const [selectedTags, setSelectedTags] = useState<Tag[]>([]);
  const [description, setDescription] = useState("");
  const [descriptionOpen, setDescriptionOpen] = useState(false);
  // Stable IDs for subtopic editor rows — prevents input remount on every keystroke.
  const [subtopicItems, setSubtopicItems] = useState<{ id: string; title: string }[]>([]);

  // Sync editor items whenever the underlying debate.subtopics changes from outside
  // (initial generation, collaborative-mode add/remove). We preserve existing IDs by title match
  // so user keystrokes don't trigger a re-sync that wipes focus.
  useEffect(() => {
    if (!debate) return;
    setSubtopicItems((prev) => {
      // If lengths and titles already match, do nothing (avoids stomping on edits in progress).
      if (
        prev.length === debate.subtopics.length &&
        prev.every((it, i) => it.title === debate.subtopics[i])
      ) {
        return prev;
      }
      // Try to keep existing IDs where titles still match.
      const usedIds = new Set<string>();
      const next = debate.subtopics.map((title, i) => {
        const match = prev.find((p) => p.title === title && !usedIds.has(p.id));
        if (match) {
          usedIds.add(match.id);
          return match;
        }
        return { id: `st-${Date.now()}-${i}-${Math.random().toString(36).slice(2, 8)}`, title };
      });
      return next;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debate?.subtopics]);

  useEffect(() => {
    const interval = setInterval(() => {
      setTaglineIndex((prev) => (prev + 1) % TAGLINES.length);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  // Edit mode: load existing debate template and jump straight to step 3.
  useEffect(() => {
    if (!editId || !user) return;
    let cancelled = false;
    (async () => {
      const [{ data: d }, { data: subs }, { data: sds }] = await Promise.all([
        supabase.from("debates").select("*").eq("id", editId).maybeSingle(),
        supabase.from("debate_subtopics").select("*").eq("debate_id", editId).order("sort_order"),
        supabase.from("debate_sides").select("*").eq("debate_id", editId).order("sort_order"),
      ]);
      if (cancelled) return;
      if (!d) {
        toast.error("Debate not found");
        navigate("/", { replace: true });
        return;
      }
      if (d.created_by !== user.id) {
        toast.error("You can't edit this debate");
        navigate(`/debate/${editId}/preview`, { replace: true });
        return;
      }
      setDebate({
        topic: d.topic,
        subtopics: (subs || []).map((s: any) => s.title),
        sides: (sds || []).map((s: any) => s.label),
        turnsPerSubtopic: d.turns_per_subtopic,
        timePerTurn: d.time_per_turn,
        prepTime: d.prep_time_min || "30s",
      });
      setSideIds((sds || []).map((s: any) => s.id as string));
      setIsPublic(d.is_public);
      setLocation(d.location || "");
      setScheduledAt(
        d.scheduled_at ? new Date(d.scheduled_at).toISOString().slice(0, 16) : "",
      );
      setFeedbackEnabled(!!d.feedback_enabled);
      setDescription(d.description || "");
      setResolutionAdded(true);
      setLoadedStatus(d.status ?? null);
      setEditLoading(false);
      setStep(3);

      // Load creator's existing side assignment from debate_participants
      const { data: meAsParticipant } = await supabase
        .from("debate_participants")
        .select("side_id")
        .eq("debate_id", editId)
        .eq("user_id", user.id)
        .maybeSingle();
      if (meAsParticipant?.side_id && sds) {
        const idx = (sds as any[]).findIndex((s: any) => s.id === meAsParticipant.side_id);
        if (idx >= 0) setCreatorSideIndex(idx);
      }

      // Load existing invitations into invitedEntries
      const { data: invs } = await supabase
        .from("debate_invitations")
        .select("invited_user_id, invited_username, invited_email, side_id")
        .eq("debate_id", editId);
      const invitedIds = new Set<string>();
      if (invs && invs.length > 0) {
        const userIds = invs.map((i: any) => i.invited_user_id).filter(Boolean);
        userIds.forEach((id: string) => invitedIds.add(id));
        const { data: profs } = await supabase
          .from("profiles")
          .select("user_id, display_name, avatar_url")
          .in("user_id", userIds);
        const profMap = new Map((profs || []).map((p: any) => [p.user_id, p]));
        setInvitedEntries(
          invs.map((i: any) => {
            const p: any = profMap.get(i.invited_user_id);
            return {
              username: i.invited_username || p?.display_name || i.invited_email || "Invitee",
              userId: i.invited_user_id,
              sideId: i.side_id ?? null,
              avatarUrl: p?.avatar_url ?? null,
              email: i.invited_email ?? null,
              source: "manual" as const,
            };
          }),
        );
      }

      // Load interested users (excluding creator, participants, already-invited)
      const [{ data: interests }, { data: parts }] = await Promise.all([
        supabase
          .from("debate_interests")
          .select("user_id, side_id, role")
          .eq("debate_id", editId),
        supabase
          .from("debate_participants")
          .select("user_id")
          .eq("debate_id", editId),
      ]);
      const partIds = new Set((parts || []).map((p: any) => p.user_id));
      const filteredInterests = (interests || []).filter(
        (i: any) =>
          i.user_id !== d.created_by &&
          !partIds.has(i.user_id) &&
          !invitedIds.has(i.user_id),
      );
      if (filteredInterests.length > 0) {
        const ids = filteredInterests.map((i: any) => i.user_id);
        const { data: iProfs } = await supabase
          .from("profiles")
          .select("user_id, display_name, avatar_url")
          .in("user_id", ids);
        const iMap = new Map((iProfs || []).map((p: any) => [p.user_id, p]));
        setInterestedUsers(
          filteredInterests.map((i: any) => ({
            user_id: i.user_id,
            display_name: (iMap.get(i.user_id) as any)?.display_name ?? null,
            avatar_url: (iMap.get(i.user_id) as any)?.avatar_url ?? null,
            side_id: i.side_id ?? null,
            role: i.role,
          })),
        );
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [editId, user, navigate]);

  const handleGenerate = useCallback(async () => {
    if (!prompt.trim()) return;
    setStep(2);
    // Reset collaborative state for a fresh generation
    setMode("adversarial");
    setResolutionPreview("");
    setResolutionAdded(false);
    setHoveringCollab(false);

    try {
      const response = await supabase.functions.invoke("ai-facilitator", {
        body: { action: "generate_debate", payload: { topic: prompt } },
      });

      if (response.error) throw response.error;

      const data = response.data;
      setDebate({
        topic: data.topic,
        subtopics: data.subtopics,
        sides: data.sides,
        turnsPerSubtopic: data.turns_per_subtopic,
        timePerTurn: data.time_per_turn,
        prepTime: "1 min",
      });
      setSideIds((data.sides as string[]).map((_, i) => `new-side-${i}`));
      setStep(3);
    } catch (err) {
      console.error("Generation failed:", err);
      setDebate({
        topic: prompt.charAt(0).toUpperCase() + prompt.slice(1) + (prompt.endsWith("?") ? "" : "?"),
        subtopics: ["Key considerations", "Potential impacts", "Alternative approaches"],
        sides: ["For", "Against"],
        turnsPerSubtopic: 2,
        timePerTurn: "2 min",
        prepTime: "1 min",
      });
      setSideIds(["new-side-0", "new-side-1"]);
      setStep(3);
      toast.error("AI generation had an issue — using a default structure. You can edit everything.");
    }
  }, [prompt]);

  const handleGenerationComplete = useCallback(() => {}, []);

  // Fetch the AI-suggested resolution subtopic (cached after first fetch)
  const fetchResolutionPreview = useCallback(async () => {
    if (!debate || resolutionPreview || resolutionLoading) return;
    setResolutionLoading(true);
    try {
      const response = await supabase.functions.invoke("ai-facilitator", {
        body: {
          action: "resolution_subtopic",
          payload: {
            topic: debate.topic,
            subtopics: debate.subtopics,
            sides: debate.sides,
          },
        },
      });
      if (response.error) throw response.error;
      const text = (response.data?.content ?? "").trim().replace(/^["']|["']$/g, "");
      setResolutionPreview(text || "Where could we compromise — and if not, why is the divide irreducible?");
    } catch (err) {
      console.error("Resolution fetch failed:", err);
      setResolutionPreview("Where could we compromise — and if not, why is the divide irreducible?");
    } finally {
      setResolutionLoading(false);
    }
  }, [debate, resolutionPreview, resolutionLoading]);

  // When user picks Collaborative, solidify the suggestion into the subtopics list.
  const selectCollaborative = useCallback(async () => {
    if (!debate) return;
    setMode("collaborative");
    // Ensure we have a suggestion text
    let text = resolutionPreview;
    if (!text) {
      setResolutionLoading(true);
      try {
        const response = await supabase.functions.invoke("ai-facilitator", {
          body: {
            action: "resolution_subtopic",
            payload: { topic: debate.topic, subtopics: debate.subtopics, sides: debate.sides },
          },
        });
        if (response.error) throw response.error;
        text = ((response.data?.content ?? "") as string).trim().replace(/^["']|["']$/g, "")
          || "Where could we compromise — and if not, why is the divide irreducible?";
        setResolutionPreview(text);
      } catch (err) {
        console.error("Resolution fetch failed:", err);
        text = "Where could we compromise — and if not, why is the divide irreducible?";
        setResolutionPreview(text);
      } finally {
        setResolutionLoading(false);
      }
    }
    if (!resolutionAdded) {
      setDebate({ ...debate, subtopics: [...debate.subtopics, text] });
      setResolutionAdded(true);
    }
    setHoveringCollab(false);
  }, [debate, resolutionPreview, resolutionAdded]);

  const selectAdversarial = useCallback(() => {
    if (!debate) return;
    setMode("adversarial");
    // Remove the resolution subtopic if it was added and unmodified
    if (resolutionAdded && resolutionPreview) {
      const lastIdx = debate.subtopics.lastIndexOf(resolutionPreview);
      if (lastIdx !== -1) {
        const next = [...debate.subtopics];
        next.splice(lastIdx, 1);
        setDebate({ ...debate, subtopics: next });
      }
      // If the user edited it, leave it in place — they own it now.
      setResolutionAdded(false);
    }
    setHoveringCollab(false);
  }, [debate, resolutionAdded, resolutionPreview]);

  const updateSubtopic = (index: number, value: string) => {
    if (!debate) return;
    setSubtopicItems((prev) => {
      const next = [...prev];
      if (next[index]) next[index] = { ...next[index], title: value };
      // Sync titles back to debate.subtopics
      setDebate({ ...debate, subtopics: next.map((it) => it.title) });
      return next;
    });
  };

  const addSubtopic = () => {
    if (!debate || debate.subtopics.length >= 6) return;
    const newItem = { id: `st-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, title: "" };
    const nextItems = [...subtopicItems, newItem];
    setSubtopicItems(nextItems);
    setDebate({ ...debate, subtopics: nextItems.map((it) => it.title) });
  };

  const removeSubtopic = (index: number) => {
    if (!debate || debate.subtopics.length <= 1) return;
    const nextItems = subtopicItems.filter((_, i) => i !== index);
    setSubtopicItems(nextItems);
    setDebate({ ...debate, subtopics: nextItems.map((it) => it.title) });
  };

  const reorderSubtopics = (newOrder: { id: string; title: string }[]) => {
    if (!debate) return;
    setSubtopicItems(newOrder);
    setDebate({ ...debate, subtopics: newOrder.map((it) => it.title) });
  };

  const addInvite = () => {
    const value = inviteInput.trim();
    if (!value) return;
    if (invitedEntries.some((e) => e.username.toLowerCase() === value.toLowerCase())) {
      toast.error("Already added");
      return;
    }
    setInvitedEntries((prev) => [
      ...prev,
      { username: value, sideId: null, source: "manual", email: isEmail(value) ? value : null },
    ]);
    setInviteInput("");
  };

  const removeInvite = (entry: InvitedEntry) => {
    setInvitedEntries((prev) =>
      prev.filter((e) => !(e.username === entry.username && e.userId === entry.userId)),
    );
    // Restore to interested pool if it came from there
    if (entry.source === "interested" && entry.userId) {
      // No-op: interested list is the source-of-truth view; we filter it client-side below.
    }
  };

  const addInterestedToInvite = (u: InterestedUser) => {
    if (invitedEntries.some((e) => e.userId === u.user_id)) return;
    setInvitedEntries((prev) => [
      ...prev,
      {
        username: u.display_name || "Interested user",
        userId: u.user_id,
        sideId: u.side_id,
        avatarUrl: u.avatar_url,
        source: "interested",
      },
    ]);
  };

  const assignSide = (target: InvitedEntry, sideId: string | null) => {
    setInvitedEntries((prev) =>
      prev.map((e) =>
        e.username === target.username && e.userId === target.userId
          ? { ...e, sideId }
          : e,
      ),
    );
  };

  const entryKey = (e: InvitedEntry) => `${e.userId ?? "x"}|${e.username}`;

  const isEmail = (s: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);

  // Pointer-based drag handlers — work for both mouse and touch.
  // Drop targets are identified by the `data-drop-zone` attribute (value: side id or "__unassigned__").
  const handleChipPointerDown = (entry: InvitedEntry) => (ev: React.PointerEvent<HTMLDivElement>) => {
    // Ignore if interaction starts on an interactive child (button/select/option).
    const target = ev.target as HTMLElement;
    if (target.closest("button, select, option, input, a")) return;
    const k = entryKey(entry);
    setPointerDragId(k);
    setPointerPos({ x: ev.clientX, y: ev.clientY });
    setHoverDropZone(null);
    try {
      (ev.currentTarget as Element).setPointerCapture(ev.pointerId);
    } catch {
      /* noop */
    }
  };

  const handleChipPointerMove = (ev: React.PointerEvent<HTMLDivElement>) => {
    if (!pointerDragId) return;
    setPointerPos({ x: ev.clientX, y: ev.clientY });
    // Hide the floating ghost momentarily to detect the underlying element.
    const el = document.elementFromPoint(ev.clientX, ev.clientY) as HTMLElement | null;
    const zone = el?.closest("[data-drop-zone]") as HTMLElement | null;
    setHoverDropZone(zone?.getAttribute("data-drop-zone") ?? null);
  };

  const handleChipPointerUp = (entry: InvitedEntry) => (ev: React.PointerEvent<HTMLDivElement>) => {
    if (!pointerDragId) return;
    const el = document.elementFromPoint(ev.clientX, ev.clientY) as HTMLElement | null;
    const zone = el?.closest("[data-drop-zone]") as HTMLElement | null;
    const zoneId = zone?.getAttribute("data-drop-zone");
    if (zoneId) {
      if (zoneId === "__unassigned__") assignSide(entry, null);
      else assignSide(entry, zoneId);
    }
    setPointerDragId(null);
    setPointerPos(null);
    setHoverDropZone(null);
    try {
      (ev.currentTarget as Element).releasePointerCapture(ev.pointerId);
    } catch {
      /* noop */
    }
  };


  const handleCreateDebate = async (publishMode: boolean = false) => {
    if (!debate || !user) return;
    setSaving(true);

    try {
      let dbDebate: any;

      if (editId) {
        // EDIT MODE: update existing debate, replace its subtopics + sides
        const { data: updated, error: updErr } = await supabase
          .from("debates")
          .update({
            topic: debate.topic,
            is_public: isPublic,
            turns_per_subtopic: debate.turnsPerSubtopic,
            time_per_turn: debate.timePerTurn,
            prep_time_min: debate.prepTime,
            prep_time_max: debate.prepTime,
            status: publishMode ? "scheduled" : (scheduledAt ? "scheduled" : "draft"),
            location: location.trim() || null,
            scheduled_at: scheduledAt ? new Date(scheduledAt).toISOString() : null,
            feedback_enabled: feedbackEnabled,
            description: description.trim() || null,
          } as any)
          .eq("id", editId)
          .select()
          .single();
        if (updErr) throw updErr;
        dbDebate = updated;

        // Replace subtopics + sides (delete then re-insert to preserve sort order)
        await supabase.from("debate_subtopics").delete().eq("debate_id", editId);
        await supabase.from("debate_sides").delete().eq("debate_id", editId);

        const subtopicInserts = debate.subtopics.map((title, i) => ({
          debate_id: editId,
          title,
          sort_order: i,
        }));
        if (subtopicInserts.length > 0) {
          const { error: subError } = await supabase.from("debate_subtopics").insert(subtopicInserts);
          if (subError) throw subError;
        }

        const sideInserts = debate.sides.map((label, i) => ({
          debate_id: editId,
          label,
          sort_order: i,
        }));
        if (sideInserts.length > 0) {
          const { error: sideError } = await supabase.from("debate_sides").insert(sideInserts);
          if (sideError) throw sideError;
        }
      } else {
        // CREATE MODE: insert new debate + children
        const { data: created, error: debateError } = await supabase
          .from("debates")
          .insert({
            topic: debate.topic,
            created_by: user.id,
            is_public: isPublic,
            turns_per_subtopic: debate.turnsPerSubtopic,
            time_per_turn: debate.timePerTurn,
            prep_time_min: debate.prepTime,
            prep_time_max: debate.prepTime,
            facilitator_type: "ai",
            status: publishMode ? "scheduled" : (scheduledAt ? "scheduled" : "draft"),
            location: location.trim() || null,
            scheduled_at: scheduledAt ? new Date(scheduledAt).toISOString() : null,
            feedback_enabled: feedbackEnabled,
            description: description.trim() || null,
          } as any)
          .select()
          .single();

        if (debateError) throw debateError;
        dbDebate = created;

        // Create subtopics
        const subtopicInserts = debate.subtopics.map((title, i) => ({
          debate_id: dbDebate.id,
          title,
          sort_order: i,
        }));
        const { error: subError } = await supabase.from("debate_subtopics").insert(subtopicInserts);
        if (subError) throw subError;

        // Create sides
        const sideInserts = debate.sides.map((label, i) => ({
          debate_id: dbDebate.id,
          label,
          sort_order: i,
        }));
        const { error: sideError } = await supabase.from("debate_sides").insert(sideInserts);
        if (sideError) throw sideError;

        // Add creator as participant on chosen side
        const { data: sides } = await supabase
          .from("debate_sides")
          .select("id, sort_order")
          .eq("debate_id", dbDebate.id)
          .order("sort_order");

        const creatorSideId =
          sides?.find((s: any) => s.sort_order === creatorSideIndex)?.id ??
          sides?.[0]?.id ??
          null;

        await supabase.from("debate_participants").insert({
          debate_id: dbDebate.id,
          user_id: user.id,
          side_id: creatorSideId,
        });
      }

      // Edit mode: ensure creator's participant row points to chosen side after sides were re-created.
      if (editId) {
        const { data: freshSidesForCreator } = await supabase
          .from("debate_sides")
          .select("id, sort_order")
          .eq("debate_id", dbDebate.id)
          .order("sort_order");
        const newCreatorSideId =
          freshSidesForCreator?.find((s: any) => s.sort_order === creatorSideIndex)?.id ??
          freshSidesForCreator?.[0]?.id ??
          null;
        if (newCreatorSideId) {
          const { data: existingPart } = await supabase
            .from("debate_participants")
            .select("id")
            .eq("debate_id", editId)
            .eq("user_id", user.id)
            .maybeSingle();
          if (existingPart) {
            await supabase
              .from("debate_participants")
              .update({ side_id: newCreatorSideId })
              .eq("id", existingPart.id);
          } else {
            await supabase.from("debate_participants").insert({
              debate_id: editId,
              user_id: user.id,
              side_id: newCreatorSideId,
            });
          }
        }
      }

      // 5. Send invitations (usernames and emails) — with side assignments from DnD
      // Build a map: current sideIds[i] (synthetic OR pre-edit DB IDs) → freshly-inserted DB side IDs.
      const { data: freshSides } = await supabase
        .from("debate_sides")
        .select("id, sort_order")
        .eq("debate_id", dbDebate.id)
        .order("sort_order");
      const sideIdMap = new Map<string, string>();
      (freshSides || []).forEach((s: any, i: number) => {
        const oldId = sideIds[i];
        if (oldId) sideIdMap.set(oldId, s.id);
      });
      const resolveSideId = (sid: string | null | undefined) =>
        sid ? sideIdMap.get(sid) ?? null : null;

      // In edit mode, wipe old invitations so we can re-insert with current side assignments.
      if (editId) {
        await supabase.from("debate_invitations").delete().eq("debate_id", editId);
      }

      if (invitedEntries.length > 0) {
        const usernameEntries = invitedEntries.filter((e) => !e.email);
        const emailEntries = invitedEntries.filter((e) => !!e.email);

        if (usernameEntries.length > 0) {
          // Entries with a known userId can be inserted directly.
          const known = usernameEntries.filter((e) => !!e.userId);
          const unknown = usernameEntries.filter((e) => !e.userId);

          const insertRows: any[] = known.map((e) => ({
            debate_id: dbDebate.id,
            invited_user_id: e.userId,
            invited_username: e.username,
            side_id: resolveSideId(e.sideId),
          }));

          if (unknown.length > 0) {
            const { data: profiles } = await supabase
              .from("profiles")
              .select("user_id, display_name")
              .in("display_name", unknown.map((e) => e.username));
            const profMap = new Map((profiles || []).map((p) => [p.display_name, p]));
            unknown.forEach((e) => {
              const p: any = profMap.get(e.username);
              if (p) {
                insertRows.push({
                  debate_id: dbDebate.id,
                  invited_user_id: p.user_id,
                  invited_username: p.display_name || e.username,
                  side_id: resolveSideId(e.sideId),
                });
              }
            });
            const found = new Set((profiles || []).map((p: any) => p.display_name));
            const notFound = unknown.filter((e) => !found.has(e.username)).map((e) => e.username);
            if (notFound.length > 0) {
              toast.warning(`Users not found: ${notFound.join(", ")}`);
            }
          }

          if (insertRows.length > 0) {
            await supabase.from("debate_invitations").insert(insertRows);
            toast.success(`${insertRows.length} invitation${insertRows.length !== 1 ? "s" : ""} sent`);
          }
        }

        if (emailEntries.length > 0) {
          for (const entry of emailEntries) {
            const tokenBytes = new Uint8Array(32);
            crypto.getRandomValues(tokenBytes);
            const inviteToken = Array.from(tokenBytes)
              .map((b) => b.toString(16).padStart(2, "0"))
              .join("");

            const { data: inv } = await supabase.from("debate_invitations").insert({
              debate_id: dbDebate.id,
              invited_user_id: user.id,
              invited_username: entry.username,
              invited_email: entry.email!,
              invite_token: inviteToken,
              side_id: resolveSideId(entry.sideId),
            }).select("id").single();

            if (inv) {
              supabase.functions.invoke("send-invite-email", {
                body: { invitation_id: inv.id, invite_token: inviteToken },
              }).catch((err) => console.error("Email send error:", err));
            }
          }
          toast.success(`${emailEntries.length} email invitation${emailEntries.length !== 1 ? "s" : ""} queued`);
        }
      }

      // Attach buffered tags
      console.log("[CreateDebate] attaching tags", { count: selectedTags.length, tags: selectedTags.map((t: any) => t.slug) });
      if (selectedTags.length > 0) {
        const { error: tagErr } = await (supabase as any)
          .from("debate_tags")
          .insert(selectedTags.map((t: any) => ({ debate_id: dbDebate.id, tag_id: t.id })));
        if (tagErr) {
          console.error("[CreateDebate] debate_tags insert failed", tagErr);
          toast.error(`Couldn't attach tags: ${tagErr.message}`);
          setSaving(false);
          return;
        }
      }

      if (editId) {
        toast.success("Debate updated");
        navigate(`/debate/${editId}/preview`);
      } else if (publishMode) {
        const hasTags = selectedTags.length > 0;
        if (hasTags) {
          toast.success("Debate published! Find it on Explore under your tags.");
          navigate(`/explore/topic/${selectedTags[0].slug}`);
        } else {
          toast.success("Debate published! Find it under My Recent on your profile.");
          navigate(`/my-recent`);
        }
      } else {
        toast.success("Debate created!");
        navigate(`/debate/${dbDebate.id}`);
      }
    } catch (err: any) {
      console.error("Create debate error:", err);
      toast.error(err.message || "Failed to create debate");
    } finally {
      setSaving(false);
    }
  };

  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto px-4 py-6 sm:py-8 md:py-16">
        <AnimatePresence mode="wait">
          {step === 1 && (
            <motion.div key="step1" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }}>
              <button
                type="button"
                onClick={() => navigate(-1)}
                className="inline-flex items-center gap-1.5 text-sm font-body text-muted-foreground hover:text-foreground transition-colors mb-6 group"
                aria-label="Go back"
              >
                <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
                Back
              </button>
              <div className="text-center mb-10">
                <h2 className="text-2xl font-display mb-3 md:text-3xl">What's on your mind?</h2>
                <div className="h-6 relative overflow-hidden">
                  <AnimatePresence mode="wait">
                    <motion.p
                      key={taglineIndex}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      transition={{ duration: 0.4 }}
                      className="text-muted-foreground absolute inset-0 text-center"
                    >
                      {TAGLINES[taglineIndex]}
                    </motion.p>
                  </AnimatePresence>
                </div>
              </div>
              <div className="relative">
                <textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="Type a topic and let dynamo structure the conversation."
                  className="w-full bg-background border border-border rounded-lg p-6 font-display text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-foreground/30 resize-none transition-colors min-h-[140px] text-base my-0 py-[24px]"
                  autoFocus
                />
                <button
                  onClick={handleGenerate}
                  disabled={!prompt.trim()}
                  className="absolute bottom-4 right-4 flex items-center gap-2 bg-foreground text-background px-5 py-2.5 rounded-full font-body text-xs font-medium disabled:opacity-40 hover:opacity-90 transition-opacity"
                >
                  <Sparkles className="w-4 h-4" />
                  Create
                </button>
              </div>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div key="step2" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <DynamoLoader duration={8000} />
            </motion.div>
          )}

          {step === 3 && debate && (
            <motion.div key="step3" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }}>
              <button
                type="button"
                onClick={() => navigate(-1)}
                className="inline-flex items-center gap-1.5 text-sm font-body text-muted-foreground hover:text-foreground transition-colors mb-6 group"
                aria-label="Go back"
              >
                <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
                Back
              </button>
              <h2 className="text-2xl font-display mb-6">Review Your Debate</h2>

              <div className="space-y-6">
                {/* Topic */}
                <div className="bg-background border border-border rounded-lg p-5">
                  <label className="text-[11px] text-muted-foreground font-body font-medium uppercase tracking-wider mb-2 block">Main Topic</label>
                  <input
                    value={debate.topic}
                    onChange={(e) => setDebate({ ...debate, topic: e.target.value })}
                    className="w-full bg-transparent text-lg font-display text-foreground focus:outline-none"
                  />

                  {/* Description (collapsible) */}
                  <div className="mt-3 border-t border-border pt-3">
                    <button
                      type="button"
                      onClick={() => setDescriptionOpen((v) => !v)}
                      className="w-full flex items-center justify-between text-left"
                    >
                      <span className="text-[11px] uppercase tracking-wider text-muted-foreground font-body font-medium">
                        Description <span className="normal-case font-normal">(optional)</span>
                      </span>
                      <ChevronDown
                        className={`w-4 h-4 text-muted-foreground transition-transform ${descriptionOpen ? "rotate-180" : ""}`}
                      />
                    </button>
                    {descriptionOpen && (
                      <textarea
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="Briefly describe context, framing, or what you hope to explore."
                        rows={3}
                        className="w-full mt-2 bg-accent rounded-lg px-3 py-2 text-sm font-body text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-foreground/20 resize-none"
                      />
                    )}
                  </div>
                </div>

                {/* Tags */}
                <div className="bg-background border border-border rounded-lg p-5">
                  <label className="text-[11px] text-muted-foreground font-body font-medium uppercase tracking-wider mb-2 block">
                    Tags <span className="normal-case font-normal">(helps people on Explore find this)</span>
                  </label>
                  <TagPicker
                    kind="debate"
                    recordId={null}
                    buffered={selectedTags}
                    onBufferedChange={setSelectedTags}
                    max={5}
                    compact
                  />
                </div>

                {/* Mode: Adversarial / Collaborative */}
                <div className="bg-background border border-border rounded-lg p-5">
                  <label className="text-[11px] text-muted-foreground font-body font-medium uppercase tracking-wider mb-3 block">
                    Debate Mode
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={selectAdversarial}
                      className={`flex flex-col items-start gap-1 rounded-lg p-3 text-left transition-colors border ${
                        mode === "adversarial"
                          ? "bg-foreground text-background border-foreground"
                          : "bg-accent text-foreground border-transparent hover:border-foreground/20"
                      }`}
                    >
                      <span className="flex items-center gap-2 text-sm font-body font-medium">
                        <Swords className="w-4 h-4" /> Adversarial
                      </span>
                      <span className={`text-[11px] font-body ${mode === "adversarial" ? "text-background/70" : "text-muted-foreground"}`}>
                        Sides argue for their position.
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={selectCollaborative}
                      onMouseEnter={() => {
                        if (mode !== "collaborative") {
                          setHoveringCollab(true);
                          fetchResolutionPreview();
                        }
                      }}
                      onMouseLeave={() => setHoveringCollab(false)}
                      onFocus={() => {
                        if (mode !== "collaborative") {
                          setHoveringCollab(true);
                          fetchResolutionPreview();
                        }
                      }}
                      onBlur={() => setHoveringCollab(false)}
                      className={`flex flex-col items-start gap-1 rounded-lg p-3 text-left transition-colors border ${
                        mode === "collaborative"
                          ? "bg-foreground text-background border-foreground"
                          : "bg-accent text-foreground border-transparent hover:border-foreground/20"
                      }`}
                    >
                      <span className="flex items-center gap-2 text-sm font-body font-medium">
                        <Handshake className="w-4 h-4" /> Collaborative
                      </span>
                      <span className={`text-[11px] font-body ${mode === "collaborative" ? "text-background/70" : "text-muted-foreground"}`}>
                        Adds a resolution-seeking subtopic.
                      </span>
                    </button>
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-3 font-body">
                    {mode === "collaborative"
                      ? "A resolution subtopic has been added below. Edit or remove it like any other."
                      : "Hover Collaborative to preview the resolution subtopic that would be added."}
                  </p>
                </div>

                {/* Subtopics */}
                <div className="bg-background border border-border rounded-lg p-5">
                  <div className="flex items-center justify-between mb-3">
                    <label className="text-[11px] text-muted-foreground font-body font-medium uppercase tracking-wider">Subtopics</label>
                    <button onClick={addSubtopic} className="text-foreground hover:opacity-80 transition-opacity">
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                  <Reorder.Group
                    axis="y"
                    values={subtopicItems}
                    onReorder={reorderSubtopics}
                    className="space-y-2"
                  >
                    {subtopicItems.map((item, i) => (
                      <Reorder.Item key={item.id} value={item} className="flex items-center gap-2">
                        <GripVertical className="w-4 h-4 text-muted-foreground cursor-grab active:cursor-grabbing shrink-0" />
                        <span className="text-xs text-muted-foreground w-5">{i + 1}.</span>
                        <input
                          value={item.title}
                          onChange={(e) => updateSubtopic(i, e.target.value)}
                          placeholder="Subtopic"
                          className="flex-1 bg-accent rounded-lg px-3 py-2 text-sm font-body text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-foreground/20"
                        />
                        {subtopicItems.length > 1 && (
                          <button onClick={() => removeSubtopic(i)} className="text-muted-foreground hover:text-destructive transition-colors">
                            <X className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </Reorder.Item>
                    ))}
                  </Reorder.Group>

                  {/* Translucent preview of the resolution subtopic on hover */}
                  <AnimatePresence>
                    {hoveringCollab && mode !== "collaborative" && (
                      <motion.div
                        key="resolution-ghost"
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 0.45, y: 0 }}
                        exit={{ opacity: 0, y: -4 }}
                        transition={{ duration: 0.18 }}
                        className="flex items-center gap-2 mt-2 pointer-events-none"
                        aria-hidden="true"
                      >
                        <Handshake className="w-4 h-4 text-muted-foreground shrink-0" />
                        <span className="text-xs text-muted-foreground w-5">{debate.subtopics.length + 1}.</span>
                        <div className="flex-1 bg-accent/60 border border-dashed border-foreground/20 rounded-lg px-3 py-2 text-sm font-body text-foreground italic">
                          {resolutionLoading && !resolutionPreview ? "Generating resolution prompt…" : resolutionPreview || "Where could we compromise?"}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Sides */}
                <div className="bg-background border border-border rounded-lg p-5">
                  <label className="text-[11px] text-muted-foreground font-body font-medium uppercase tracking-wider mb-3 block">Participant Sides</label>
                  <div className="flex flex-col sm:flex-row gap-2">
                    {debate.sides.map((side, i) => (
                      <input
                        key={i}
                        value={side}
                        onChange={(e) => {
                          const updated = [...debate.sides];
                          updated[i] = e.target.value;
                          setDebate({ ...debate, sides: updated });
                        }}
                        className="w-full sm:flex-1 min-w-0 bg-accent rounded-lg px-3 py-2 text-base sm:text-sm text-center font-body font-medium text-foreground focus:outline-none focus:ring-1 focus:ring-foreground/20"
                      />
                    ))}
                  </div>

                  {/* Your side picker — creator chooses which side they're joining as */}
                  <div className="mt-4">
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-body font-medium mb-2">
                      Your side
                    </p>
                    <div className="flex flex-col sm:flex-row gap-2">
                      {debate.sides.map((side, i) => {
                        const selected = creatorSideIndex === i;
                        return (
                          <button
                            key={i}
                            type="button"
                            onClick={() => setCreatorSideIndex(i)}
                            aria-pressed={selected}
                            className={`flex-1 rounded-lg px-3 py-2 text-sm font-body font-medium transition-all border ${
                              selected
                                ? "bg-foreground text-background border-foreground"
                                : "bg-background text-foreground border-border hover:border-foreground/40"
                            }`}
                          >
                            {selected ? "✓ " : ""}{side || `Side ${i + 1}`}
                          </button>
                        );
                      })}
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-1.5 font-body">
                      You'll be added as a speaker on this side.
                    </p>
                  </div>
                </div>

                {/* Turns & Time */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-background border border-border rounded-lg p-5">
                    <label className="text-[11px] text-muted-foreground font-body font-medium uppercase tracking-wider mb-3 block">Turns per Subtopic</label>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => setDebate({ ...debate, turnsPerSubtopic: Math.max(1, debate.turnsPerSubtopic - 1) })}
                        className="text-muted-foreground hover:text-foreground transition-colors"
                      >
                        <Minus className="w-4 h-4" />
                      </button>
                      <span className="text-2xl font-display text-foreground">{debate.turnsPerSubtopic}</span>
                      <button
                        onClick={() => setDebate({ ...debate, turnsPerSubtopic: Math.min(10, debate.turnsPerSubtopic + 1) })}
                        className="text-muted-foreground hover:text-foreground transition-colors"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  <div className="bg-background border border-border rounded-lg p-5">
                    <label className="text-[11px] text-muted-foreground font-body font-medium uppercase tracking-wider mb-3 block">Time per Turn</label>
                    <select
                      value={debate.timePerTurn}
                      onChange={(e) => setDebate({ ...debate, timePerTurn: e.target.value })}
                      className="w-full bg-accent rounded-lg px-3 py-2 text-sm font-body text-foreground focus:outline-none focus:ring-1 focus:ring-foreground/20"
                    >
                      {TIME_OPTIONS.map((t) => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                </div>

                {/* Preparation Time Range */}
                <div className="bg-background border border-border rounded-lg p-5">
                  <label className="text-[11px] text-muted-foreground font-body font-medium uppercase tracking-wider mb-3 block">
                    <Clock className="w-3.5 h-3.5 inline mr-1" />
                    Preparation Time Between Turns
                  </label>
                   <select
                     value={debate.prepTime}
                     onChange={(e) => setDebate({ ...debate, prepTime: e.target.value })}
                     className="w-full bg-accent rounded-lg px-3 py-2 text-sm font-body text-foreground focus:outline-none focus:ring-1 focus:ring-foreground/20"
                   >
                     {PREP_TIME_OPTIONS.map((t) => <option key={t} value={t}>{t}</option>)}
                   </select>
                  <p className="text-[10px] text-muted-foreground mt-2 font-body">
                     Time given to both sides between turns to review and prepare.
                  </p>
                 </div>
                {/* Invite Users (optional) */}
                <div className="bg-background border border-border rounded-lg p-5">
                  <label className="text-[11px] text-muted-foreground font-body font-medium uppercase tracking-wider mb-3 block">
                    <Mail className="w-3.5 h-3.5 inline mr-1" />
                    Invite Speakers <span className="normal-case font-normal">(optional)</span>
                  </label>
                  <div className="flex items-center gap-2 mb-2">
                    <input
                      value={inviteInput}
                      onChange={(e) => setInviteInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") { e.preventDefault(); addInvite(); }
                      }}
                      placeholder="Username or email address"
                      className="flex-1 bg-accent rounded-lg px-3 py-2 text-sm font-body text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-foreground/20"
                    />
                    <button
                      onClick={addInvite}
                      disabled={!inviteInput.trim()}
                      className="text-foreground hover:opacity-80 transition-opacity disabled:opacity-40"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                  {/* Interested users (edit mode only) */}
                  {editId ? (
                    interestedUsers.filter(
                      (u) => !invitedEntries.some((e) => e.userId === u.user_id),
                    ).length > 0 ? (
                      <div className="mt-3">
                        <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-body font-medium mb-1.5">
                          Interested <span className="normal-case font-normal">(tap to add)</span>
                        </p>
                        <div className="flex gap-2 overflow-x-auto pb-1">
                          {interestedUsers
                            .filter((u) => !invitedEntries.some((e) => e.userId === u.user_id))
                            .map((u) => (
                              <button
                                key={u.user_id}
                                type="button"
                                onClick={() => addInterestedToInvite(u)}
                                className="shrink-0 inline-flex items-center gap-1.5 bg-accent hover:bg-accent/70 text-foreground rounded-full pl-1 pr-2.5 py-1 text-xs font-body font-medium transition-colors"
                              >
                                {u.avatar_url ? (
                                  <img src={u.avatar_url} alt="" className="w-5 h-5 rounded-full object-cover" />
                                ) : (
                                  <span className="w-5 h-5 rounded-full bg-foreground/10 inline-flex items-center justify-center text-[9px]">
                                    {(u.display_name || "?").slice(0, 2).toUpperCase()}
                                  </span>
                                )}
                                {u.display_name || "Interested"}
                                <Plus className="w-3 h-3 opacity-60" />
                              </button>
                            ))}
                        </div>
                      </div>
                    ) : null
                  ) : (
                    <p className="text-[10px] text-muted-foreground mt-2 font-body italic">
                      Save the debate first to see who's expressed interest.
                    </p>
                  )}

                  {/* Drag-and-drop side assignment */}
                  {invitedEntries.length > 0 && (
                    <div className="mt-4 space-y-3">
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-body font-medium">
                        Assign to a side <span className="normal-case font-normal">(drag on desktop, tap the → on each chip on mobile)</span>
                      </p>

                      {/* Unassigned tray */}
                      <div
                        onDragOver={(e) => {
                          e.preventDefault();
                          e.dataTransfer.dropEffect = "move";
                        }}
                        onDrop={(e) => {
                          e.preventDefault();
                          const key = e.dataTransfer.getData("text/plain");
                          const target = invitedEntries.find((en) => entryKey(en) === key);
                          if (target) assignSide(target, null);
                          setDraggingId(null);
                        }}
                        onClick={() => {
                          if (tapSelectedId) {
                            const target = invitedEntries.find((en) => entryKey(en) === tapSelectedId);
                            if (target) {
                              assignSide(target, null);
                              setTapSelectedId(null);
                            }
                          }
                        }}
                        className="border border-dashed border-border rounded-lg p-3 min-h-[56px] bg-accent/30"
                      >
                        <p className="text-[10px] text-muted-foreground font-body mb-1.5">Unassigned</p>
                        <div className="flex flex-wrap gap-1.5">
                          {invitedEntries.filter((e) => !e.sideId).map((e) => {
                            const k = entryKey(e);
                            const selected = tapSelectedId === k;
                            return (
                              <div
                                key={k}
                                draggable
                                onDragStart={(ev) => {
                                  ev.dataTransfer.setData("text/plain", k);
                                  ev.dataTransfer.effectAllowed = "move";
                                  setDraggingId(k);
                                }}
                                onDragEnd={() => setDraggingId(null)}
                                onClick={(ev) => {
                                  ev.stopPropagation();
                                  setTapSelectedId(selected ? null : k);
                                }}
                                className={`inline-flex items-center gap-1.5 rounded-full pl-1 pr-1.5 py-1 text-xs font-body font-medium cursor-grab active:cursor-grabbing transition-all ${
                                  selected
                                    ? "bg-foreground text-background ring-2 ring-foreground"
                                    : "bg-background border border-border text-foreground"
                                } ${draggingId === k ? "opacity-50" : ""}`}
                              >
                                {e.avatarUrl ? (
                                  <img src={e.avatarUrl} alt="" className="w-5 h-5 rounded-full object-cover" />
                                ) : (
                                  <span className="w-5 h-5 rounded-full bg-foreground/10 inline-flex items-center justify-center text-[9px]">
                                    {e.username.slice(0, 2).toUpperCase()}
                                  </span>
                                )}
                                {e.username}
                                {/* Mobile-friendly side picker */}
                                <select
                                  value=""
                                  onClick={(ev) => ev.stopPropagation()}
                                  onChange={(ev) => {
                                    const v = ev.target.value;
                                    if (!v) return;
                                    assignSide(e, v);
                                    setTapSelectedId(null);
                                  }}
                                  className="bg-transparent text-[10px] font-body border-0 outline-none cursor-pointer appearance-none pr-0.5"
                                  aria-label={`Assign ${e.username} to a side`}
                                  title="Move to side"
                                >
                                  <option value="">→</option>
                                  {debate.sides.map((label, si) => {
                                    const sid = sideIds[si];
                                    if (!sid) return null;
                                    return (
                                      <option key={sid} value={sid}>
                                        {label}
                                      </option>
                                    );
                                  })}
                                </select>
                                <button
                                  type="button"
                                  onClick={(ev) => {
                                    ev.stopPropagation();
                                    removeInvite(e);
                                  }}
                                  className="hover:text-destructive transition-colors ml-0.5"
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              </div>
                            );
                          })}
                          {invitedEntries.filter((e) => !e.sideId).length === 0 && (
                            <span className="text-[11px] text-muted-foreground font-body italic">All assigned ✓</span>
                          )}
                        </div>
                      </div>

                      {/* Side columns */}
                      <div className="flex items-stretch gap-0 rounded-lg border border-border overflow-hidden">
                        {debate.sides.map((label, i) => {
                          const sid = sideIds[i];
                          if (!sid) return null;
                          return (
                            <div key={sid} className="flex-1 flex">
                              <div
                                onDragOver={(ev) => {
                                  ev.preventDefault();
                                  ev.dataTransfer.dropEffect = "move";
                                }}
                                onDrop={(ev) => {
                                  ev.preventDefault();
                                  const key = ev.dataTransfer.getData("text/plain");
                                  const target = invitedEntries.find((en) => entryKey(en) === key);
                                  if (target) assignSide(target, sid);
                                  setDraggingId(null);
                                }}
                                onClick={() => {
                                  if (tapSelectedId) {
                                    const target = invitedEntries.find((en) => entryKey(en) === tapSelectedId);
                                    if (target) {
                                      assignSide(target, sid);
                                      setTapSelectedId(null);
                                    }
                                  }
                                }}
                                className="flex-1 p-3 min-h-[120px] bg-background"
                              >
                                <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-body font-medium mb-1.5 truncate">
                                  {label}
                                </p>
                                <div className="flex flex-wrap gap-1.5">
                                  {invitedEntries.filter((e) => e.sideId === sid).map((e) => {
                                    const k = entryKey(e);
                                    const selected = tapSelectedId === k;
                                    return (
                                      <div
                                        key={k}
                                        draggable
                                        onDragStart={(ev) => {
                                          ev.dataTransfer.setData("text/plain", k);
                                          ev.dataTransfer.effectAllowed = "move";
                                          setDraggingId(k);
                                        }}
                                        onDragEnd={() => setDraggingId(null)}
                                        onClick={(ev) => {
                                          ev.stopPropagation();
                                          setTapSelectedId(selected ? null : k);
                                        }}
                                        className={`inline-flex items-center gap-1.5 rounded-full pl-1 pr-1.5 py-1 text-xs font-body font-medium cursor-grab active:cursor-grabbing transition-all ${
                                          selected
                                            ? "bg-foreground text-background ring-2 ring-foreground"
                                            : "bg-accent text-foreground"
                                        } ${draggingId === k ? "opacity-50" : ""}`}
                                      >
                                        {e.avatarUrl ? (
                                          <img src={e.avatarUrl} alt="" className="w-5 h-5 rounded-full object-cover" />
                                        ) : (
                                          <span className="w-5 h-5 rounded-full bg-foreground/10 inline-flex items-center justify-center text-[9px]">
                                            {e.username.slice(0, 2).toUpperCase()}
                                          </span>
                                        )}
                                        {e.username}
                                        {/* Mobile-friendly side picker (move or unassign) */}
                                        <select
                                          value=""
                                          onClick={(ev) => ev.stopPropagation()}
                                          onChange={(ev) => {
                                            const v = ev.target.value;
                                            if (v === "__unassign__") {
                                              assignSide(e, null);
                                            } else if (v) {
                                              assignSide(e, v);
                                            }
                                            setTapSelectedId(null);
                                          }}
                                          className="bg-transparent text-[10px] font-body border-0 outline-none cursor-pointer appearance-none pr-0.5 text-current"
                                          aria-label={`Move ${e.username}`}
                                          title="Move"
                                        >
                                          <option value="">→</option>
                                          <option value="__unassign__">Unassign</option>
                                          {debate.sides.map((label, si) => {
                                            const otherSid = sideIds[si];
                                            if (!otherSid || otherSid === sid) return null;
                                            return (
                                              <option key={otherSid} value={otherSid}>
                                                {label}
                                              </option>
                                            );
                                          })}
                                        </select>
                                        <button
                                          type="button"
                                          onClick={(ev) => {
                                            ev.stopPropagation();
                                            removeInvite(e);
                                          }}
                                          className="hover:text-destructive transition-colors ml-0.5"
                                        >
                                          <X className="w-3 h-3" />
                                        </button>
                                      </div>
                                    );
                                  })}
                                  {invitedEntries.filter((e) => e.sideId === sid).length === 0 && (
                                    <span className="text-[11px] text-muted-foreground font-body italic">
                                      Drop here
                                    </span>
                                  )}
                                </div>
                              </div>
                              {i < debate.sides.length - 1 && (
                                <div className="w-px bg-border" aria-hidden="true" />
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>

                {/* Location & Schedule */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-background border border-border rounded-lg p-5">
                    <label className="text-[11px] text-muted-foreground font-body font-medium uppercase tracking-wider mb-3 block">
                      <MapPin className="w-3.5 h-3.5 inline mr-1" />
                      Location <span className="normal-case font-normal">(optional)</span>
                    </label>
                    <input
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      placeholder="e.g. Brooklyn, NY"
                      className="w-full bg-accent rounded-lg px-3 py-2 text-sm font-body text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-foreground/20"
                    />
                    <p className="text-[10px] text-muted-foreground mt-2 font-body">
                      Helps local audiences discover this debate.
                    </p>
                  </div>
                  <div className="bg-background border border-border rounded-lg p-5">
                    <label className="text-[11px] text-muted-foreground font-body font-medium uppercase tracking-wider mb-3 block">
                      <CalendarIcon className="w-3.5 h-3.5 inline mr-1" />
                      Schedule <span className="normal-case font-normal">(optional)</span>
                    </label>
                    <input
                      type="datetime-local"
                      value={scheduledAt}
                      onChange={(e) => setScheduledAt(e.target.value)}
                      min={new Date().toISOString().slice(0, 16)}
                      className="w-full bg-accent rounded-lg px-3 py-2 text-sm font-body text-foreground focus:outline-none focus:ring-1 focus:ring-foreground/20"
                    />
                    <p className="text-[10px] text-muted-foreground mt-2 font-body">
                      Leave empty to start as a draft.
                    </p>
                  </div>
                </div>

                {/* Visibility */}
                <div className="bg-background border border-border rounded-lg p-5">
                  <label className="text-[11px] text-muted-foreground font-body font-medium uppercase tracking-wider mb-3 block">Visibility</label>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setIsPublic(false)}
                      className={`flex-1 flex items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-body font-medium transition-colors ${!isPublic ? "bg-foreground text-background border border-foreground" : "bg-accent text-muted-foreground border border-transparent"}`}
                    >
                      <Lock className="w-4 h-4" /> Private
                    </button>
                    <button
                      onClick={() => setIsPublic(true)}
                      className={`flex-1 flex items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-body font-medium transition-colors ${isPublic ? "bg-foreground text-background border border-foreground" : "bg-accent text-muted-foreground border border-transparent"}`}
                    >
                      <Globe className="w-4 h-4" /> Public
                    </button>
                  </div>
                </div>

                {/* Performance Feedback */}
                <div className="bg-background border border-border rounded-lg p-5">
                  <label className="text-[11px] text-muted-foreground font-body font-medium uppercase tracking-wider mb-3 block">
                    <Award className="w-3.5 h-3.5 inline mr-1" />
                    Performance Feedback
                  </label>
                  <p className="text-xs font-body text-foreground mb-3">
                    Want a private AI-graded performance report after the debate?
                  </p>
                  <div className="flex gap-2 mb-3">
                    <button
                      type="button"
                      onClick={() => setFeedbackEnabled(false)}
                      className={`flex-1 rounded-lg py-2.5 text-sm font-body font-medium transition-colors border ${
                        !feedbackEnabled
                          ? "bg-foreground text-background border-foreground"
                          : "bg-accent text-muted-foreground border-transparent"
                      }`}
                    >
                      No
                    </button>
                    <button
                      type="button"
                      onClick={() => setFeedbackEnabled(true)}
                      className={`flex-1 rounded-lg py-2.5 text-sm font-body font-medium transition-colors border ${
                        feedbackEnabled
                          ? "bg-foreground text-background border-foreground"
                          : "bg-accent text-muted-foreground border-transparent"
                      }`}
                    >
                      Yes
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => setFeedbackExplainerOpen((v) => !v)}
                    className="flex items-center gap-1 text-[11px] font-body text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <ChevronDown className={`w-3 h-3 transition-transform ${feedbackExplainerOpen ? "rotate-180" : ""}`} />
                    What's graded?
                  </button>
                  <AnimatePresence>
                    {feedbackExplainerOpen && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                      >
                        <ul className="text-[11px] font-body text-muted-foreground mt-3 space-y-1.5 list-disc pl-4">
                          <li><span className="text-foreground">Argument Quality</span> — logic, relevance, evidence.</li>
                          <li><span className="text-foreground">Opposition Engagement</span> — direct rebuttals and acknowledgment.</li>
                          <li><span className="text-foreground">Clarity & Structure</span> — coherent point, reasoning, conclusion.</li>
                          <li><span className="text-foreground">Stakes Articulation</span> — what's at risk if your side loses.</li>
                          <li><span className="text-foreground">Overall Performance</span> — weighted average with a label (Exceptional → Insufficient).</li>
                          {mode === "collaborative" && (
                            <li><span className="text-foreground">Resolution Engagement</span> — separate score for consensus-seeking (only because Collaborative mode is on).</li>
                          )}
                        </ul>
                        <p className="text-[10px] font-body text-muted-foreground mt-2 italic">
                          Grades are private to each speaker. Dynamo never declares a winner.
                        </p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Actions */}
                {(() => {
                  const isPublished = !!editId && loadedStatus === "scheduled";
                  const leftLabel = saving
                    ? "Saving…"
                    : isPublished
                      ? "Save Debate"
                      : invitedEntries.length > 0
                        ? "Save & Invite"
                        : "Save Draft";
                  const rightLabel = isPublished
                    ? saving ? "Starting…" : "Start Debate"
                    : saving ? "Publishing…" : "Publish Debate";
                  const handleRight = async () => {
                    if (!isPublished) {
                      handleCreateDebate(true);
                      return;
                    }
                    if (!editId) return;
                    setSaving(true);
                    try {
                      const { error } = await supabase
                        .from("debates")
                        .update({ status: "live", started_at: new Date().toISOString() } as any)
                        .eq("id", editId);
                      if (error) throw error;
                      toast.success("Debate started!");
                      navigate(`/debate/${editId}`);
                    } catch (err: any) {
                      toast.error(err.message || "Failed to start debate");
                      setSaving(false);
                    }
                  };
                  return (
                    <div className="flex flex-col sm:flex-row gap-3 pt-2">
                      <button
                        onClick={() => handleCreateDebate(false)}
                        disabled={saving}
                        className="flex-1 flex items-center justify-center gap-2 border border-border rounded-full py-3 font-body text-sm font-medium text-foreground hover:border-foreground/40 transition-colors disabled:opacity-50"
                      >
                        {leftLabel}
                        <ArrowRight className="w-4 h-4" />
                      </button>
                      <button
                        onClick={handleRight}
                        disabled={saving}
                        className="flex-1 flex items-center justify-center gap-2 bg-foreground text-background rounded-full py-3 font-body text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
                      >
                        {rightLabel}
                        {isPublished ? <Play className="w-4 h-4" /> : <Send className="w-4 h-4" />}
                      </button>
                    </div>
                  );
                })()}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </AppLayout>
  );
};

export default CreateDebatePage;
