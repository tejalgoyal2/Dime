// Shared timing so things leave the way they arrive: smooth, never snapped.
// Entrances can spring; exits ease out over a beat so the eye can follow them.
export const EASE_OUT = [0.22, 1, 0.36, 1] as const;
export const EASE_SMOOTH = [0.4, 0, 0.2, 1] as const;

/** A fade-out long enough to read as intentional. */
export const LEAVE = { duration: 0.28, ease: EASE_SMOOTH } as const;
/** For small things (chips, labels) that should clear quickly but not blink. */
export const LEAVE_QUICK = { duration: 0.2, ease: EASE_SMOOTH } as const;
