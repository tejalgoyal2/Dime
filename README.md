# Dime

I track my expenses. Not because I'm responsible — because I wanted to build something that roasts me in Hinglish every time I buy overpriced coffee.

Dime is an AI expense tracker. You type naturally ("coffee $5", "uber to work $12"), Gemini figures out the rest — category, emoji, whether it's a need or a want (it's usually a want) — and then judges you for it.

**Live at** [dime.tgoyal.me](https://dime.tgoyal.me)

---

## Why This Exists

I built [WalletRIP](https://github.com/tejalgoyal2/WalletRIP) last year. It worked. It also had client-side database writes, zero rate limiting, `any` types everywhere, and the kind of security posture that makes you delete your browser history. It was on Vercel, which around the same time had a [pretty bad middleware vulnerability](https://www.picussecurity.com/resource/blog/cve-2025-29927-nextjs-middleware-bypass-vulnerability) that let attackers skip auth entirely. Fun times.

So I rewrote the whole thing from scratch. Same idea — type it, track it — but this time with actual security, server-side everything, proper validation, and a design that doesn't look like it was scaffolded at 3am and never touched again (even though it was).

---

## What It Does

- **Natural language input** — "grabbed lunch $14" and it just works. No dropdowns. No category pickers. No suffering.
- **AI parsing** — Gemini categorizes it, picks an emoji, decides Need vs Want.
- **Hinglish roasts** — Hit the roast button and get judged for your spending. In Hindi-English. With attitude.
- **Charts** — Needs vs Wants donut + weekly/monthly trend bars. See where the money went.
- **AI insights** — 30-day spending patterns. It notices things you'd rather it didn't.
- **Subscription hunter** — Finds the recurring charges you forgot about.
- **Quick Add API** — Log expenses from Siri, Apple Shortcuts, curl, whatever. Without opening the app.
- **Bulk import** — Paste a bank statement. Gemini parses the whole thing at once.
- **CSV export** — Get your data out. Sanitized against injection because I learned things.
- **Streak tracking** — How many days in a row you've logged. Gamification for adults who need external validation.
- **Dark/light theme** — Dark by default. Light mode exists if you're into that.

---

## The Stack

| | |
|---|---|
| **Framework** | Next.js 16, App Router, TypeScript strict |
| **Runtime** | Cloudflare Workers (via @opennextjs/cloudflare) |
| **Database + Auth** | Supabase — PostgreSQL with row-level security |
| **AI** | Google Gemini 2.5 Flash-Lite |
| **Rate Limiting** | Upstash Redis, sliding window |
| **Styling** | Tailwind v4 + CSS custom properties |
| **Animations** | Framer Motion |
| **Charts** | Recharts |
| **CI/CD** | GitHub Actions → Cloudflare |

---

## Run It Yourself

```bash
git clone https://github.com/tejalgoyal2/Dime.git && cd Dime
npm install
cp .env.example .env.local
npm run dev
```

Everything you need to fill in is documented in `.env.example`.

---

## Quick Add — The Siri Thing

This is my favorite part. I can say "Hey Siri, log expense" and it asks what I spent, sends it to the API, Gemini parses it, done. No app, no typing, no friction.

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

### Setting Up the Apple Shortcut

1. Open **Shortcuts** on your iPhone
2. New shortcut → **Ask for Input** (Text, prompt: "What did you spend?")
3. **Get Contents of URL:**
   - URL: `https://dime.tgoyal.me/api/quick-add`
   - Method: POST
   - Header: `Authorization: Bearer YOUR_TOKEN`
   - Body: JSON → `{"text": "[input from step 2]"}`
4. Optional: **Show Notification** with the response
5. Name it "Log Expense"

Works with Raycast, iOS Automations, or anything that can send a POST request.

---

## How It's Built

```
app/
  api/          Server routes — CRUD, parse, insights, roast, quick-add
  login/        Auth (callsign + invite code)
  page.tsx      Auth gate → dashboard
components/
  dashboard/    The actual app — form, table, charts, modals
  providers/    Context (expenses, theme, toasts)
  ui/           Shared components
lib/
  supabase/     DB clients, types, middleware
  schemas/      Zod validation
  gemini.ts     AI integration
  rate-limit.ts Upstash rate limiter
```

The client never writes to the database directly. Everything goes through API routes with auth, validation, and rate limiting. WalletRIP did client-side Supabase inserts. We don't talk about WalletRIP.

---

## Design

**Neon Midnight.** Dark background, one electric green accent, Syne for headings, JetBrains Mono for everything else. Looks like a terminal at 2am — which is fitting, because that's when most of the spending happens.

---

## What Could Come Next

Not promises. Just ideas that live in my head rent-free.

- **Edit expenses** — the PATCH endpoint is already there, just needs a UI
- **Budget goals** — set a limit, get warned, ignore the warning, repeat
- **Multi-currency** — for when "coffee $5" becomes "koffie €4"
- **Recurring tracking** — the database field exists, the logic doesn't
- **Category breakdown** — more granular than just Needs vs Wants
- **Shared expenses** — split tracking with friends (and the awkward "you still owe me" conversations)

---

## Scripts

```bash
npm run dev        # dev server
npm run build      # production build
npm run build:cf   # cloudflare build
npm run preview    # preview locally
npm run deploy     # ship it
```

---

## Deploy

Push to `main`. GitHub Actions handles the rest. Deploys to Cloudflare Workers automatically.

---

Built by [Tejal Goyal](https://tgoyal.me)
