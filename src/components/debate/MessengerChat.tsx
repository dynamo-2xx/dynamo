import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useRef, useState, useCallback } from "react";
import { ChevronDown } from "lucide-react";

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
  const [userScrolledUp, setUserScrolledUp] = useState(false);
  const isAutoScrolling = useRef(false);

  const sorted = [...messages].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );

  const scrollToBottom = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    isAutoScrolling.current = true;
    el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
    setUserScrolledUp(false);
    // Reset flag after scroll completes
    setTimeout(() => { isAutoScrolling.current = false; }, 400);
  }, []);

  // Detect manual scroll
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const onScroll = () => {
      if (isAutoScrolling.current) return;
      const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 40;
      setUserScrolledUp(!atBottom);
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, []);

  // Auto-scroll to bottom on new messages unless user scrolled up
  useEffect(() => {
    if (!userScrolledUp) {
      const el = containerRef.current;
      if (!el) return;
      isAutoScrolling.current = true;
      // Use rAF to scroll after DOM update
      requestAnimationFrame(() => {
        el.scrollTop = el.scrollHeight;
        setTimeout(() => { isAutoScrolling.current = false; }, 100);
      });
    }
  }, [messages.length, userScrolledUp]);

  if (messages.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm font-body">
        Awaiting arguments…
      </div>
    );
  }

  return (
    <div className="flex-1 relative min-h-0">
      <div
        ref={containerRef}
        className="absolute inset-0 overflow-y-auto"
      >
        <div className="flex flex-col justify-end min-h-full px-4 py-3 gap-2">
          <AnimatePresence initial={false}>
            {sorted.map((msg) => {
              const isSide1 = msg.sideOrder === 0;
              return (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, height: 0, marginBottom: 0, overflow: "hidden" }}
                  transition={{ duration: 0.25 }}
                  className={`flex ${isSide1 ? "justify-start" : "justify-end"}`}
                >
                  <div
                    className={`max-w-[75%] rounded-lg px-4 py-3 text-sm font-body ${
                      isSide1
                        ? "border-l-4 border-l-[hsl(var(--side-1))] bg-[hsl(var(--side-1)/0.08)]"
                        : "border-r-4 border-r-[hsl(var(--side-2))] bg-[hsl(var(--side-2)/0.08)]"
                    }`}
                  >
                    <p className={`text-[10px] font-semibold mb-1 ${
                      isSide1 ? "text-[hsl(var(--side-1))]" : "text-[hsl(var(--side-2))] text-right"
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

      {/* Scroll-to-bottom button */}
      <AnimatePresence>
        {userScrolledUp && (
          <motion.button
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            onClick={scrollToBottom}
            className="absolute bottom-3 left-1/2 -translate-x-1/2 z-10 bg-primary text-primary-foreground rounded-full p-2 shadow-lg hover:opacity-90 transition-opacity"
            title="Scroll to latest"
          >
            <ChevronDown className="w-4 h-4" />
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
};

export default MessengerChat;
