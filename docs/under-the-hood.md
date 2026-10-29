# Under the hood

How Dime actually works, for anyone poking around the code (including future me).

## What happens when you type "coffee & croissant 7.25"

1. **The composer finds the price as you type** (`lib/amounts.ts`). Standalone numbers are price candidates. Numbers glued to letters ("2am", "pro3") aren't. A `$` wins. If there are two plain numbers, it asks you which one you meant and sends your pick along as a hint.
2. **`/api/parse` asks Gemini** (`lib/gemini.ts`) to turn the text into JSON: item, amount, category, Life or Lego, an emoji and a one-line Hinglish comment. The message is treated as data, not instructions, and the result is validated with Zod before anything is saved.
3. **Life vs Lego** follows the rules in `lib/life-lego.ts`. Then, if you've logged the same thing before, Dime reuses how you sorted it last time. Flip a coin once and it sticks.
4. **`/api/expenses` saves it** with your session, so row-level security keeps it yours. The UI updates optimistically and rolls back if the save fails.

## Auto-log (`/api/ingest`)

Same idea, minus the chat. The pipeline lives in `lib/ingest.ts`:

1. Per-IP limit, checked before any other work.
2. The token's SHA-256 hash is looked up with the service client, and every query after that is scoped to that user.
3. Per-token limit, then de-duplication for forwarded alerts (a hash of user + text).
4. Daily AI budget, Gemini, Life/Lego rules plus your history, Zod, insert.
5. An empty `204` with `X-Dime-Status` in the header.

Setup guide for humans: [auto-log.md](auto-log.md).

## Accounts

There's no email and no phone. A name maps to a placeholder address for Supabase Auth (`lib/callsign.ts`). Sign-up happens in `/api/signup`: it checks the invite code with a constant-time compare, then creates the user with the admin API. Public Supabase sign-ups are switched off, so that's the only way in.

## Limits (`lib/rate-limit.ts`)

| Bucket | Limit |
|---|---|
| App requests, per IP | 20 / minute |
| Sign-up attempts, per IP | 5 / 15 minutes |
| Public API, per IP | 30 / minute |
| Public API, per token | 12 / minute |
| AI calls, per person | 300 / day |

## The dashboard

- **Cards** live in `components/dashboard/cells/`. Their order, size and visibility is a small JSON layout saved per user (`/api/preferences`, cleaned up by `sanitizeLayout`).
- **Dragging** uses dnd-kit for the logic and Framer Motion for the gliding.
- **Small motion details:**
  - Segmented controls use `components/ui/pills.tsx`, which measures inside its own row, so the marker never jumps when its container is moving.
  - The login chat moves as one block when a message lands.
  - The typing dots and the cash bill animate in plain CSS.
- **Themes:** palettes and day/night are CSS variables switched by `data-palette` and `data-theme` on `<html>`. They're set before first paint, and changes crossfade with the View Transitions API.

## Running it in production

- **Deploys:** every push to `main` deploys to Cloudflare Workers (`.github/workflows/deploy.yml`).
- **Keeping Supabase awake:** `.github/workflows/supabase-keepalive.yml` writes a row every three days so the free Supabase project never pauses, and re-enables itself so GitHub doesn't switch it off.
- **Secrets** are Cloudflare Worker secrets. The two `NEXT_PUBLIC_` values are also GitHub secrets, because the build needs them. Supabase keys are the new kind: publishable (`sb_publishable_`) in the browser, secret (`sb_secret_`) on the server.
- **Gemini model:** `gemini-3.5-flash-lite` by default. Set `GEMINI_MODEL` to override it. If the model is ever retired, `ask()` switches to `gemini-flash-lite-latest` by itself.
