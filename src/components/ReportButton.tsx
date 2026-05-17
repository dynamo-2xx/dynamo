import { useState } from "react";
import { Flag } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { reportContent, type ReportInput, type ReportReason } from "@/lib/reports";

/**
 * §15 Trust & Safety — Universal report affordance. Drop in next to any
 * reportable surface (message, transcript entry, profile, etc.).
 */
interface ReportButtonProps {
  target: Pick<ReportInput, "targetType" | "targetId">;
  variant?: "icon" | "text";
  className?: string;
}

const REASONS: { value: ReportReason; label: string }[] = [
  { value: "spam", label: "Spam" },
  { value: "harassment", label: "Harassment or bullying" },
  { value: "hate", label: "Hate speech" },
  { value: "sexual", label: "Sexual content" },
  { value: "violence", label: "Violence or threats" },
  { value: "misinformation", label: "Misinformation" },
  { value: "self_harm", label: "Self-harm" },
  { value: "other", label: "Other" },
];

const ReportButton = ({ target, variant = "icon", className }: ReportButtonProps) => {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<ReportReason>("spam");
  const [details, setDetails] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    setSubmitting(true);
    const ok = await reportContent({ ...target, reason, details: details || undefined });
    setSubmitting(false);
    if (ok) {
      setOpen(false);
      setDetails("");
      setReason("spam");
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {variant === "icon" ? (
          <button
            type="button"
            aria-label="Report content"
            className={`p-1.5 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted transition ${className ?? ""}`}
          >
            <Flag className="w-3.5 h-3.5" />
          </button>
        ) : (
          <Button variant="ghost" size="sm" className={className}>
            <Flag className="w-3.5 h-3.5 mr-1.5" /> Report
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Report content</DialogTitle>
        </DialogHeader>
        <RadioGroup value={reason} onValueChange={(v) => setReason(v as ReportReason)} className="space-y-2">
          {REASONS.map((r) => (
            <div key={r.value} className="flex items-center gap-2">
              <RadioGroupItem value={r.value} id={`r-${r.value}`} />
              <Label htmlFor={`r-${r.value}`} className="text-sm font-body cursor-pointer">{r.label}</Label>
            </div>
          ))}
        </RadioGroup>
        <Textarea
          placeholder="Optional context (max 500 chars)"
          value={details}
          maxLength={500}
          onChange={(e) => setDetails(e.target.value)}
          className="text-sm font-body"
          rows={3}
        />
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={submitting}>Cancel</Button>
          <Button onClick={submit} disabled={submitting}>{submitting ? "Sending…" : "Submit report"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ReportButton;