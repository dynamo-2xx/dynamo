import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { MessageCircle, Trash2, Reply } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useRecordComments, type RecordType, type RecordComment } from "@/hooks/useRecordComments";
import AuthPromptDialog from "@/components/AuthPromptDialog";
import { cn } from "@/lib/utils";

interface Props {
  recordType: RecordType;
  recordId: string;
  className?: string;
  title?: string;
}

const formatRelative = (iso: string) => {
  const d = new Date(iso).getTime();
  const diff = Date.now() - d;
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  const days = Math.floor(h / 24);
  if (days < 7) return `${days}d`;
  return new Date(iso).toLocaleDateString();
};

const Avatar = ({ name, url }: { name: string; url?: string | null }) => {
  const initials = (name || "?")
    .split(" ")
    .map((s) => s[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
  return url ? (
    <img src={url} alt="" className="w-7 h-7 rounded-full object-cover bg-muted shrink-0" />
  ) : (
    <div className="w-7 h-7 rounded-full bg-muted text-foreground/70 text-[11px] font-body flex items-center justify-center shrink-0">
      {initials || "?"}
    </div>
  );
};

const CommentRow = ({
  c,
  canDelete,
  onDelete,
  onReply,
  isReply,
}: {
  c: RecordComment;
  canDelete: boolean;
  onDelete: () => void;
  onReply?: () => void;
  isReply?: boolean;
}) => (
  <div className={cn("flex gap-3 py-3", isReply && "pl-8")}>
    <Avatar name={c.author_name || "User"} url={c.author_avatar} />
    <div className="flex-1 min-w-0">
      <div className="flex items-baseline gap-2 mb-0.5">
        <span className="text-sm font-body font-medium text-foreground truncate">
          {c.author_name || "User"}
        </span>
        <span className="text-[11px] text-muted-foreground">{formatRelative(c.created_at)}</span>
      </div>
      <p className="text-sm font-body text-foreground whitespace-pre-wrap break-words">{c.body}</p>
      <div className="flex items-center gap-3 mt-1">
        {onReply && (
          <button
            type="button"
            onClick={onReply}
            className="text-[11px] text-muted-foreground hover:text-foreground transition-colors inline-flex items-center gap-1"
          >
            <Reply className="w-3 h-3" /> Reply
          </button>
        )}
        {canDelete && (
          <button
            type="button"
            onClick={onDelete}
            className="text-[11px] text-muted-foreground hover:text-destructive transition-colors inline-flex items-center gap-1"
          >
            <Trash2 className="w-3 h-3" /> Delete
          </button>
        )}
      </div>
    </div>
  </div>
);

const RecordCommentsSection = ({ recordType, recordId, className, title = "Comments" }: Props) => {
  const { user } = useAuth();
  const { items, loading, post, remove } = useRecordComments(recordType, recordId);
  const [body, setBody] = useState("");
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [replyBody, setReplyBody] = useState("");
  const [authOpen, setAuthOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const { roots, byParent } = useMemo(() => {
    const roots: RecordComment[] = [];
    const byParent = new Map<string, RecordComment[]>();
    items.forEach((c) => {
      if (!c.parent_id) roots.push(c);
      else {
        const arr = byParent.get(c.parent_id) || [];
        arr.push(c);
        byParent.set(c.parent_id, arr);
      }
    });
    return { roots, byParent };
  }, [items]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      setAuthOpen(true);
      return;
    }
    if (!body.trim() || submitting) return;
    setSubmitting(true);
    const { error } = await post(body);
    setSubmitting(false);
    if (!error) setBody("");
  };

  const handleReply = async (parentId: string) => {
    if (!user) {
      setAuthOpen(true);
      return;
    }
    if (!replyBody.trim()) return;
    const { error } = await post(replyBody, parentId);
    if (!error) {
      setReplyBody("");
      setReplyTo(null);
    }
  };

  return (
    <section className={cn("border border-border rounded-2xl bg-card p-4 sm:p-5", className)}>
      <header className="flex items-center gap-2 mb-3">
        <MessageCircle className="w-4 h-4 text-foreground/70" />
        <h2 className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground font-body font-medium">
          {title}
          <span className="ml-2 text-foreground/50 normal-case tracking-normal">{items.length}</span>
        </h2>
      </header>

      {/* Composer */}
      {user ? (
        <form onSubmit={handleSubmit} className="flex flex-col gap-2 mb-4">
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={2}
            maxLength={4000}
            placeholder="Add a comment…"
            className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm font-body text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-foreground/30 transition-colors resize-y"
          />
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={!body.trim() || submitting}
              className="px-4 py-1.5 rounded-full bg-foreground text-background text-xs font-body disabled:opacity-40 hover:opacity-90 transition-opacity"
            >
              {submitting ? "Posting…" : "Post"}
            </button>
          </div>
        </form>
      ) : (
        <div className="mb-4 p-3 rounded-lg border border-dashed border-border text-sm font-body text-muted-foreground flex items-center justify-between gap-3">
          <span>Sign in to join the discussion.</span>
          <Link
            to="/auth"
            className="px-3 py-1.5 rounded-full bg-foreground text-background text-xs whitespace-nowrap hover:opacity-90 transition-opacity"
          >
            Sign in
          </Link>
        </div>
      )}

      {/* List */}
      {loading ? (
        <p className="text-sm text-muted-foreground italic py-4">Loading…</p>
      ) : roots.length === 0 ? (
        <p className="text-sm text-muted-foreground italic py-4">No comments yet — be the first.</p>
      ) : (
        <div className="divide-y divide-border">
          {roots.map((c) => (
            <div key={c.id}>
              <CommentRow
                c={c}
                canDelete={user?.id === c.user_id}
                onDelete={() => remove(c.id)}
                onReply={() => setReplyTo(replyTo === c.id ? null : c.id)}
              />
              {replyTo === c.id && (
                <div className="pl-8 pb-3">
                  <textarea
                    value={replyBody}
                    onChange={(e) => setReplyBody(e.target.value)}
                    rows={2}
                    placeholder={`Reply to ${c.author_name || "comment"}…`}
                    className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm font-body focus:outline-none focus:border-foreground/30"
                  />
                  <div className="flex justify-end gap-2 mt-2">
                    <button
                      type="button"
                      onClick={() => {
                        setReplyTo(null);
                        setReplyBody("");
                      }}
                      className="px-3 py-1 rounded-full text-xs text-muted-foreground hover:text-foreground transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={() => handleReply(c.id)}
                      disabled={!replyBody.trim()}
                      className="px-3 py-1 rounded-full bg-foreground text-background text-xs disabled:opacity-40"
                    >
                      Reply
                    </button>
                  </div>
                </div>
              )}
              {(byParent.get(c.id) || []).map((r) => (
                <CommentRow
                  key={r.id}
                  c={r}
                  canDelete={user?.id === r.user_id}
                  onDelete={() => remove(r.id)}
                  isReply
                />
              ))}
            </div>
          ))}
        </div>
      )}

      <AuthPromptDialog
        open={authOpen}
        onOpenChange={setAuthOpen}
        title="Sign in to comment"
        description="Create an account or log in to join the conversation."
      />
    </section>
  );
};

export default RecordCommentsSection;