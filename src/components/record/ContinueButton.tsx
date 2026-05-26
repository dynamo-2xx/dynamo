import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { Loader2, ArrowRight } from "lucide-react";

/**
 * §24 Continue button — visible only to the original owner on a completed
 * Debate / Live record. Opens a "bring participants?" modal then calls
 * the matching SECURITY DEFINER RPC and navigates to the new record.
 */
interface Props {
  kind: "debate" | "live_session";
  sourceId: string;
  isOwner: boolean;
  isCompleted: boolean;
  variant?: "default" | "secondary" | "outline";
}

const ERROR_COPY: Record<string, string> = {
  auth_required: "Please sign in to continue this record.",
  source_not_found: "This record no longer exists.",
  only_owner_can_continue: "Only the original creator can start a continuation.",
  source_not_completed: "Wait until this record is fully completed.",
};

export default function ContinueButton({
  kind, sourceId, isOwner, isCompleted, variant = "outline",
}: Props) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  if (!isOwner || !isCompleted) return null;

  const runContinue = async (bringParticipants: boolean) => {
    setBusy(true);
    const rpc = kind === "debate" ? "continue_debate" : "continue_live_session";
    const { data, error } = await (supabase as any).rpc(rpc, {
      _source_id: sourceId,
      _bring_participants: bringParticipants,
    });
    setBusy(false);
    if (error) {
      const msg = ERROR_COPY[error.message?.trim() ?? ""] ?? "Couldn't continue this record.";
      toast({ title: "Continue failed", description: msg, variant: "destructive" });
      return;
    }
    setOpen(false);
    const newId = data as string;
    if (kind === "debate") navigate(`/create?edit=${newId}`);
    else navigate(`/live/${newId}`);
  };

  return (
    <>
      <Button variant={variant} size="sm" onClick={() => setOpen(true)} className="gap-1.5">
        Continue
        <ArrowRight className="w-3.5 h-3.5" />
      </Button>
      <Dialog open={open} onOpenChange={(o) => !busy && setOpen(o)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Start a continuation</DialogTitle>
            <DialogDescription>
              We'll clone the {kind === "debate" ? "debate" : "session"} setup into a new
              record linked back to this one. Counts as one record toward your monthly quota.
            </DialogDescription>
          </DialogHeader>
          <div className="text-sm text-muted-foreground">
            Bring participants from the previous session?
          </div>
          <DialogFooter className="flex-col gap-2 sm:flex-row">
            <Button
              variant="outline" disabled={busy}
              onClick={() => runContinue(false)} className="flex-1"
            >
              No, just me
            </Button>
            <Button
              disabled={busy}
              onClick={() => runContinue(true)} className="flex-1"
            >
              {busy && <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />}
              Yes, re-invite
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}