// Date.toISOString() always returns UTC, but <input type="date"/"datetime-local">
// expects/displays local wall-clock time — using toISOString() for a default value
// shows the wrong date/time in any timezone ahead of or behind UTC (e.g. Armenia,
// UTC+4: "now" at 15:53 local renders as "11:53" if built via toISOString()).
export function toLocalDateInput(d: Date): string {
  const y   = d.getFullYear();
  const m   = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function toLocalDateTimeInput(d: Date): string {
  return `${toLocalDateInput(d)}T${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}
