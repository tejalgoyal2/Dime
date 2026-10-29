// "YYYY-MM-DD" in the viewer's own timezone. toISOString() is UTC, which
// rolls over to tomorrow every evening in the Americas.
export function localISODate(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

// Header the client sends so server-side AI parsing defaults to the user's
// local "today" rather than the worker's UTC date.
export const LOCAL_DATE_HEADER = "x-local-date";
