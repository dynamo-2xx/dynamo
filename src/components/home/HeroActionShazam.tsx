import { useState, useRef } from "react";
import { motion, PanInfo } from "framer-motion";
import { PlusCircle, Radio, Swords, Download, ChevronLeft, ChevronRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";

interface Slide {
  id: string;
  label: string;
  description: string;
  icon: typeof PlusCircle;
  route: string;
}

const SLIDES: Slide[] = [
  { id: "debate", label: "Debate", description: "Structure a sincere dialogue in seconds", icon: PlusCircle, route: "/create" },
   { id: "live", label: "Live", description: "Capture a real conversation and keep the record", icon: Radio, route: "/live/new" },
  { id: "cmm", label: "Change My Mind", description: "Open a topic. Take on every challenger.", icon: Swords, route: "/cmm/new" },
  { id: "import", label: "Import", description: "Turn a link, transcript, or recording into a record", icon: Download, route: "/create/import" },
];

interface HeroActionShazamProps {
  highlight?: boolean;
  onUnauth: () => void;
}

const HeroActionShazam = ({ highlight, onUnauth }: HeroActionShazamProps) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [index, setIndex] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [pulse, setPulse] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const slide = SLIDES[index];
  const Icon = slide.icon;

  const triggerPulse = () => {
    setPulse(false);
    // next tick so the class re-applies and animation restarts
    requestAnimationFrame(() => {
      setPulse(true);
      window.setTimeout(() => setPulse(false), 700);
    });
  };

  const go = (dir: 1 | -1) => {
    setIndex((i) => (i + dir + SLIDES.length) % SLIDES.length);
  };

  const handleActivate = () => {
    if (dragging) return;
    triggerPulse();
    if (!user) {
      onUnauth();
      return;
    }
    navigate(slide.route);
  };

  const handleDragEnd = (_: unknown, info: PanInfo) => {
    setDragging(false);
    const threshold = 50;
    if (info.offset.x < -threshold) go(1);
    else if (info.offset.x > threshold) go(-1);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowLeft") {
      e.preventDefault();
      go(-1);
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      go(1);
    } else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      handleActivate();
    }
  };

  return (
    <div
      ref={containerRef}
      tabIndex={0}
      onKeyDown={handleKeyDown}
      className={cn(
        "mb-4 scroll-mt-4 rounded-2xl transition-all duration-500 outline-none focus-visible:ring-2 focus-visible:ring-foreground/30",
        highlight && "ring-2 ring-foreground/30",
      )}
    >
      {/* Mobile layout: stacked, swipeable */}
      <div className="md:hidden flex flex-col items-center py-4 select-none">
        {/* Dots */}
        <div className="flex gap-2 mb-5">
          {SLIDES.map((s, i) => (
            <button
              key={s.id}
              onClick={() => setIndex(i)}
              aria-label={`Show ${s.label}`}
              className={cn(
                "w-2 h-2 rounded-full transition-colors",
                i === index ? "bg-foreground" : "bg-foreground/20",
              )}
            />
          ))}
        </div>

        <motion.div
          key={slide.id}
          drag="x"
          dragConstraints={{ left: 0, right: 0 }}
          dragElastic={0.2}
          onDragStart={() => setDragging(true)}
          onDragEnd={handleDragEnd}
          initial={{ opacity: 0, scale: 0.92 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.25 }}
          className="relative cursor-grab active:cursor-grabbing"
        >
          <button
            type="button"
            onClick={handleActivate}
            onFocus={triggerPulse}
            aria-label={slide.label}
            className="relative w-44 h-44 rounded-full bg-foreground text-background flex items-center justify-center shadow-xl active:scale-95 transition-transform"
          >
            {pulse && !dragging && (
              <span className="absolute inset-0 rounded-full bg-foreground/20 animate-ping pointer-events-none" />
            )}
            <Icon className="w-16 h-16 relative z-10" strokeWidth={1.5} />
          </button>
        </motion.div>

        <motion.div
          key={`${slide.id}-text`}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
          className="mt-6 text-center px-6"
        >
          <h2 className="font-display text-2xl mb-1">{slide.label}</h2>
          <p className="text-sm text-muted-foreground font-body">{slide.description}</p>
        </motion.div>
      </div>

      {/* Desktop layout: side-by-side with arrows */}
      <div className="hidden md:flex items-center justify-center gap-6 py-5 select-none">
        <button
          type="button"
          onClick={() => go(-1)}
          aria-label="Previous"
          className="w-9 h-9 rounded-full border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        <motion.div
          key={slide.id}
          drag="x"
          dragConstraints={{ left: 0, right: 0 }}
          dragElastic={0.2}
          onDragStart={() => setDragging(true)}
          onDragEnd={handleDragEnd}
          initial={{ opacity: 0, scale: 0.92 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.25 }}
          className="relative cursor-grab active:cursor-grabbing"
        >
          <button
            type="button"
            onClick={handleActivate}
            onFocus={triggerPulse}
            aria-label={slide.label}
            className="relative w-48 h-48 rounded-full bg-foreground text-background flex items-center justify-center shadow-xl active:scale-95 transition-transform"
          >
            {pulse && !dragging && (
              <span className="absolute inset-0 rounded-full bg-foreground/20 animate-ping pointer-events-none" />
            )}
            <Icon className="w-20 h-20 relative z-10" strokeWidth={1.5} />
          </button>
        </motion.div>

        <button
          type="button"
          onClick={() => go(1)}
          aria-label="Next"
          className="w-9 h-9 rounded-full border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-colors"
        >
          <ChevronRight className="w-4 h-4" />
        </button>

        <motion.div
          key={`${slide.id}-text`}
          initial={{ opacity: 0, x: -8 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.25 }}
          className="max-w-[220px]"
        >
          <h2 className="font-display text-3xl mb-1.5">{slide.label}</h2>
          <p className="text-sm text-muted-foreground font-body mb-3">{slide.description}</p>
          <div className="flex gap-2">
            {SLIDES.map((s, i) => (
              <button
                key={s.id}
                onClick={() => setIndex(i)}
                aria-label={`Show ${s.label}`}
                className={cn(
                  "w-2 h-2 rounded-full transition-colors",
                  i === index ? "bg-foreground" : "bg-foreground/20",
                )}
              />
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default HeroActionShazam;
