// Dime has no real emails: a name maps to a placeholder address for Supabase
// Auth. Sign-in and sign-up must derive it the same way.
export const emailForName = (name: string) => `${name.trim().toLowerCase().replace(/\s+/g, "")}@spendlog.app`;
