// Time zones. The server runs on UTC, which is already tomorrow on a
// Vancouver evening, so anything about "today" or "after 9pm" has to be
// worked out in your zone. The browser reports it (saved as user_metadata.tz
// for automations, which have no browser).

export const isTimeZone = (tz: string) => {
  try {
    new Intl.DateTimeFormat("en-CA", { timeZone: tz });
    return true;
  } catch {
    return false;
  }
};

/** Today's date (YYYY-MM-DD) in a zone, falling back to UTC. */
export function todayIn(tz: unknown) {
  const zone = typeof tz === "string" && isTimeZone(tz) ? tz : "UTC";
  return new Intl.DateTimeFormat("en-CA", { timeZone: zone, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
}

/** The hour (0-23) of a timestamp in a zone. */
export function hourIn(iso: string, tz: string) {
  return Number(new Intl.DateTimeFormat("en-US", { timeZone: tz, hour: "numeric", hourCycle: "h23" }).format(new Date(iso)));
}
