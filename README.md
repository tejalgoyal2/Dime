# Dime

AI-powered expense tracker. Type naturally, let Gemini handle the rest.

**Live at:** [wallet.tgoyal.me](https://wallet.tgoyal.me)

## Features

- Natural language expense input ("coffee $5", "uber to work $12")
- AI-powered parsing via Gemini 2.5 Flash-Lite
- Spending breakdown charts (donut + trends)
- AI insights and monthly "roast"
- Subscription detection
- Bulk import (paste bank statements)
- CSV export
- Streak tracking
- Dark/light theme
- PWA-ready
- Quick Add API for Apple Shortcuts / automation

## Tech Stack

- **Framework:** Next.js 16 (App Router, TypeScript)
- **Runtime:** Cloudflare Workers via @opennextjs/cloudflare
- **Database:** Supabase (PostgreSQL + RLS)
- **AI:** Google Gemini 2.5 Flash-Lite
- **Rate Limiting:** Upstash Redis (sliding window)
- **Styling:** Tailwind CSS v4 + CSS custom properties
- **Animations:** Framer Motion
- **Charts:** Recharts
- **CI/CD:** GitHub Actions -> Cloudflare Pages

## Setup

```bash
# Clone
git clone https://github.com/tejalgoyal2/Dime.git && cd Dime

# Install
npm install

# Configure environment
cp .env.example .env.local
# Fill in your keys (see .env.example for details)

# Run dev server
npm run dev
```

## Environment Variables

| Variable | Required | Where |
|----------|----------|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Client + CI |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Client + CI |
| `GEMINI_API_KEY` | Yes | Server only |
| `GEMINI_MODEL` | No | Server (default: gemini-2.5-flash-lite) |
| `INVITE_CODE` | Yes | Server only |
| `ADMIN_EMAIL` | Yes | Server only |
| `UPSTASH_REDIS_REST_URL` | Yes | Server only |
| `UPSTASH_REDIS_REST_TOKEN` | Yes | Server only |
| `QUICK_ADD_TOKEN` | Yes | Server only |
| `QUICK_ADD_USER_ID` | Yes | Server only |

## Deployment

Deployed to Cloudflare Pages via GitHub Actions on push to `main`.

**GitHub Secrets needed:**
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `CLOUDFLARE_API_TOKEN`
- `CLOUDFLARE_ACCOUNT_ID`

**Cloudflare Pages env vars (set in dashboard):**
- All server-only vars from the table above

```bash
# Manual deploy
npm run deploy
```

## Quick Add API

Log expenses without opening the app. Perfect for Apple Shortcuts or any HTTP client.

### Endpoint

```
POST /api/quick-add
Authorization: Bearer YOUR_QUICK_ADD_TOKEN
Content-Type: application/json

{"text": "coffee at starbucks $5.50"}
```

### Response

```json
{
  "success": true,
  "expense": {
    "id": "uuid",
    "item_name": "Coffee at Starbucks",
    "amount": 5.50,
    "category": "Food & Drink",
    "type": "Want",
    "date": "2026-05-17",
    "emoji": "☕"
  }
}
```

### Apple Shortcuts Setup

1. Open the **Shortcuts** app on your iPhone
2. Create a new shortcut
3. Add **"Ask for Input"** action -> Type: Text, Prompt: "What did you spend?"
4. Add **"Get Contents of URL"** action:
   - URL: `https://wallet.tgoyal.me/api/quick-add`
   - Method: POST
   - Headers: `Authorization: Bearer YOUR_TOKEN`
   - Request Body: JSON -> `{"text": "[Ask for Input result]"}`
5. (Optional) Add **"Show Notification"** with the response
6. Name it something like "Log Expense"
7. Now say: **"Hey Siri, log expense"**

### Automations

You can also trigger it from:
- Siri Shortcuts
- iOS/macOS Automations
- curl / httpie
- Raycast scripts
- Any HTTP client

## Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Development server (Turbopack) |
| `npm run build` | Production build |
| `npm run build:cf` | Build for Cloudflare |
| `npm run preview` | Preview Cloudflare build locally |
| `npm run deploy` | Build + deploy to Cloudflare |
| `npm run lint` | ESLint |

## Architecture

```
app/
  api/          Edge API routes (CRUD, parse, insights, roast, quick-add)
  login/        Auth pages
  page.tsx      Server component (auth gate -> dashboard)
components/
  dashboard/    Feature components (form, table, charts, modals)
  providers/    Context providers (expenses, theme, toast)
  ui/           Shared primitives (button, modal, toast, skeleton)
  auth/         Auth components
lib/
  supabase/     DB clients and types
  schemas/      Zod validation schemas
  gemini.ts     AI integration
  rate-limit.ts Upstash rate limiter
```

All database writes go through server-side API routes. Client never touches Supabase directly for mutations.
