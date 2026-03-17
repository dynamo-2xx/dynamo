import { motion, AnimatePresence } from "framer-motion";
import { MessageSquare, ArrowRight, Quote } from "lucide-react";

interface ArgumentNode {
  id: string;
  content: string;
  argumentType: string;
  sideLabel: string;
  sideOrder: number;
  participantId: string;
  parentArgumentId: string | null;
  createdAt: string;
  isEdited: boolean;
}

interface LiveArgumentMapProps {
  arguments: ArgumentNode[];
  compact?: boolean;
}

const LiveArgumentMap = ({ arguments: args, compact = false }: LiveArgumentMapProps) => {
  // Build threaded structure
  const rootArgs = args.filter((a) => !a.parentArgumentId);
  const childrenMap = new Map<string, ArgumentNode[]>();
  args.forEach((a) => {
    if (a.parentArgumentId) {
      const existing = childrenMap.get(a.parentArgumentId) || [];
      existing.push(a);
      childrenMap.set(a.parentArgumentId, existing);
    }
  });

  const sideColor = (order: number) =>
    order === 0 ? "border-l-primary bg-primary/5" : "border-l-accent bg-accent/5";

  const sideDot = (order: number) =>
    order === 0 ? "bg-primary" : "bg-accent";

  const renderNode = (node: ArgumentNode, depth: number) => {
    const children = childrenMap.get(node.id) || [];
    return (
      <motion.div
        key={node.id}
        initial={{ opacity: 0, x: -12 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.3 }}
        className={`${depth > 0 ? "ml-4 mt-2" : "mt-3"}`}
      >
        <div
          className={`rounded-lg border-l-[3px] px-3 py-2 ${sideColor(node.sideOrder)} ${
            compact ? "text-xs" : "text-sm"
          }`}
        >
          <div className="flex items-center gap-2 mb-1">
            <span className={`w-2 h-2 rounded-full ${sideDot(node.sideOrder)}`} />
            <span className="font-semibold text-foreground font-display text-xs">
              {node.sideLabel}
            </span>
            {node.argumentType === "counter" && (
              <span className="flex items-center gap-0.5 text-[9px] text-muted-foreground uppercase tracking-wider">
                <ArrowRight className="w-2.5 h-2.5" /> counter
              </span>
            )}
            {node.argumentType === "quote" && (
              <Quote className="w-3 h-3 text-muted-foreground" />
            )}
            {node.isEdited && (
              <span className="text-[9px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground font-semibold uppercase tracking-wider">
                Edited
              </span>
            )}
          </div>
          <p className="text-foreground leading-relaxed">{node.content}</p>
        </div>
        {children.length > 0 && (
          <div className="border-l border-border ml-3">
            {children.map((child) => renderNode(child, depth + 1))}
          </div>
        )}
      </motion.div>
    );
  };

  if (args.length === 0) {
    return (
      <div className={`flex items-center justify-center ${compact ? "py-4" : "py-8"} text-muted-foreground`}>
        <MessageSquare className="w-4 h-4 mr-2" />
        <span className={compact ? "text-xs" : "text-sm"}>Awaiting arguments…</span>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      <AnimatePresence>
        {rootArgs.map((node) => renderNode(node, 0))}
      </AnimatePresence>
    </div>
  );
};

export default LiveArgumentMap;
