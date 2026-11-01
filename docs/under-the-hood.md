# Under the hood

How Dime actually works, for anyone poking around the code (including future me).

## What happens when you type "coffee & croissant 7.25"

0. **Or a photo:** the camera button (or paste/drop) shrinks the image in the browser (1600px JPEG) and sends it to `/api/receipt`, which checks its type and size and asks for the store, total and date. Same pipeline from there (`lib/log-expense.ts`).
1. **The composer picks out the price as you type** (`lib/amounts.ts`), but only when it's clear. A `$` wins. Numbers that belong to the item ("2am", "pro3", "2%", "500 ml", "x2", "#4") are never prices. When it's still a toss-up ("6 milk 2"), nothing is highlighted and the AI decides from the meaning.
2. **`/api/parse` asks the AI** (`lib/ai.ts`, prompt in `lib/parse-prompt.ts`) to turn the text into JSON: items with amount, category, Life or Lego and an emoji, plus Tom's one-liner in Hinglish, English and Chinese. It also gets a line about your week ("Bubble Tea x3", month so far against your budget) so the joke can be about you. The message is treated as data, and the answer has to match a JSON schema. The server then drops any amount you didn't actually type (models sometimes "know" a price).
3. **Life vs Lego** follows the rules in `lib/life-lego.ts`. Then, if you've logged the same thing before, Dime reuses how you sorted it last time. Flip a coin once and it sticks.
4. **`/api/expenses` saves it** with your session, so row-level security keeps it yours. The UI updates optimistically and rolls back if the save fails.

## Auto-log (`/api/ingest`)

Same idea, minus the chat. The pipeline lives in `lib/ingest.ts`:

1. Per-IP limit, checked before any other work.
2. The token's SHA-256 hash is looked up with the service client, and every query after that is scoped to that user.
3. Per-token limit, then de-duplication for forwarded alerts (a hash of user + text).
4. Daily AI budget, the AI (same schema-checked answers), Life/Lego rules plus your history, Zod, insert.
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
- **AI providers** (`lib/ai.ts`): Gemini answers first, Groq is the backup (`openai/gpt-oss-120b`, or `qwen/qwen3.8-27b` for photos). In side-by-side tests Gemini's jokes were clearly better and Groq's free tier hit its token limit quickly. Quick jobs (purchases, receipts, roasts) use the latest Flash-Lite with no thinking; serious ones (advice, "Read my month", subscriptions) use the latest Flash with a little. A swamped or retired model steps to the next one straight away. Answers must match a strict JSON schema. Gemini is named by Google's `gemini-flash-latest` and `gemini-flash-lite-latest` aliases, which Google moves to each new release, so a newer free model needs no code change. `GEMINI_MODEL` and `GROQ_MODEL` override them.
- **Security headers:** the Content Security Policy gets a fresh nonce per page request (`lib/csp.ts`, set in middleware), so only Dime's own scripts run. Plus HSTS, COOP/CORP same-origin, no framing, no sniffing. Writes check `Sec-Fetch-Site` and `Origin` against cross-site forgery.
- **Dates** come from your browser, never the server (the server runs on UTC, which is already tomorrow on a Vancouver evening).
