import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useRef } from "react";

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
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  if (messages.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm font-body">
        Awaiting arguments…
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
      <AnimatePresence initial={false}>
        {messages.map((msg) => {
          const isSide1 = msg.sideOrder === 0;
          return (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
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
      <div ref={bottomRef} />
    </div>
  );
};

export default MessengerChat;
