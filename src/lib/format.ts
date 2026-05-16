import { format, isToday, isYesterday, isThisWeek } from "date-fns";

export function formatChatTimestamp(iso: string): string {
  const d = new Date(iso);
  if (isToday(d)) return format(d, "HH:mm");
  if (isYesterday(d)) return "Yesterday";
  if (isThisWeek(d)) return format(d, "EEEE");
  return format(d, "dd/MM/yyyy");
}

export function formatMessageTime(iso: string): string {
  return format(new Date(iso), "HH:mm");
}

export function formatDaySeparator(iso: string): string {
  const d = new Date(iso);
  if (isToday(d)) return "Today";
  if (isYesterday(d)) return "Yesterday";
  if (isThisWeek(d)) return format(d, "EEEE");
  return format(d, "dd MMMM yyyy");
}

export function dayKey(iso: string): string {
  return format(new Date(iso), "yyyy-MM-dd");
}

export function initialsFrom(name?: string | null, email?: string | null): string {
  const src = (name && name.trim()) || (email && email.split("@")[0]) || "?";
  const parts = src.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}
