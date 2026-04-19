import { useState } from "react";

interface Props {
  speakerName: string;
  avatarUrl?: string | null;
  text: string;
  timestamp?: number;
  /** Right-align the bubble (e.g. when it's "you") */
  align?: "left" | "right";
}

const isEmoji = (s: string) => !!s && s.length <= 4 && !/^https?:\/\//.test(s);

const LiveTranscriptBubble = ({
  speakerName,
  avatarUrl,
  text,
  timestamp,
  align = "left",
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

  return (
    <div
      className={`group flex items-start gap-2 ${
        align === "right" ? "flex-row-reverse" : ""
      }`}
    >
      {/* Avatar with hover-expand + name chip */}
      <div
        className="relative shrink-0"
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
      >
        <div
          className={`relative rounded-full bg-muted overflow-hidden flex items-center justify-center border border-foreground/10 transition-all duration-200 ease-out ${
            hover ? "w-11 h-11" : "w-7 h-7"
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
        {/* Hover name chip */}
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

      {/* Translucent message bubble */}
      <div
        className={`max-w-[85%] rounded-2xl bg-background/70 backdrop-blur-xl border border-foreground/10 px-3.5 py-2.5 shadow-sm ${
          align === "right" ? "text-right" : ""
        }`}
      >
        <div className="flex items-baseline gap-2 mb-0.5">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            {speakerName}
          </span>
          {time && <span className="text-[10px] text-muted-foreground/70">{time}</span>}
        </div>
        <p className="text-sm font-body text-foreground leading-relaxed whitespace-pre-wrap">
          {text}
        </p>
      </div>
    </div>
  );
};

export default LiveTranscriptBubble;
