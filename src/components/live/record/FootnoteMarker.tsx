import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import type { CrossRefKind, SessionCrossRef } from "@/hooks/useSessionCrossRefs";

const COLOR_BY_KIND: Record<CrossRefKind, string> = {
  contradiction: "text-red-600",
  shared_evidence: "text-blue-600",
  restated: "text-emerald-600",
};

const KIND_PRIORITY: Record<CrossRefKind, number> = {
  contradiction: 0,
  shared_evidence: 1,
  restated: 2,
};

const KIND_LABEL: Record<CrossRefKind, string> = {
  contradiction: "Contradiction",
  shared_evidence: "Shared evidence",
  restated: "Restated claim",
};

const SUPER_DIGITS: Record<string, string> = {
  "0": "⁰", "1": "¹", "2": "²", "3": "³", "4": "⁴",
  "5": "⁵", "6": "⁶", "7": "⁷", "8": "⁸", "9": "⁹",
};
function toSuper(n: number): string {
  return String(n).split("").map((d) => SUPER_DIGITS[d] || d).join("");
}

interface FootnoteMarkerProps {
  /** Cross-refs that touch this node. */
  refs: SessionCrossRef[];
  numberByRefId: Map<string, number>;
  onJump: (toNodeId: string) => void;
}

/**
 * Inline superscript marker. If ≤3 refs, render up to 3 colored markers.
 * If >3, render a single clustered marker like "¹⁻⁵" that opens a popover.
 */
const FootnoteMarker = ({ refs, numberByRefId, onJump }: FootnoteMarkerProps) => {
  if (refs.length === 0) return null;

  const sorted = [...refs].sort(
    (a, b) =>
      KIND_PRIORITY[a.kind] - KIND_PRIORITY[b.kind] ||
      (numberByRefId.get(a.id) || 0) - (numberByRefId.get(b.id) || 0),
  );

  if (sorted.length > 3) {
    const first = numberByRefId.get(sorted[0].id) || 0;
    const last = numberByRefId.get(sorted[sorted.length - 1].id) || 0;
    const dominantKind = sorted[0].kind;
    return (
      <Popover>
        <PopoverTrigger asChild>
          <button
            type="button"
            className={`align-super text-[10px] font-medium ml-0.5 hover:underline ${COLOR_BY_KIND[dominantKind]}`}
            aria-label={`${sorted.length} cross references`}
          >
            {toSuper(first)}⁻{toSuper(last)}
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-72 p-2" align="start">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground px-1 pb-1">
            Cross references
          </p>
          <ul className="divide-y divide-foreground/10">
            {sorted.map((r) => {
              const target = r.from_node /* prefer the OTHER node */;
              const dest = target;
              const num = numberByRefId.get(r.id) || 0;
              return (
                <li key={r.id}>
                  <button
                    type="button"
                    onClick={() => onJump(r.to_node)}
                    className="w-full text-left px-2 py-1.5 text-xs hover:bg-foreground/[0.03] flex items-baseline gap-2"
                  >
                    <span className={`${COLOR_BY_KIND[r.kind]} font-medium`}>
                      {toSuper(num)}
                    </span>
                    <span className="text-foreground/80">{KIND_LABEL[r.kind]}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </PopoverContent>
      </Popover>
    );
  }

  return (
    <span className="inline-flex">
      {sorted.map((r) => {
        const num = numberByRefId.get(r.id) || 0;
        return (
          <button
            key={r.id}
            type="button"
            onClick={() => onJump(r.to_node)}
            title={KIND_LABEL[r.kind]}
            className={`align-super text-[10px] font-medium ml-0.5 hover:underline ${COLOR_BY_KIND[r.kind]}`}
          >
            {toSuper(num)}
          </button>
        );
      })}
    </span>
  );
};

export default FootnoteMarker;