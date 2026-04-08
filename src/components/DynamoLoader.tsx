import { motion } from "framer-motion";
import { useEffect, useState } from "react";

interface DynamoLoaderProps {
  onComplete?: () => void;
  duration?: number;
}

const SLOGAN = "People to the Power!";

const DynamoLoader = ({ onComplete, duration = 2500 }: DynamoLoaderProps) => {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const start = Date.now();
    const tick = () => {
      const elapsed = Date.now() - start;
      const p = Math.min(elapsed / duration, 1);
      setProgress(p);
      if (p < 1) {
        requestAnimationFrame(tick);
      } else {
        onComplete?.();
      }
    };
    requestAnimationFrame(tick);
  }, [duration, onComplete]);

  const revealedCount = Math.floor(progress * SLOGAN.length);

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-background">
      <div className="text-3xl md:text-5xl lg:text-6xl font-display tracking-tight select-none">
        {SLOGAN.split("").map((char, i) => (
          <motion.span
            key={i}
            initial={{ opacity: 0.15 }}
            animate={{
              opacity: i < revealedCount ? 1 : 0.15,
            }}
            transition={{ duration: 0.08 }}
            className={`inline-block ${i < revealedCount ? "text-foreground" : "text-muted-foreground"}`}
            style={{ whiteSpace: "pre" }}
          >
            {char}
          </motion.span>
        ))}
      </div>
      <div className="mt-8 w-64 h-1 rounded-full bg-accent overflow-hidden">
        <motion.div
          className="h-full bg-foreground rounded-full"
          style={{ width: `${progress * 100}%` }}
        />
      </div>
    </div>
  );
};

export default DynamoLoader;
