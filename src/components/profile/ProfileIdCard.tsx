import { useEffect, useMemo, useState } from "react";
import { Camera, Loader2, User as UserIcon, Copy, Check } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { makeQrDataUrl } from "@/lib/qr";
import { monoGradientFromSeed } from "@/lib/gradient";
import { Input } from "@/components/ui/input";

export interface ProfileIdCardProps {
  variant?: "display" | "edit";
  onAvatarClick?: () => void;
  onBannerClick?: () => void;
  onNameChange?: (v: string) => void;
  uploading?: "avatar" | "banner" | null;
  overrides?: {
    display_name?: string;
    avatar_url?: string | null;
    banner_url?: string | null;
  };
}

const formatJoined = (iso?: string | null) => {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString(undefined, { month: "short", year: "numeric" });
  } catch {
    return "—";
  }
};

const ProfileIdCard = ({
  variant = "display",
  onAvatarClick,
  onBannerClick,
  onNameChange,
  uploading,
  overrides,
}: ProfileIdCardProps) => {
  const { user, profile } = useAuth();

  const displayName =
    overrides?.display_name ??
    profile?.display_name ??
    user?.email?.split("@")[0] ??
    "";
  const avatarUrl = overrides?.avatar_url ?? profile?.avatar_url ?? null;
  const bannerUrl = overrides?.banner_url ?? profile?.banner_url ?? null;

  const handle = (profile?.display_name || user?.email?.split("@")[0] || "you")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");

  const friendCode = (profile as any)?.friend_code as string | undefined;
  const joined = formatJoined((profile as any)?.created_at);

  const bannerStyle = useMemo(
    () =>
      bannerUrl
        ? { backgroundImage: `url(${bannerUrl})` }
        : { backgroundImage: monoGradientFromSeed(displayName || user?.id || "d.") },
    [bannerUrl, displayName, user?.id],
  );

  const [qr, setQr] = useState<string>("");
  useEffect(() => {
    if (!friendCode) return;
    makeQrDataUrl(friendCode, 240).then(setQr).catch(() => {});
  }, [friendCode]);

  const [copied, setCopied] = useState(false);
  const copyCode = async () => {
    if (!friendCode) return;
    try {
      await navigator.clipboard.writeText(friendCode);
      setCopied(true);
      toast.success("Friend code copied");
      setTimeout(() => setCopied(false), 1400);
    } catch {
      toast.error("Could not copy");
    }
  };

  const isEdit = variant === "edit";

  return (
    <div className="w-full bg-card border border-border rounded-2xl overflow-hidden">
      {/* Banner */}
      <div className="relative">
        <div
          className="w-full aspect-[5/2] sm:aspect-[3/1] bg-cover bg-center"
          style={bannerStyle as any}
          aria-hidden
        />
        {isEdit && (
          <button
            type="button"
            onClick={onBannerClick}
            disabled={uploading === "banner"}
            className="absolute top-3 right-3 inline-flex items-center gap-1.5 rounded-full bg-background/90 backdrop-blur px-3 py-1.5 text-xs font-body font-medium border border-border hover:bg-background transition-colors min-h-[36px]"
          >
            {uploading === "banner" ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Camera className="w-3.5 h-3.5" />
            )}
            Banner
          </button>
        )}
      </div>

      {/* Identity row */}
      <div className="px-4 sm:px-5 pb-4">
        <div className="flex items-end gap-3 sm:gap-4 -mt-10 sm:-mt-12 min-w-0">
          <div className="relative shrink-0">
            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-accent border-4 border-card overflow-hidden flex items-center justify-center">
              {avatarUrl ? (
                <img src={avatarUrl} alt={displayName} className="w-full h-full object-cover" />
              ) : (
                <UserIcon className="w-7 h-7 text-muted-foreground" />
              )}
            </div>
            {isEdit && (
              <button
                type="button"
                onClick={onAvatarClick}
                disabled={uploading === "avatar"}
                aria-label="Change avatar"
                className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-foreground text-background flex items-center justify-center shadow-md hover:opacity-90 transition-opacity"
              >
                {uploading === "avatar" ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Camera className="w-3.5 h-3.5" />
                )}
              </button>
            )}
          </div>

          <div className="flex-1 min-w-0 pb-1">
            {isEdit ? (
              <Input
                value={overrides?.display_name ?? ""}
                onChange={(e) => onNameChange?.(e.target.value)}
                placeholder="Your name"
                className="font-display text-lg sm:text-xl h-9 px-2 -ml-2 border-transparent hover:border-border focus-visible:border-border bg-transparent"
              />
            ) : (
              <p className="font-display text-lg sm:text-xl leading-tight truncate">
                {displayName || "Unnamed"}
              </p>
            )}
            <p className="font-body text-xs text-muted-foreground truncate">
              @{handle}
              <span className="mx-1.5 opacity-60">·</span>
              <span className="whitespace-nowrap">Joined {joined}</span>
            </p>
          </div>
        </div>
      </div>

      {/* Friend code + QR */}
      <div className="border-t border-border/60 px-4 sm:px-5 py-3 sm:py-4 flex items-center gap-3 sm:gap-4">
        <div className="flex-1 min-w-0">
          <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground font-body">
            Friend code
          </p>
          <button
            type="button"
            onClick={copyCode}
            disabled={!friendCode}
            className="mt-1 inline-flex items-center gap-2 max-w-full group"
          >
            <span className="font-mono text-sm sm:text-base tracking-[0.15em] tabular-nums truncate">
              {friendCode ?? "—"}
            </span>
            {friendCode &&
              (copied ? (
                <Check className="w-3.5 h-3.5 shrink-0 text-foreground" />
              ) : (
                <Copy className="w-3.5 h-3.5 shrink-0 text-muted-foreground group-hover:text-foreground transition-colors" />
              ))}
          </button>
        </div>
        <div className="shrink-0">
          {qr ? (
            <img
              src={qr}
              alt="Friend code QR"
              className="w-14 h-14 sm:w-16 sm:h-16 rounded-md border border-border bg-background"
            />
          ) : (
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-md border border-border bg-muted/40" />
          )}
        </div>
      </div>
    </div>
  );
};

export default ProfileIdCard;