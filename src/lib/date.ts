// Formats a date as "April 18th, 2026" with ordinal suffix.
const ordinal = (n: number) => {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
};

export function formatTodayLong(date: Date = new Date()): string {
  const month = date.toLocaleString("en-US", { month: "long" });
  return `${month} ${ordinal(date.getDate())}, ${date.getFullYear()}`;
}

// Smart relative date label for upcoming scheduled events.
// Returns labels like "TODAY 7PM", "TOMORROW 7:30PM", "FRI 8PM", "MAY 3 8PM".
// If the date is in the past, returns "STARTING SOON".
export function formatUpcomingShort(input: string | Date | null | undefined, now: Date = new Date()): string | null {
  if (!input) return null;
  const d = typeof input === "string" ? new Date(input) : input;
  if (isNaN(d.getTime())) return null;

  const startOfDay = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate());
  const dayDiff = Math.round((startOfDay(d).getTime() - startOfDay(now).getTime()) / 86400000);

  const time = d
    .toLocaleTimeString("en-US", { hour: "numeric", minute: d.getMinutes() === 0 ? undefined : "2-digit" })
    .replace(/\s/g, "")
    .toUpperCase();

  if (d.getTime() < now.getTime()) return "STARTING SOON";
  if (dayDiff === 0) return `TODAY ${time}`;
  if (dayDiff === 1) return `TOMORROW ${time}`;
  if (dayDiff > 1 && dayDiff < 7) {
    const weekday = d.toLocaleDateString("en-US", { weekday: "short" }).toUpperCase();
    return `${weekday} ${time}`;
  }
  const month = d.toLocaleDateString("en-US", { month: "short" }).toUpperCase();
  return `${month} ${d.getDate()} ${time}`;
}
