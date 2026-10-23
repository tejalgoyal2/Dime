# Dime: polish brief

Written 20 Oct 2026 from the code at `cee45ce` (main, same as GitHub), the README and
commit history, Tejal's launch post, and the public login page in Chromium and WebKit.
Nobody signed in. The dashboard was studied from the code only.

---

## Kickoff prompt (paste this into the new chat)

```
You're going to polish Dime, my expense tracker. Live: https://dime.tgoyal.me
Code: github.com/tejalgoyal2/Dime (local checkout: /Users/tejalgoyal/Desktop/Vibin/dime)

Dime lets you log spending the way you'd text a friend ("$11 sandwich"), and like a
friend it roasts you for it, in Hinglish. Next.js 16 on Cloudflare Workers, Supabase,
Gemini, Upstash.

Before touching anything, read these two files in full:
- /Users/tejalgoyal/Desktop/Vibin/plans/dime-polish.md (what Dime is, what's broken,
  a plan in rounds, a pile of ideas, guardrails)
- /Users/tejalgoyal/Desktop/Vibin/plans/STUDY-the-press.md (how I work and what I like)

This is a polish, not a rewrite. Past that, you have an open, free hand: don't feel
limited by the plan, be creative, make bold calls on look, feel and motion. Ask me
only about identity and content (copy that speaks for me, the friend's personality,
what to feature) and anything that touches real data, money or accounts.

How we work: a branch, a preview I can open, small rounds. Show me each round with
screenshots; I'll reply with notes; handle every one. Never sign in to or create
accounts on the live app, never touch real user data or Supabase / Cloudflare /
Gemini settings without asking me, never push to main without asking. Commits are
mine only (see Guardrails), and ask me about commit dates before the first one.

Start by reading, then come back with: your round 1, how you'll get a preview that
never touches real data, and your questions for me.
```

---

## What Dime is today

- **Login** (`app/login/page.tsx`): a callsign and a "secret code" (the password). The
  callsign quietly becomes `callsign@spendlog.app`. Sign-up asks for an invite code.
- **Dashboard** (`components/dashboard/dashboard-shell.tsx`): one text box; a toolbar
  (import, CSV, subs, roast me); a Needs vs Wants donut; weekly/monthly stacked bars;
  an AI insights card; a flat expense list with delete; a streak chip; theme toggle.
- **Logging**: the box posts raw text to `/api/parse`, Gemini returns an array of
  `{item_name, amount, category, type, date, emoji, funny_comment}`, then the browser
  posts the valid items to `/api/expenses`. The roast shows once under the box and is
  never saved.
- **AI**: four Gemini calls (parse, a 30-day insight, a "Performance Review" roast, a
  subscription hunter) in `lib/gemini.ts`, retried at 2/4/8 s on 429/503. Prompts
  assume Canada and CAD; the parse prompt forbids guessing prices and tells the model
  to convert USD/INR/EUR itself.
- **Quick Add** (`app/api/quick-add/route.ts`): one shared bearer token from env,
  inserting as one hard-coded user (`QUICK_ADD_USER_ID`). Driven by a Siri Shortcut.
- **Data**: one `expenses` table (id, user_id, item_name, amount, category, type,
  date, emoji, created_at; the launch post mentions an unused `is_recurring`). The
  schema and RLS policies are not in the repo.
- **Guards**: Upstash sliding window keyed by IP (20/min shared by all routes, 5 per
  15 min for invite checks), an `Origin` allow-list, Zod on create/patch/delete,
  explicit column lists, a CSV formula guard.
- **Look**: "Neon Midnight", dark by default with a light palette under
  `[data-theme="light"]`, Syne + JetBrains Mono, Framer Motion, Recharts.
- **Ship**: every push to main builds with OpenNext and runs `wrangler deploy`. No
  lint, typecheck or tests in CI, no preview deploys, no tests at all.
- **Size**: 46 source files, about 3,100 lines. `tsc --noEmit` is clean.
- **Context**: `WALKTHROUGH.md` in the local checkout (gitignored on purpose) tells
  the build story and the Workers gotchas. Read it; keep it out of the repo.

## What's already good (protect it)

- **The voice.** "let's see the damage", "join the roast", "your wallet's secrets are
  safe-ish", "Gone. Like your money.", "The void stares back.", the taken-callsign
  lines ("Our database only has budget for one maverick", "Try maverick_pro_max").
  That is the product. Extend it, don't sand it down.
