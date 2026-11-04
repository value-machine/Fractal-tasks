/**
 * Short relative time ("3 h ago") for activity logs; falls back to a date after 30 days.
 * `now` is injectable so callers and tests stay deterministic.
 */
export const formatRelativeTime = (iso: string, now: number = Date.now()): string => {
  const seconds = Math.round((now - new Date(iso).getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} h ago`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days} d ago`;
  return new Date(iso).toLocaleDateString();
};
