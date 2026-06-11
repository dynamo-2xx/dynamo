import { useState } from "react";
import type { TranscriptDensity } from "@/components/live/LiveThreadView";

interface Props {
  speakerName: string;
  avatarUrl?: string | null;
  text: string;
  timestamp?: number;
  align?: "left" | "right";
  density?: TranscriptDensity;
  showTimestamp?: boolean;
}

const isEmoji = (s: string) => !!s && s.length <= 4 && !/^https?:\/\//.test(s);

const LiveTranscriptBubble = ({
  speakerName,
  avatarUrl,
  text,
  timestamp,
  align = "left",
  density = "comfortable",
  showTimestamp = true,
}: Props) => {
  const [hover, setHover] = useState(false);
  const initials = speakerName
    .split(/\s+/)
    .map((s) => s[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const time = timestamp
    ? new Date(timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    : null;

  const isCompact = density === "compact";
  const isCinema = density === "cinema";

  const avatarBase = isCompact ? "w-6 h-6" : "w-7 h-7";
  const avatarHover = isCompact ? "w-9 h-9" : isCinema ? "w-12 h-12" : "w-11 h-11";
  const bubblePad = isCompact ? "px-2.5 py-1.5" : isCinema ? "px-4 py-3" : "px-3.5 py-2.5";
  const textSize = isCompact ? "text-xs" : isCinema ? "text-base sm:text-lg" : "text-sm";
  const bubbleBg = isCinema
    ? "bg-background/90 border-foreground/20"
    : "bg-background/70 border-foreground/10";

  return (
    <div
      className={`group flex items-start gap-2 ${
        align === "right" ? "flex-row-reverse" : ""
      }`}
    >
      <div
        className="relative shrink-0"
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
      >
        <div
          className={`relative rounded-full bg-muted overflow-hidden flex items-center justify-center border border-foreground/10 transition-all duration-200 ease-out ${
            hover ? avatarHover : avatarBase
          }`}
        >
          {avatarUrl && !isEmoji(avatarUrl) ? (
            <img src={avatarUrl} alt={speakerName} className="w-full h-full object-cover" />
          ) : avatarUrl && isEmoji(avatarUrl) ? (
            <span className={hover ? "text-xl" : "text-sm"}>{avatarUrl}</span>
          ) : (
            <span className={`font-semibold text-foreground ${hover ? "text-sm" : "text-[10px]"}`}>
              {initials || "?"}
            </span>
          )}
        </div>
        <div
          className={`absolute top-1/2 -translate-y-1/2 ${
            align === "right" ? "right-full mr-2" : "left-full ml-2"
          } whitespace-nowrap rounded-full bg-background/90 backdrop-blur-md border border-foreground/10 px-2.5 py-1 text-[11px] font-semibold text-foreground shadow-sm transition-all duration-200 ${
            hover ? "opacity-100 translate-x-0" : "opacity-0 pointer-events-none -translate-x-1"
          }`}
        >
          {speakerName}
        </div>
      </div>

      <div
        className={`max-w-[85%] rounded-2xl backdrop-blur-xl border shadow-sm ${bubbleBg} ${bubblePad} ${
          align === "right" ? "text-right" : ""
        }`}
      >
        {(!isCompact || showTimestamp) && (
          <div className="flex items-baseline gap-2 mb-0.5">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              {speakerName}
            </span>
            {showTimestamp && time && (
              <span className="text-[10px] text-muted-foreground/70">{time}</span>
            )}
          </div>
        )}
        <p className={`${textSize} font-body text-foreground leading-relaxed whitespace-pre-wrap`}>
          {text}
        </p>
      </div>
    </div>
  );
};

export default LiveTranscriptBubble;
