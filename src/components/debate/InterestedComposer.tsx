import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, Send } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { getOrCreateThread } from "@/hooks/useDirectMessages";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { createNotification } from "@/lib/notifications";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  debateId: string;
  debateTopic: string;
  publisherId: string;
  publisherName: string;
  sides: { id: string; label: string }[];
}

const buildDefault = (role: string) =>
  `I would like to participate as a ${role}. What time shall we meet?`;

const InterestedComposer = ({
  open,
  onOpenChange,
  debateId,
  debateTopic,
  publisherId,
  publisherName,
  sides,
}: Props) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const roles = useMemo(() => [...sides.map((s) => s.label), "Spectator"], [sides]);
  const [selectedRole, setSelectedRole] = useState<string>(roles[0] ?? "Spectator");
  const [body, setBody] = useState<string>(buildDefault(roles[0] ?? "Spectator"));
  const [sending, setSending] = useState(false);
  const [sentThreadId, setSentThreadId] = useState<string | null>(null);

  // Reset when dialog opens
  useEffect(() => {
    if (open) {
      const initial = roles[0] ?? "Spectator";
      setSelectedRole(initial);
      setBody(buildDefault(initial));
      setSentThreadId(null);
    }
  }, [open, roles]);

  const pickRole = (role: string) => {
    setSelectedRole(role);
    setBody(buildDefault(role));
  };

  const send = async () => {
    if (!user) {
      toast.error("Please sign in to send a message");
      return;
    }
    if (!body.trim()) return;
    setSending(true);
    const threadId = await getOrCreateThread(publisherId, debateId);
    if (!threadId) {
      setSending(false);
      toast.error("Couldn't open conversation");
      return;
    }
    const { error } = await (supabase as any).from("dm_messages").insert({
      thread_id: threadId,
      sender_id: user.id,
      body: body.trim(),
    });
    setSending(false);
    if (error) {
      console.error(error);
      toast.error("Couldn't send message");
      return;
    }
    // Fire a notification (best-effort)
    createNotification({
      recipient_id: publisherId,
      actor_id: user.id,
      debate_id: debateId,
      type: "direct_message",
      title: "New message",
      body: `About: ${debateTopic}`,
      metadata: { thread_id: threadId },
    });
    setSentThreadId(threadId);
    toast.success("Message sent");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display text-xl">
            {sentThreadId ? "Message sent" : `Message ${publisherName}`}
          </DialogTitle>
          <DialogDescription className="font-body text-xs">
            {sentThreadId
              ? "Continue the conversation in your inbox."
              : "Pick a role to autofill — edit freely before sending."}
          </DialogDescription>
        </DialogHeader>

        {sentThreadId ? (
          <button
            type="button"
            onClick={() => {
              onOpenChange(false);
              navigate(`/messages/${sentThreadId}`);
            }}
            className="w-full mt-2 inline-flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-foreground text-background text-sm font-body font-medium hover:opacity-90 transition-opacity"
          >
            Open conversation
          </button>
        ) : (
          <>
            <div className="flex flex-wrap gap-2 mt-2">
              {roles.map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => pickRole(r)}
                  className={cn(
                    "px-3 py-1.5 rounded-full text-xs font-body border transition-colors",
                    selectedRole === r
                      ? "bg-foreground text-background border-foreground"
                      : "bg-background text-foreground border-border hover:bg-accent",
                  )}
                >
                  {r}
                </button>
              ))}
            </div>

            <Textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={4}
              className="mt-3 font-body text-sm"
              placeholder="Write your message…"
            />

            <button
              type="button"
              onClick={send}
              disabled={sending || !body.trim()}
              className="mt-2 w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-foreground text-background text-sm font-body font-medium hover:opacity-90 disabled:opacity-50 transition-opacity"
            >
              {sending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  Send message
                </>
              )}
            </button>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default InterestedComposer;
