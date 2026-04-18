import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

const MESSAGES = [
  "What's the story today?",
  "What do you want to debate today?",
  "People to the power!",
  "Got a take? Put it to the test.",
];

const RotatingTagline = ({ className = "" }: { className?: string }) => {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      setIndex((i) => (i + 1) % MESSAGES.length);
    }, 5000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className={`relative h-5 w-full ${className}`}>
      <AnimatePresence mode="wait">
        <motion.p
          key={index}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.4 }}
          className="text-muted-foreground font-body text-sm absolute inset-0 whitespace-nowrap overflow-hidden text-ellipsis"
        >
          {MESSAGES[index]}
        </motion.p>
      </AnimatePresence>
    </div>
  );
};

export default RotatingTagline;
