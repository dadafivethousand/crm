// Formats "2025-01-15" → "Jan 15, 2025" (timezone-safe, no Date constructor needed)
export function formatDate(str) {
  if (!str) return "—";
  const parts = str.split("-");
  if (parts.length !== 3) return str;
  const [y, m, d] = parts;
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const mi = parseInt(m, 10) - 1;
  if (mi < 0 || mi > 11) return str;
  return `${months[mi]} ${parseInt(d, 10)}, ${y}`;
}

// Formats a full ISO timestamp "2025-01-15T10:30:00Z" → "Jan 15, 2025"
export function formatDateTime(isoString) {
  if (!isoString) return "—";
  const d = new Date(isoString);
  if (isNaN(d)) return isoString;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}
