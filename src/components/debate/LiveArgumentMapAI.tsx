import { motion, AnimatePresence } from "framer-motion";
import { Zap, ArrowRight, Quote, AlertTriangle, FileText } from "lucide-react";
import type { ArgumentMapEntry } from "@/hooks/useDeepgramTranscription";

interface LiveArgumentMapAIProps {
  entries: ArgumentMapEntry[];
  compact?: boolean;
}

const typeIcon = (type: string) => {
  switch (type) {
    case "counter": return <ArrowRight className="w-2.5 h-2.5" />;
    case "quote": return <Quote className="w-2.5 h-2.5" />;
    case "stake": return <AlertTriangle className="w-2.5 h-2.5" />;
    case "evidence": return <FileText className="w-2.5 h-2.5" />;
    default: return null;
  }
};

const typeLabel = (type: string) => {
  switch (type) {
    case "counter": return "Counter";
    case "quote": return "Quote";
    case "stake": return "Stake";
    case "evidence": return "Evidence";
    case "claim": return "Claim";
    default: return type;
  }
};

const LiveArgumentMapAI = ({ entries, compact = false }: LiveArgumentMapAIProps) => {
  if (entries.length === 0) {
    return (
      <div className={`flex items-center justify-center gap-2 ${compact ? "py-3" : "py-6"} text-muted-foreground`}>
        <Zap className="w-3.5 h-3.5" />
        <span className={compact ? "text-[10px]" : "text-xs"}>AI analyzing speech…</span>
      </div>
    );
  }

  // Build threaded structure
  const rootEntries = entries.filter((e) => e.parent_index === undefined || e.parent_index === null);
  const childrenByParent = new Map<number, ArgumentMapEntry[]>();
  entries.forEach((e, i) => {
    if (e.parent_index !== undefined && e.parent_index !== null) {
      const existing = childrenByParent.get(e.parent_index) || [];
      existing.push(e);
      childrenByParent.set(e.parent_index, existing);
    }
  });

  const renderEntry = (entry: ArgumentMapEntry, depth: number, globalIndex: number) => {
    const children = childrenByParent.get(globalIndex) || [];
    const isSide1 = entry.speaker_side?.toLowerCase().includes(sides1Check(entries));

    return (
      <motion.div
        key={entry.id}
        initial={{ opacity: 0, x: -8 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.25 }}
        className={depth > 0 ? "ml-3 mt-1.5" : "mt-2"}
      >
        <div
          className={`rounded-lg border-l-[3px] px-2.5 py-1.5 ${
            compact ? "text-[10px]" : "text-[11px]"
          } ${
            isSide1
              ? "border-l-[hsl(var(--side-1))] bg-[hsl(var(--side-1)/0.08)]"
              : "border-l-[hsl(var(--side-2))] bg-[hsl(var(--side-2)/0.08)]"
          }`}
        >
          <div className="flex items-center gap-1.5 mb-0.5">
            <span className={`font-semibold text-[9px] uppercase tracking-wider ${
              isSide1 ? "text-[hsl(var(--side-1))]" : "text-[hsl(var(--side-2))]"
            }`}>
              {entry.speaker_side}
            </span>
            {entry.type !== "claim" && (
              <span className="flex items-center gap-0.5 text-[8px] text-muted-foreground uppercase tracking-wider">
                {typeIcon(entry.type)} {typeLabel(entry.type)}
              </span>
            )}
          </div>
          <p className="text-foreground leading-relaxed break-words whitespace-pre-wrap">{entry.content}</p>
          {entry.quote && (
            <p className="mt-1 text-[9px] italic text-muted-foreground border-l-2 border-muted pl-2">
              "{entry.quote}"
            </p>
          )}
        </div>
        {children.length > 0 && (
          <div className="border-l border-border ml-2">
            {children.map((child) => {
              const childIdx = entries.indexOf(child);
              return renderEntry(child, depth + 1, childIdx);
            })}
          </div>
        )}
      </motion.div>
    );
  };

  return (
    <div className="space-y-0.5">
      <AnimatePresence>
        {rootEntries.map((entry) => {
          const idx = entries.indexOf(entry);
          return renderEntry(entry, 0, idx);
        })}
      </AnimatePresence>
    </div>
  );
};

// Helper: determine which side is "side 1" from entries
function sides1Check(entries: ArgumentMapEntry[]): string {
  // Return first side encountered - simple heuristic
  return entries[0]?.speaker_side?.toLowerCase().slice(0, 3) || "";
}

export default LiveArgumentMapAI;
