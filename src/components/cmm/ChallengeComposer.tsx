import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  debateId: string;
  topic: string;
  onJoined?: () => void;
}

const MAX = 280;

const ChallengeComposer = ({ open, onOpenChange, debateId, topic, onJoined }: Props) => {
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    const v = text.trim();
    if (v.length < 4) {
      toast.error("Write a sentence or two about your position.");
      return;
    }
    if (v.length > MAX) {
      toast.error(`Keep it under ${MAX} characters.`);
      return;
    }
    setBusy(true);
    const { error } = await supabase.rpc("cmm_join_queue" as any, {
      _debate_id: debateId,
      _position: v,
      _preferred_subtopic: null,
    });
    setBusy(false);
    if (error) {
      toast.error(error.message || "Couldn't join the queue.");
      return;
    }
    toast.success("You're in the queue.");
    setText("");
    onJoined?.();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl">Your position</DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground line-clamp-2">
            On: {topic}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <Textarea
            autoFocus
            value={text}
            onChange={(e) => setText(e.target.value.slice(0, MAX))}
            placeholder="In one or two sentences, what's your stance?"
            rows={4}
            className="resize-none"
          />
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>{text.length}/{MAX}</span>
            <Button onClick={submit} disabled={busy || text.trim().length < 4}>
              {busy ? "Joining…" : "Join queue"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ChallengeComposer;