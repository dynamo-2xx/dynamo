import { useEffect, useRef, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { BookOpen, ArrowLeft, X, Pencil, Check } from "lucide-react";
import { useMyReaderNotes } from "@/hooks/useMyReaderNotes";
import LeaveReaderNoteComposer, {
  type PinAnchor,
} from "@/components/study/LeaveReaderNoteComposer";
import { Textarea } from "@/components/ui/textarea";

const SharedNotebookPage = () => {
  const { token } = useParams<{ token: string }>();
  const { notebook: nb, loading, submit, update, remove } = useMyReaderNotes(token);
  const [pendingAnchor, setPendingAnchor] = useState<PinAnchor | null>(null);
  const thoughtsRef = useRef<HTMLParagraphElement>(null);
  const myTakeRef = useRef<HTMLParagraphElement>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editBody, setEditBody] = useState("");

  // Capture text selection inside Thoughts/My Take and convert to a pin anchor
  useEffect(() => {
    const handler = () => {
      const sel = window.getSelection();
      if (!sel || sel.isCollapsed || sel.rangeCount === 0) return;
      const range = sel.getRangeAt(0);
      const text = sel.toString().trim();
      if (!text) return;
      const tEl = thoughtsRef.current;
      const mEl = myTakeRef.current;
      const inThoughts = tEl && tEl.contains(range.commonAncestorContainer);
      const inMyTake = mEl && mEl.contains(range.commonAncestorContainer);
      if (!inThoughts && !inMyTake) return;
      const sourceText = (inThoughts ? tEl?.textContent : mEl?.textContent) || "";
      const start = sourceText.indexOf(text);
      setPendingAnchor({
        kind: inThoughts ? "thought" : "my_take",
        excerpt: text.length > 240 ? text.slice(0, 240) + "…" : text,
        char_start: start >= 0 ? start : 0,
        char_end: start >= 0 ? start + text.length : text.length,
      });
    };
    document.addEventListener("mouseup", handler);
    document.addEventListener("touchend", handler);
    return () => {
      document.removeEventListener("mouseup", handler);
      document.removeEventListener("touchend", handler);
    };
  }, []);

  const title = nb?.display_title || nb?.session_title || "Untitled session";
  const thoughts = ((nb?.thoughts as any)?.blocks?.[0]?.value || "").trim();

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-2xl lg:max-w-3xl mx-auto px-4 lg:px-8 py-6 sm:py-8 lg:py-12">
        <Link
          to="/"
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground mb-6"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Dynamo
        </Link>

        {loading ? (
          <div className="space-y-3">
            <div className="h-6 bg-accent rounded animate-pulse w-2/3" />
            <div className="h-4 bg-accent rounded animate-pulse w-1/3" />
          </div>
        ) : !nb ? (
          <div className="border border-dashed border-border rounded-xl p-8 text-center">
            <h1 className="font-display text-xl mb-1">Notebook not found</h1>
            <p className="text-sm text-muted-foreground font-body">
              The link may have been revoked or never existed.
            </p>
          </div>
        ) : (
          <motion.article
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            <header>
              <div className="inline-flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-muted-foreground mb-2">
                <BookOpen className="w-3 h-3" /> Shared notebook
              </div>
              <h1 className="font-display text-2xl sm:text-3xl lg:text-4xl mb-2">{title}</h1>
              {nb.session_created_at && (
                <p className="text-xs text-muted-foreground font-body">
                  Recorded{" "}
                  {new Date(nb.session_created_at).toLocaleDateString(undefined, {
                    month: "long",
                    day: "numeric",
                    year: "numeric",
                  })}
                </p>
              )}
            </header>

            {nb.my_take && (
              <section>
                <h2 className="font-display text-lg mb-2">My Take</h2>
                <p
                  ref={myTakeRef}
                  className="text-sm text-foreground/90 font-body whitespace-pre-wrap leading-relaxed"
                >
                  {nb.my_take}
                </p>
              </section>
            )}

            {thoughts && (
              <section>
                <h2 className="font-display text-lg mb-2">Thoughts</h2>
                <p
                  ref={thoughtsRef}
                  className="text-sm text-foreground/85 font-body whitespace-pre-wrap leading-relaxed"
                >
                  {thoughts}
                </p>
              </section>
            )}

            {!nb.my_take && !thoughts && (
              <p className="text-sm italic text-muted-foreground">This notebook is empty.</p>
            )}

            {/* Recipient's previously-sent notes */}
            {nb.my_notes && nb.my_notes.length > 0 && (
              <section className="pt-4 border-t border-border">
                <h2 className="font-display text-base mb-2">Your notes</h2>
                <div className="space-y-2">
                  {nb.my_notes.map((n) => (
                    <div
                      key={n.id}
                      className="rounded-md border border-foreground/10 bg-background p-3"
                      style={{ borderWidth: "0.5px" }}
                    >
                      {n.anchor_excerpt && (
                        <div className="mb-1.5 pl-2 border-l-2 border-foreground/20 text-[11px] italic text-muted-foreground line-clamp-2">
                          “{n.anchor_excerpt}”
                          <span className="ml-1 not-italic text-[10px] uppercase tracking-wider">
                            · {n.anchor_kind === "my_take" ? "My Take" : "Thought"}
                          </span>
                        </div>
                      )}
                      {editingId === n.id ? (
                        <div className="space-y-2">
                          <Textarea
                            value={editBody}
                            onChange={(e) => setEditBody(e.target.value)}
                            rows={3}
                            className="text-sm font-body"
                          />
                          <div className="flex justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => setEditingId(null)}
                              className="text-xs text-muted-foreground hover:text-foreground"
                            >
                              Cancel
                            </button>
                            <button
                              type="button"
                              onClick={async () => {
                                await update(n.id, editBody);
                                setEditingId(null);
                              }}
                              className="inline-flex items-center gap-1 text-xs px-2 py-1 bg-foreground text-background rounded"
                            >
                              <Check className="w-3 h-3" /> Save
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <p className="text-sm text-foreground/90 font-body whitespace-pre-wrap break-words leading-relaxed">
                            {n.body}
                          </p>
                          <div className="flex justify-end gap-1 mt-1">
                            <button
                              type="button"
                              onClick={() => {
                                setEditingId(n.id);
                                setEditBody(n.body);
                              }}
                              className="p-1 text-muted-foreground hover:text-foreground"
                              aria-label="Edit"
                              title="Edit"
                            >
                              <Pencil className="w-3 h-3" />
                            </button>
                            <button
                              type="button"
                              onClick={() => remove(n.id)}
                              className="p-1 text-muted-foreground hover:text-foreground"
                              aria-label="Delete"
                              title="Delete"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Composer */}
            <section className="pt-4 border-t border-border">
              <LeaveReaderNoteComposer
                onSubmit={submit}
                pendingAnchor={pendingAnchor}
                clearAnchor={() => setPendingAnchor(null)}
              />
            </section>
          </motion.article>
        )}
      </div>
    </div>
  );
};

export default SharedNotebookPage;