# Dime

An AI expense tracker that parses natural language, categorizes spending, and roasts you in Hinglish for your financial decisions.

Type `"coffee at starbucks $5"` — Gemini handles the rest: amount, category, emoji, Need vs Want classification. Then it judges you.

**Live at** [dime.tgoyal.me](https://dime.tgoyal.me)

---

## The Stack

| | |
|---|---|
| **Framework** | Next.js 16, App Router, TypeScript strict |
| **Runtime** | Cloudflare Workers via [@opennextjs/cloudflare](https://opennext.js.org/cloudflare) |
| **Database + Auth** | Supabase — PostgreSQL, row-level security, cookie sessions |
| **AI** | Google Gemini 2.5 Flash-Lite |
| **Rate Limiting** | Upstash Redis, sliding window |
| **Validation** | Zod v4, shared schemas between client and server |
| **Styling** | Tailwind v4, Framer Motion, CSS custom properties |
| **Charts** | Recharts |
| **CI/CD** | GitHub Actions → Cloudflare Workers |

---

## Features

**Natural language input** — no forms, no dropdowns. `"grabbed lunch $14"` just works.

**AI parsing** — Gemini extracts the amount, picks a category and emoji, classifies Need vs Want, and writes a Hinglish roast.

**Quick Add API** — log expenses from Siri, Apple Shortcuts, Raycast, or `curl` without opening the app. Bearer token auth, no cookies needed.

**AI insights** — on-demand 30-day spending analysis. It notices patterns you'd rather it didn't.

**Spending roasts** — hit the roast button, get a sarcastic Hinglish performance review of your monthly spending.

**Subscription hunter** — finds recurring charges you forgot about.

**Bulk import** — paste a bank statement, Gemini parses the whole thing. Preview and confirm before inserting.

**Charts** — Needs vs Wants donut chart + weekly/monthly stacked bar trends.

**CSV export** — sanitized against formula injection.

**Streak tracking** — consecutive days logged. Gamification for adults who need external validation.

**Dark/light theme** — dark by default. Neon Midnight palette: `#0d0d0d` background, `#00ff88` accent.

---

## Architecture

```
Browser → Next.js App Router → API Routes → Supabase / Gemini / Upstash
                                    ↓
                              Cloudflare Workers
                              (@opennextjs/cloudflare)
```

The client never writes to the database directly. Every mutation goes through API routes with auth checks, Zod validation, and rate limiting.

**API routes:** `GET/POST/DELETE/PATCH /api/expenses`, `POST /api/parse`, `POST /api/quick-add`, `POST /api/insights`, `POST /api/roast`, `POST /api/analyze-subs`, `POST /api/validate-invite`

**State management:** React Context + `useReducer` with optimistic updates and rollback on failure.

---

## Quick Add API

Log expenses without the UI. Works with Siri Shortcuts, Raycast, iOS Automations, or anything that sends HTTP.

```bash
curl -X POST https://dime.tgoyal.me/api/quick-add \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"text": "coffee at starbucks $5.50"}'
```

```json
{
  "success": true,
  "expense": {
    "item_name": "Coffee at Starbucks",
    "amount": 5.50,
    "category": "Food & Drink",
    "type": "Want",
    "emoji": "☕"
  }
}
```

**Apple Shortcut setup:** New Shortcut → Ask for Input → Get Contents of URL (POST to `/api/quick-add` with Bearer token) → Show Notification. Name it "Log Expense" and trigger it with Siri.

---

## Run It Yourself

```bash
git clone https://github.com/tejalgoyal2/Dime.git && cd Dime
npm install
cp .env.example .env.local
# fill in env vars — everything is documented in .env.example
npm run dev
```

**Requirements:** Node.js 18+, a [Supabase](https://supabase.com) project, a [Gemini API key](https://aistudio.google.com/apikey), an [Upstash Redis](https://upstash.com) database.

```bash
npm run dev        # local dev server
npm run build      # production build
npm run build:cf   # cloudflare workers build
npm run preview    # local preview of cf build
npm run deploy     # deploy to cloudflare
```

---

## Project Structure

```
app/
  api/            7 routes — CRUD, parse, insights, roast, quick-add, subs, invite
  login/          callsign + invite code auth
  page.tsx        auth gate → dashboard

components/
  dashboard/      form, table, charts, modals, insights, roast, bulk import
  providers/      expenses context, theme context, toast context
  ui/             button, modal, toast, skeleton, error-boundary

lib/
  supabase/       browser client, server client, middleware, types
  schemas/        Zod v4 expense schemas (shared client + server)
  gemini.ts       model config, safety settings
  gemini-retry.ts exponential backoff (2s/4s/8s)
  rate-limit.ts   Upstash Redis sliding window (lazy init for Workers)
  origin-check.ts origin header validation
  csv-sanitize.ts formula injection protection
  api-error.ts    typed error responses
```

---

## Security

All mutations go through server API routes — the client never writes to Supabase directly. This was the single biggest change from [WalletRIP](https://github.com/tejalgoyal2/WalletRIP) (the v1 that did client-side inserts).

**Auth:** Supabase cookie sessions with middleware protection. Signup is invite-gated with strict rate limiting (5 req / 15 min per IP).

**Validation:** Zod v4 schemas validate every request body server-side.

**Rate limiting:** Upstash Redis sliding window — persistent across Workers isolates. Standard routes: 20 req/min. Invite validation: 5 req/15 min.

**Origin checking:** API routes validate the `Origin` header.

**Input sanitization:** Expense descriptions are stripped before hitting Gemini to mitigate prompt injection.

**CSV export:** Cells starting with `=`, `+`, `-`, `@` are prefixed to prevent formula injection.

**Row-level security:** All Supabase queries are scoped to the authenticated user via RLS policies.

---

## Cloudflare Workers Notes

Dime runs on Cloudflare Workers via `@opennextjs/cloudflare` (not `@cloudflare/next-on-pages`, which doesn't support Next.js 16).

Two things that will save you hours if you fork this:

**Do not add `export const runtime = "edge"` to API routes.** OpenNext handles routing internally — the directive conflicts with it and causes silent 500 errors with no stack trace. Every route already runs at the edge.

**Use lazy initialization for anything that reads `process.env`.** Workers don't populate env vars at module evaluation time. Singletons like the Redis client use a `let _instance = null; function getInstance()` pattern.

---

## Background

Dime is a ground-up rewrite of [WalletRIP](https://github.com/tejalgoyal2/WalletRIP). Same concept, different everything: server-side writes, TypeScript strict, Zod validation, persistent rate limiting, Cloudflare Workers instead of Vercel, and a design system ([Neon Midnight](https://github.com/tejalgoyal2/Dime/blob/main/app/globals.css)) that doesn't look like it was scaffolded at 3am.

---

## What Could Come Next

Not promises. Just ideas.

- **Edit expenses** — PATCH endpoint exists, needs a UI
- **Budget goals** — set a limit, get warned, ignore the warning
- **Multi-currency** — for when `"coffee $5"` becomes `"koffie €4"`
- **Recurring tracking** — the database field exists, the logic doesn't

---

Built by [Tejal Goyal](https://tgoyal.me) · [LinkedIn](https://linkedin.com/in/tejalgoyal) · [Blog](https://tejalgoyal2.github.io)
