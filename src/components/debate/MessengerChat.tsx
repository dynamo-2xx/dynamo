import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useRef, useState, useLayoutEffect } from "react";

interface ChatMessage {
  id: string;
  content: string;
  sideLabel: string;
  sideOrder: number;
  createdAt: string;
  isEdited: boolean;
}

interface MessengerChatProps {
  messages: ChatMessage[];
}

const MessengerChat = ({ messages }: MessengerChatProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const [startIndex, setStartIndex] = useState(0);

  // Sort chronologically (oldest first)
  const sorted = [...messages].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );

  // After render, trim oldest messages if content overflows
  useLayoutEffect(() => {
    setStartIndex(0);
  }, [messages.length]);

  useEffect(() => {
    const container = containerRef.current;
    const inner = innerRef.current;
    if (!container || !inner) return;

    let idx = startIndex;
    // Keep trimming oldest until it fits or only 1 message left
    const check = () => {
      if (!containerRef.current || !innerRef.current) return;
      if (innerRef.current.scrollHeight > containerRef.current.clientHeight && idx < sorted.length - 1) {
        idx++;
        setStartIndex(idx);
      }
    };
    // Use rAF to measure after paint
    requestAnimationFrame(check);
  }, [startIndex, sorted.length]);

  const visible = sorted.slice(startIndex);

  if (messages.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm font-body">
        Awaiting arguments…
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="flex-1 overflow-hidden relative"
    >
      <div ref={innerRef} className="absolute inset-0 flex flex-col justify-end px-4 py-3 gap-2">
        <AnimatePresence initial={false}>
          {visible.map((msg) => {
            const isSide1 = msg.sideOrder === 0;
            return (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, height: 0, marginBottom: 0, overflow: "hidden" }}
                transition={{ duration: 0.25 }}
              >
                <div
                  className={`w-full rounded-lg px-4 py-3 text-sm font-body border-l-4 ${
                    isSide1
                      ? "border-l-[hsl(var(--side-1))] bg-[hsl(var(--side-1)/0.08)]"
                      : "border-l-[hsl(var(--side-2))] bg-[hsl(var(--side-2)/0.08)]"
                  }`}
                >
                  <p className={`text-[10px] font-semibold mb-1 ${
                    isSide1 ? "text-[hsl(var(--side-1))]" : "text-[hsl(var(--side-2))]"
                  }`}>
                    {msg.sideLabel}
                    {msg.isEdited && " · edited"}
                  </p>
                  <p className="leading-relaxed text-foreground break-words whitespace-pre-wrap">{msg.content}</p>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default MessengerChat;
