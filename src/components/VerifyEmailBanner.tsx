import { useAuth } from "@/contexts/AuthContext";
import { isVerified, resendVerification } from "@/lib/verification";
import { MailWarning } from "lucide-react";
import { useState } from "react";

const VerifyEmailBanner = () => {
  const { user } = useAuth();
  const [dismissed, setDismissed] = useState(false);
  const [sending, setSending] = useState(false);

  if (!user || isVerified(user) || dismissed) return null;

  const handleResend = async () => {
    if (!user.email) return;
    setSending(true);
    await resendVerification(user.email);
    setSending(false);
  };

  return (
    <div className="w-full bg-foreground/[0.04] border-b border-border/40 px-4 py-2 flex items-center justify-center gap-3 text-xs font-body">
      <MailWarning className="w-3.5 h-3.5 text-foreground/60" strokeWidth={1.5} />
      <span className="text-foreground/80">Verify your email to unlock all features.</span>
      <button
        onClick={handleResend}
        disabled={sending}
        className="underline text-foreground hover:opacity-70 transition-opacity disabled:opacity-50"
      >
        {sending ? "Sending…" : "Resend"}
      </button>
      <button
        onClick={() => setDismissed(true)}
        aria-label="Dismiss"
        className="text-foreground/40 hover:text-foreground transition-colors ml-1"
      >
        ×
      </button>
    </div>
  );
};

export default VerifyEmailBanner;