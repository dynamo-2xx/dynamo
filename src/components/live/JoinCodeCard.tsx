import { forwardRef, useEffect, useState } from "react";
import QRCode from "qrcode";
import { Copy, Share2, Check } from "lucide-react";
import { toast } from "sonner";

interface Props {
  code: string;
  sessionTitle?: string | null;
}

const JoinCodeCard = forwardRef<HTMLDivElement, Props>(({ code, sessionTitle }, ref) => {
  const [qrSrc, setQrSrc] = useState<string>("");
  const [copied, setCopied] = useState(false);

  const joinUrl = `${window.location.origin}/live/join/${code}`;

  useEffect(() => {
    QRCode.toDataURL(joinUrl, { width: 256, margin: 1, color: { dark: "#0a0a0a", light: "#ffffff" } })
      .then(setQrSrc)
      .catch(() => {});
  }, [joinUrl]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(joinUrl);
      setCopied(true);
      toast.success("Link copied");
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error("Could not copy");
    }
  };

  const share = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: sessionTitle || "Join my Live session",
          text: `Join my Live session — code ${code}`,
          url: joinUrl,
        });
      } catch {}
    } else {
      copy();
    }
  };

  return (
    <div className="bg-card border border-border rounded-2xl p-4 sm:p-5 space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
            Invite people
          </p>
          <p className="font-display text-2xl sm:text-3xl tracking-[0.3em] font-bold mt-1">
            {code}
          </p>
        </div>
        {qrSrc && (
          <img
            src={qrSrc}
            alt="Join QR code"
            className="w-20 h-20 sm:w-24 sm:h-24 rounded-lg border border-border"
          />
        )}
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={copy}
          className="flex-1 min-h-[44px] flex items-center justify-center gap-2 bg-secondary/60 hover:bg-secondary text-foreground border border-border rounded-xl text-sm font-semibold transition-colors"
        >
          {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
          {copied ? "Copied" : "Copy link"}
        </button>
        <button
          onClick={share}
          className="min-h-[44px] px-4 flex items-center justify-center gap-2 bg-primary text-primary-foreground rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity"
        >
          <Share2 className="w-4 h-4" />
          Share
        </button>
      </div>

      <p className="text-[11px] text-muted-foreground leading-relaxed">
        Anyone with the code can join from their phone. Each person becomes their
        own speaker — their voice is captured on their device.
      </p>
    </div>
  );
};

export default JoinCodeCard;
