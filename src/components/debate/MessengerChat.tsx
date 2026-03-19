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
          const isLeft = msg.sideOrder === 0;
          return (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25 }}
              className={`flex ${isLeft ? "justify-start" : "justify-end"}`}
            >
              <div
                className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-sm font-body ${
                  isLeft
                    ? "bg-[hsl(var(--side-1))] text-[hsl(var(--side-1-foreground))] rounded-bl-sm"
                    : "bg-[hsl(var(--side-2))] text-[hsl(var(--side-2-foreground))] rounded-br-sm"
                }`}
              >
                <p className="text-[10px] font-semibold opacity-80 mb-0.5">
                  {msg.sideLabel}
                  {msg.isEdited && " · edited"}
                </p>
                <p className="leading-relaxed">{msg.content}</p>
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
