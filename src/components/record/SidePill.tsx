import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";

const SIDE_CLASS = [
  "text-blue-600 dark:text-blue-400",
  "text-rose-600 dark:text-rose-400",
  "text-emerald-600 dark:text-emerald-400",
  "text-amber-600 dark:text-amber-400",
];

export type SidePillProps =
  | {
      kind: "side";
      label: string;
      index: number;
    }
  | {
      kind: "user";
      name: string;
      avatarUrl?: string | null;
      userId?: string | null;
    };

const Shell = ({
  children,
  href,
  className,
}: {
  children: React.ReactNode;
  href?: string | null;
  className?: string;
}) => {
  const base =
    "rounded-xl border border-border bg-card px-4 py-3 text-center flex flex-col items-center justify-center min-h-[64px]";
  if (href) {
    return (
      <Link to={href} className={cn(base, "hover:bg-foreground/[0.03] transition-colors", className)}>
        {children}
      </Link>
    );
  }
  return <div className={cn(base, className)}>{children}</div>;
};

const initials = (name: string) =>
  name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("") || "?";

const SidePill = (props: SidePillProps) => {
  if (props.kind === "side") {
    return (
      <Shell>
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-body mb-1">
          Side {props.index + 1}
        </p>
        <p className={cn("text-sm font-display", SIDE_CLASS[props.index % SIDE_CLASS.length])}>
          {props.label}
        </p>
      </Shell>
    );
  }
  const { name, avatarUrl, userId } = props;
  const href = userId ? `/u/${userId}` : null;
  return (
    <Shell href={href}>
      <div className="flex items-center justify-center gap-2 min-w-0">
        {avatarUrl ? (
          <img
            src={avatarUrl}
            alt=""
            className="w-6 h-6 rounded-full object-cover shrink-0"
          />
        ) : (
          <span className="w-6 h-6 rounded-full bg-foreground/10 text-[10px] font-semibold inline-flex items-center justify-center shrink-0">
            {initials(name)}
          </span>
        )}
        <span className="text-sm font-display truncate text-foreground">{name}</span>
      </div>
    </Shell>
  );
};

export default SidePill;