- **One box, no forms.** The core idea is right.
- **"Never guess a price"** and the no-number path ("Bhai free mein mil raha hai
  kya? Price to bata!").
- **Sound bones**: server-only writes, Zod, explicit columns, CSV guard, lazy env
  reads for Workers. The bugs live at the edges, not the centre.
- **Callsigns instead of emails.** No PII by design. A privacy story waiting to be told.
- **Quick Add from Siri.** Tejal calls it his favourite part. It's the most
  "texting a friend" thing Dime does, and the best place to invest.
- **His own words** from the launch post: the monthly roast is "the one I use most";
  the bar chart is "the one that actually changes behavior"; he uses Dime most at 2 am.

## What's rough or broken

(verified) = seen live or proven by the code alone. (check) = depends on Supabase or
Cloudflare settings not in the repo; confirm with Tejal before acting.

### Fix first: security

1. **Next.js 16.2.6 has critical advisories.** `npm audit --omit=dev` (20 Oct) lists,
   among others, a middleware/proxy bypass for Turbopack App Router apps and an RCE in
   `next/og` `ImageResponse`, which `app/icon.tsx` uses. npm offers 16.4.2. Upgrade,
   re-run the audit, rebuild with OpenNext. (verified) Dime exists because of a Next
   middleware bypass; it shouldn't be sitting on another one.
2. **The invite code is never really checked.** The middleware covers `/api/*`, so a
   logged-out `POST /api/validate-invite` gets a 307 to `/login` (seen live with a
   GET). A 307 keeps the method, the browser POSTs to `/login`, Next renders the page
   with a 200 (a JSON POST isn't a server action), and `inviteRes.ok` is true for any
   code (`app/login/page.tsx:29-39`). Separately, `supabase.auth.signUp` runs in the
   browser with the public anon key, so anyone can skip the UI and sign up directly;
   with email confirmation off, they get a session and Tejal's Gemini quota. Fix:
   public sign-ups off in Supabase; a server route that checks the invite and creates
   the user with the service-role key (a Cloudflare secret); exclude public API routes
   from the redirect. Prove the 307 path with a local test, never on live. (verified
   from code; check the Supabase toggle)
3. **The synthetic emails live on someone else's domain.** `spendlog.app`
   (`app/login/page.tsx:26`) is a live third-party "AI-Powered Expense Tracker" with
   Zoho MX records. Any auth email Supabase ever sends (reset, email change, if
   confirmation returns) goes to a stranger's mailbox. Move to a domain Tejal owns,
   with no MX (a tgoyal.me subdomain), and migrate users with the admin API. Needs
   his OK and a careful plan. (verified)
4. **Rate limits can be dodged.** `lib/rate-limit.ts:58-62` trusts the first
   `X-Forwarded-For` value. Cloudflare appends to that header rather than replacing
   it, so the client picks its own key, and without the header everyone shares
   `127.0.0.1`. Use `CF-Connecting-IP`, key signed-in routes by user id, store a
   salted hash, not the IP. (verified from code)
5. **Quick Add.** It inserts with the anon key and no session. Under the usual
   `auth.uid() = user_id` policy that insert is refused, so either Siri logging is
   quietly broken or an anon insert policy lets anyone holding the public anon key
   write rows. (check) Also: model output goes into the insert with no Zod
   (`:74-96`), the token compare isn't constant-time (`:15`), the text is pasted into
   the prompt inside quotes (`:44`), and the roast is generated then dropped, so Siri
   has nothing funny to say back.
6. **RLS isn't in the repo.** WalletRIP's `supabase/rls.sql` had SELECT and INSERT
   policies only. If Dime's table matches, DELETE and PATCH match zero rows while the
   API still answers `success: true` (`app/api/expenses/route.ts:115-125`; PATCH
   returns `data[0]`, which is undefined): the row "deletes", then returns on reload.
   Commit the real schema and policies as migrations and check affected-row counts.
   (check)
7. **Errors leak internals.** Raw Supabase and Gemini messages reach the client
   (`Parse failed: ${message}`, `app/api/parse/route.ts:114`, and every
   `error.message`). Malformed JSON bodies become 500s instead of 400s. (verified)
8. **No security headers** on any response: no CSP, HSTS, frame-ancestors, nosniff or
   Referrer-Policy; `x-powered-by: Next.js` is on. (verified live)
9. **AI routes trust the browser.** `/api/roast`, `/api/insights` and
   `/api/analyze-subs` take an `expenses` array from the client, unbounded (subs sends
   the whole history), and only insights sanitises it. Read from the database on the
   server, cap it, and add a per-user daily AI cap so nothing can run up a bill.
   (verified)
10. **Where expense text goes.** On Gemini's unpaid tier Google may use prompts to
    improve its products. If the key is on that tier, every line anyone logs goes
    there. Say so, or change tiers. (check)

### Broken or wrong

- **Evening spends land on tomorrow.** "Today" is UTC on the server
  (`app/api/parse/route.ts:89`, `app/api/quick-add/route.ts:42`) and in the streak
  (`components/dashboard/streak-counter.tsx:15`). In Canada that's anything after
  about 5 pm Pacific. Send the local date and time zone from the client. (verified)
- **An expired session looks like lost data.** The middleware turns API calls into a
  redirect to the login HTML, `res.json()` throws, and `state.error` is never
  rendered anywhere, so the list shows "Nothing here yet. The void stares back."
  (verified from code)
- **Bulk import** accepts 5,000 characters (`bulk-import-modal.tsx:127`) but
  `/api/parse` rejects anything over 2,000 (`parse/route.ts:80`). (verified)
- **Model output is rendered unchecked.** `sub.amount.toFixed`
  (`subscription-hunter.tsx:90`), `total_monthly_cost.toFixed` (`:103`) and
  `item.amount.toFixed` (`bulk-import-modal.tsx:158`) throw if Gemini returns a
  string or null, and those modals sit outside every error boundary, so the dashboard
  goes blank. `parsedExpenseSchema` in `lib/schemas/expense.ts` is never used. Use
  Gemini's JSON mode with a response schema, then Zod. (verified)
- **Currency is a guess**, with "1 USD = 1.4 CAD" hard-coded in the prompt
  (`parse/route.ts:24-27`). Store the original amount and currency; convert with a
  real daily rate (the Bank of Canada Valet API is free and needs no key).
- **The list stops at 1,000.** `GET /api/expenses` has no paging, and Supabase's API
  returns 1,000 rows by default, so the oldest silently drop out of the list, charts
  and CSV. (check the project's max-rows setting)
- **The streak rewards spending.** It counts days with an expense; a no-spend day
  breaks it.
- **The "monthly" roast** roasts the 20 most recent entries (`roast/route.ts:51`).
- **Trends** skip empty weeks (so unrelated weeks sit side by side), weekly labels
  have no year, the chart grows forever. The donut and list total are all-time.
- **No edit.** PATCH exists, no UI. Tejal: "Every time I log something wrong I have
  to delete it and re-add it. This bothers me more than I expected."
- **Icons and install.** `app/favicon.ico` is the create-next-app default (untouched
  since the first commit); `/icon` sits behind the auth redirect, so logged-out
  visitors get a 307; `manifest.json` is never linked; no apple-touch-icon;
  `/robots.txt` redirects to `/login`. `app/icon.tsx` also declares
  `runtime = "edge"`, which the README itself says breaks OpenNext. (verified live)
- **Two logos.** The diamond prism (`public/logo.svg`, unused, and `app/icon.tsx`)
  vs the sailboat on the OG image and PWA icons.
- **Lint.** `npm run lint` lints the `.open-next/` build output (17,794 problems).
  On source alone: 2 errors (`streak-counter.tsx:16` calls `Date.now` in render,
  `theme-provider.tsx:22` sets state in an effect) and 1 warning.
- **README**: the Quick Add example shows `expense: {...}`; the route returns
  `expenses: [...]`.

### Feel, UX and accessibility

- **The roast, the whole point, is 12px grey italics** (`expense-form.tsx:148-158`),
  replaced by the next entry and never stored.
- **Light-mode users get a dark first paint.** The theme is applied in a `useEffect`
  (`theme-provider.tsx:19-28`); with JS off and a light preference the login body is
  `rgb(13,13,13)`. `theme-color` is always `#0d0d0d`. (verified)
- **Light mode reads as derived.** Charts hard-code the neon (`spending-chart.tsx:6`,
  `trends-chart.tsx:94-95`): 1.3:1 (green) and 1.9:1 (amber) on white. Light accent
  text is 3.7:1; the light Want badge 3.0:1.
- **Small grey type fails** in both themes: `--text-dimmed` is 2.6:1 on dark and
  2.8:1 on light, used at 10px for dates, categories, counts, callsign and footer.
  Chart ticks are 9px.
- **iOS zooms when you tap the box**: the main input is 14px, the import textarea
  12px. Safari zooms anything under 16px.
- **Delete is invisible on phones and to keyboards** (`opacity-0` until hover,
  `expense-table.tsx:99`). "confirm" stays armed forever. No undo.
- **Forms**: login labels aren't tied to inputs (`login/page.tsx:125,142,157`), no
  `autocomplete` so password managers can't help, the main box's only name is a
  rotating placeholder. Login tabs and the weekly/monthly toggle have no tab or
  pressed semantics. The modal has no Escape, focus trap or focus return.
- **No reduced-motion handling anywhere**: the empty state bounces forever
  (`empty-state.tsx:20`), the streak pulses, everything staggers on every load.
- Raw `2026-05-17` dates; one long flat list; toasts top-right over the header on
  phones, gone after 4 s, errors not announced assertively.

### Weight and speed

- **Login moves 371 KB, 285 KB of it JS** (Chromium, phone size, measured) for two
  fields. supabase-js (about 61 KB gzipped) and Framer Motion load for a form that
  could post to a server route.
- **Recharts is about 114 KB gzipped** in its chunk, for one donut and one bar chart.
- **Logging takes two round trips** (parse, then save), and each API call checks the
  session twice (middleware `getUser`, then the route's own).
- **Every visit starts on skeletons**: expenses load after hydration, although
  `app/page.tsx` already has the user on the server.
- Every row re-renders through `AnimatePresence`; no paging.

---

## The north star

Dime should feel like a chat with the friend who judges you. You text, it reads, it
types for a second, it replies. The thread is your history. Charts, insights and the
subscription hunter are that friend bringing receipts.

That one idea gives a home to most of the fixes: the roast gets a bubble and gets
saved; edit becomes "actually it was 14"; delete becomes unsend; the Gemini wait
becomes "typing..."; Siri becomes texting the friend from your lock screen.

Neon Midnight is a starting point, not a cage. Dime predates the portfolio's design
language and doesn't have to match it. The one fixed rule: light mode is designed as
its own thing, not flipped.

---

## The plan, in rounds

Every round: a branch, a preview, screenshots in Chromium and WebKit at desktop and
phone sizes, light and dark, reduced motion; Lighthouse; then Tejal's notes, all of
them handled and every question answered.

### Round 0: a safe place to work (short)

- A preview that never touches real data. Recommended: a demo data layer (a fake user,
  a seeded month of believable spends, canned AI replies) behind a flag, used by local
  dev and branch previews. If Tejal wants real AI in previews, a second free Supabase
  project and a separate Gemini key with a hard cap. Ask which.
- The real schema and RLS policies in `supabase/migrations/` (Tejal exports or
  approves; never touch the live project yourself).
- Lint ignores `.open-next/`; CI runs typecheck, lint and Playwright on every branch.
  Deploy stays main-only.

**Done looks like:** Tejal opens a preview (or a local URL) and sees a full dashboard
with a fake month, and nobody signed in to the real app to get there.

### Round 1: safe, correct, and the friend gets a voice

- Fixes: the Next upgrade; server-side sign-up with the invite checked for real (Tejal
  flips the Supabase toggle); `CF-Connecting-IP` and per-user keys; Quick Add
  validated, constant-time, returning the roast; clean error messages; security
  headers; AI routes reading from the DB with caps and a daily per-user limit; local
  date and time zone; the import limit; JSON mode plus Zod for every model reply; a
  visible error state; icons, manifest, robots.
- Feel: theme set before first paint; contrast tokens fixed and designed separately
  for each theme; 16px inputs on touch; reduced motion respected; delete visible on
  touch and keyboard, with undo instead of "confirm"; real labels and autocomplete.
- The friend: the roast leaves the grey italics. It arrives as a reply bubble after a
  "typing" beat that is the real wait, and it's saved with the expense. A ripple rings
  out from send when a spend lands, the same "coin dropped in" ripple the portfolio
  already uses for Dime's tile.

**Done looks like:** every item under "Fix first" and "Broken or wrong" is closed or
has a written reason; each fixed bug has an e2e test; Lighthouse 95+ in all four
categories on desktop and mobile; logging a spend feels like sending a text and
getting a reply; light mode looks designed.

### Round 2: the thread

- The list becomes the conversation, grouped by day ("today", "yesterday", "Sat 17
  Oct"): your message on one side, the friend's reply on the other, amounts in
  tabular mono.
- Edit by replying ("actually 14", "that was yesterday") or Up-arrow on the last
  entry. Delete is unsend, with five seconds to undo.
- Instant local parse while you type: an amount chip and a date chip appear before you
  hit send; the AI fills the rest. One round trip to log (parse, validate, save, all
  server-side).
- A fixed category list the model must choose from, one colour per category,
  everywhere.
- The streak counts days you checked in, including "spent nothing today", which makes
  the friend proud.

**Done looks like:** Tejal logs a week on the preview from his phone without touching
a form, and fixing a typo takes one message.

### Round 3: receipts (insights that earn their place)

- Code does the maths, the model does the words. Deterministic facts (this month vs
  the same day last month, your usual price per category, wants share, the biggest
  jump) go in; Gemini only phrases them. Cache once a day.
- Hand-built SVG charts in Dime's own style, drawn separately for light and dark,
  replacing Recharts.
- The subscription hunter writes back: it marks `is_recurring`, predicts the next
  charge and shows the yearly cost.
- The monthly roast becomes a real document (see "Performance Review" below).

**Done looks like:** every number on screen is computed, not generated; the dashboard
ships 100 KB+ less JS; every insight answers "so what?" in one line.

### Round 4: bigger swings (choose with Tejal)

Siri v2 (per-user tokens, Apple Pay auto-log, spoken replies), a public demo so
portfolio visitors can feel Dime without an invite, share cards, sound, "talk me out
of it", multi-currency done properly. Details below.

**Done looks like:** at least one thing Tejal shows people without being asked.

---

## Ideas and experiments

**[cheap]** = an afternoon. **[medium]** = a few days. **[ambitious]** = a round of its
own. Each needs a desktop, a touch and a reduced-motion version. Sample Hinglish below
is placeholder; Tejal's own lines beat ours.

### The friend

- **[cheap] Honest typing dots.** They run exactly as long as Gemini takes. The wait
  becomes character instead of a spinner.
- **[cheap] Read receipts.** A sensible grocery run gets "Seen" and nothing else.
  Silence is a reply too.
- **[cheap] Tapbacks by rule, not AI.** "!!" when a spend is 3x your usual for that
  category, "?" when the parse wasn't sure, "haha" for anything logged between 1 and 4 am.
- **[medium] The friend remembers.** Give the prompt facts: how many times this week,
  same shop, your usual price, time of day. "Teesri bubble tea is hafte, same dukaan.
  Shaadi kar le unse." Grounded roasts are funnier than generic ones.
- **[cheap] Reply in your register.** Type "chai 3 dollar" and get heavier Hinglish;
  type tidy English and get it lighter. No setting.
- **[medium] A phrasebook in Tejal's voice.** Ask him for 15 to 20 lines he'd really
  say and use them as examples in the prompt. Rules: punch at the purchase, never the
  person; no rupees; Canadian context; short.
- **[cheap] The mood is earned, not configured.** Easy on the 3rd, sharp on the 27th
  when wants are past budget, softer after a no-spend day.
- **[cheap] 2 am register.** After midnight the friend is sleepier and the UI dims a
  touch. That's when Tejal uses it most.
- **[medium] Talk me out of it.** "thinking of airpods $249" and the friend argues
  with your own numbers ("that's three weeks of your wants"). Say no and it's logged
  as resisted; the resisted total lives somewhere visible.
- **[medium] Bets.** "no coffee this week." The friend holds you to it and notices the
  Thursday latte.
- **[cheap] Duplicate radar as banter.** Same item, same amount, two minutes apart:
  "did you buy it twice or log it twice?" with a one-tap fix.
- **[cheap] Suspicious numbers.** Exactly $100 at a bar. A $3 thing that has quietly
  been $5 for a month (inflation, and the friend noticed).
- Ask Tejal: does the friend have a name? Is it Dime talking?

### Weird and overpriced

- **[cheap] Overpriced for you, not the internet.** Compare against your own median
  for that kind of item. Keeps the "never guess prices" rule intact.
- **[cheap] Prices in your own units.** "$16 a month is 38 bubble teas a year", using
  your most common want as the currency. Works in the hunter, the review and "talk me
  out of it".
- **[medium] Lines that know the category**: delivery fees, airport food, a
  subscription for something you already cancelled.

### Input feel

- **[cheap]** `/` or Cmd+K focuses the box from anywhere; Enter sends; Up edits the
  last one. (He built a whole site because a new keyboard deserved somewhere to type.)
- **[cheap]** Natural dates parsed locally: "yesterday", "last fri", "2 days ago".
- **[cheap]** "coffee 5, bagel 4" already comes back as an array; show two bubbles.
- **[cheap]** Paste a bank statement anywhere on the page and import opens with it.
- **[cheap]** On phones: 16px input, `enterkeyhint="send"`, a thumb-sized send, the box
  sits above the keyboard.
- **[ambitious]** Snap a receipt; Gemini reads it; you confirm. The photo is never stored.
- **[ambitious]** Voice in the browser where Web Speech exists. Siri may cover this;
  try it before building it.

### Insights that are actually useful

- **[cheap] One line on top**: "$412 so far, $38 under where you were on this day
  last month."
- **[cheap] Safe to spend today**: what's left divided by days left. One number.
- **[medium] The week as a box score**: days logged, wants share, biggest spend, most
  repeated item, player of the week. Small, exact craft, like the portfolio's box score.
- **[medium] "Your usual"**: typical price per category, shown as you log ("coffee
  usually $5.20").
- **[medium] Budgets that talk**: one number a month, not a spreadsheet. The friend
  warns at 80% and gets dramatic at 100%.

### Performance Review (the monthly roast, made real)

- **[medium]** An HR appraisal of your month: ratings ("Discipline: needs
  improvement", "Bubble tea: exceeds expectations"), a manager's comment in Hinglish,
  a signature line. Printable; designed for paper in light mode.
- **[medium]** Or a receipt that prints line by line as the reply streams in, with a
  torn edge you can save. Pick one with Tejal; don't ship both.

### Motion

- **[cheap]** The coin-drop ripple from send, matching the portfolio tile, so the brand
  moves the same way in both places.
- **[cheap]** Totals roll like an odometer when a spend lands.
- **[cheap]** Unsend: the bubble folds back into the box; undo brings it out again.
- **[medium] The Bluenose.** The schooner on the Canadian dime is already on Dime's OG
  image and app icons. Make it the only logo, and let a small line-drawn schooner
  cross the top rule as the month goes by: calm water under budget, chop over it. Real
  SVG, a few KB, standing still under reduced motion.
- Rules: transforms and opacity only; nothing that wheels or turns around; entrance
  stagger once per session at most.

### Sound

- **[cheap]** One synthesised Web Audio clink on log (no files), pitched by amount: a
  coffee tinks, rent thuds. Off by default, one toggle beside the theme switch.
- **[cheap experiment]** The friend reads the weekly roast aloud with `speechSynthesis`
  and an en-IN voice. Could be hilarious, could be awful. Try it on the preview.

### Sharing

- **[medium]** Share a roast as an image card: your text, the friend's reply, the
  Bluenose. Amounts hidden unless you choose otherwise.
- **[ambitious]** "Your month in Dime": a story-sized card with the verdict, the
  most-roasted item and an award.
- **[ambitious] A public demo** at `/demo`: a fake month in local storage, rule-based
  reactions, pre-written roasts, zero AI cost, no account. Portfolio visitors hit a
  login wall today. Ask Tejal first: Dime is invite-only "because it's mine and I like
  it that way".

### Privacy-first

- **[cheap]** Say it on the login page: no email, no real name, just a callsign. (His
  line for WalletRIP: a tracker "that never needs to know who you are.")
- **[cheap] Hide amounts**: one key, or a tap on the total, blurs every number. For
  screen shares and the person next to you on the bus.
- **[cheap] What the friend sees**: a peek at exactly what gets sent to Gemini.
- **[medium]** Export everything (CSV and JSON) and delete my account, self-serve.
- **[medium]** Salted hashes for rate-limit keys, no IPs stored, and one honest
  paragraph about where data goes.

### Siri and Shortcuts

- **[cheap]** Quick Add returns the roast, so the notification (or Siri) says it back.
- **[cheap]** "How much today?": a read-only endpoint with today's total and a
  one-liner, for a second Shortcut.
- **[medium]** Per-user Quick Add tokens: make one in the app, store only its hash,
  revoke any time. Friends get Siri too.
- **[medium] Apple Pay auto-log.** Shortcuts' Wallet "Transaction" automation hands
  over merchant and amount. Tap to pay, Dime logs it, the friend has thoughts.
- **[medium]** A one-tap install link for the Shortcut, with the token step in two lines.
- **[cheap]** A Raycast script command (the README already promises Raycast).

### Wildcards

- **[ambitious] Split it**: "dinner 80 split with Rahul" keeps an IOU and the friend
  reminds you who owes whom. Tejal called this "sounds simple and is not simple".
- **[ambitious] Offline first**: log into IndexedDB and sync later, so the subway
  isn't a dead zone.

---

## Guardrails

- **Credit.** Author and commit as
  `Tejal Goyal <132282123+tejalgoyal2@users.noreply.github.com>` (set it in this repo's
  git config; the existing 26 commits use his gmail, don't rewrite them without
  asking). No `Co-Authored-By`, no mention of Claude or AI as an author anywhere:
  commits, code comments, README, PR bodies. AI as a feature of Dime is fine to
  describe.
- **Commit dates.** Ask him before the first commit. Dime's history is already
  backdated and out of order. Also ask whether to keep Dime's `fix:`/`feat:` prefixes
  or the plain sentences the portfolio uses.
- **Main is production.** Every push to main deploys (`.github/workflows/deploy.yml`).
  Never push or merge to main without asking.
- **Accounts and data.** Never sign in to or create accounts on dime.tgoyal.me or
  WalletRIP, never submit forms there; public pages only. Test accounts only on a
  local or separate dev Supabase he set up, recorded in a seed file. Never read,
  export, migrate or delete real rows, and never change Supabase, Cloudflare, Upstash
  or Gemini settings yourself: prepare the change and the exact steps, and ask.
- **Secrets** live only in the host's settings (Cloudflare Worker secrets, plus
  GitHub secrets for the two `NEXT_PUBLIC_` build values). Never in the repo, in chat
  or in a URL.
- **Light and fast.** Every wow stays light. Aim for well under 150 KB of JS on the
  login page. Lighthouse before every stop, 95+ everywhere; watch CLS from font swaps
  and the contrast of small grey and red type.
- **Three designs for anything that moves or responds**: desktop, touch, reduced
  motion. Light mode designed first, never derived. Real CSS 3D or real WebGL only.
- **Test like a user.** Playwright in Chromium and WebKit, desktop and phone, light
  and dark, reduced motion. Record video and step through it frame by frame for motion
  bugs. An e2e test for every bug Tejal reports. Mock Gemini in tests.
- **Stop every dev server** (`next dev`, `wrangler dev`, anything) before you stop.
- **Skills.** Don't use his Chibi or Rizzual skills. (`app/globals.css` opens with a
  "RIZZUAL CREATIVE BRIEF" comment from the first build; leave it unless he says.)
- **Nothing that can bill.** Free plans; hard per-user daily caps on AI; rules or code
  wherever a model isn't needed.
- **His voice.** Ask before writing copy that speaks for him. He hand-edited the
  README toward plainer, factual copy after a casual rewrite (commit `323b0aa`), so
  keep README edits factual and small. The jokes in the app are his; extend them in
  the same register.
- **Keep the portfolio honest.** tgoyal.me describes Dime ("7 API routes", "0
  database writes from the browser") in the portfolio repo's `src/data/projects.js`.
  If a round changes those facts, tell Tejal; don't edit the portfolio from this chat.
- **No half-baked.** A control works everywhere, on every device, or it isn't there.
  No homework for the user: no setup wizards, no personality dials.

## Questions to ask Tejal before round 1

1. Commit dates, and commit message style?
2. Previews: a demo data layer, a second Supabase project, or local only?
3. Could you check in Supabase: are public sign-ups on, which RLS policies exist on
   `expenses`, and does Siri Quick Add actually work today?
4. Is spendlog.app yours? If not, OK to move callsign emails to a domain you own?
5. Is the Gemini key on the free or paid tier, and what daily cap per person feels right?
6. The friend: a name? How savage? 15 to 20 lines in your own voice?
7. Stay invite-only, or a public demo for portfolio visitors?
8. OK to store each roast with its expense (the thread needs it)?
