# What we learned building tgoyal.me ("the press")

A study of the October 2026 revamp of Tejal Goyal's portfolio, written so that
anyone (a person, or a Claude in a fresh chat) can work with him on his other
projects the way that worked here. Repo: github.com/tejalgoyal2/portfolio.
Live: tgoyal.me.

## Who you're working with

- Tejal Goyal (he/him). Software engineer, MEng (Applied Data Science), builds
  across frontend, security, ML and systems. Ships v1 over perfect, then polishes hard.
- Strong design taste. He built a whole design system because he was tired of
  AI-looking interfaces. Generic = wrong.
- Writes casually, honestly, a bit wry ("my lonely ahh did this lmao"). He
  starts from the itch: why he wanted the thing. Never corporate.
- He gives you real creative freedom ("impress me"). Make bold calls on look and
  motion; ask only about identity and content (copy that speaks for him, facts
  about him, what to feature).
- Off the clock: F1, speedcubing, card tricks, baking, badminton, the TC10K, an
  NGO that has planted 1,000+ trees. Don't publish his birth year. Don't keep
  naming his employer or city.

## What he loved

- Small things that answer you: a click that ripples the paper, letters that
  lift near the cursor, a pen for a cursor, a car on the rules, a bug you can
  catch, a stamp that spins, a cube you can twist. The model was the Claude
  desktop background, where a click sends a wave through a field of characters.
- Real craft, done right at small scale: a drop cap, a box score of numbers, a
  folded dog-ear that says "this turns over", a "Weekend Edition" insert.
- Motion with a story: project tiles that turn over in a wave of little square
  scales (Mystique), a different wave per project (a ripple for type, rows
  like a printing receipt for Dime, lateral spread for a security tool, a terminal scan for a
  CLI agent).
- Plain, honest copy that says what a thing is and why he made it, in his own
  voice. "I got a new mechanical keyboard and wanted somewhere to just type.
  Notepad felt like a waste of a good keyboard."
- A checklist of hidden things to find that ticks itself off.
- Seeing it in a real browser, with proof (screenshots, frame-by-frame).

## What he rejected (and why)

- Anything that makes the visitor do homework: a 5s / 30s / 2min "how long have
  you got" dial. Don't make people choose how to read.
- Effects that feel fake or glitchy: red markup that flickered, mixed
  handwriting and underlines, the same rotation on every handwritten note
  ("not natural"), a pen nib riding a line, a square end mark.
- Things that wheel or turn around (carousels, cylinders).
- Cliche lines ("bring me something that isn't"). He'd rather say "Hiring,
  building something, or just want to talk F1? All three work."
- Text-selection jitter, half-working buttons, a click that sometimes misses.
  "We do not want that kind of half-baked experience."
- Features framed as people writing to him (gratitude "letters to the editor").
  Make it something visitors do for themselves.
- Heavy pages. Every wow must stay light.

## How we worked (keep doing this)

1. **Work on a branch with a preview URL, show him each round, take notes, fix,
   repeat.** Rounds were small and fast. He reviews in the browser and replies
   with a long list; handle every item, then answer every question.
2. **Verify like a user, with proof.** Playwright in Chromium and WebKit
   (Safari breaks 3D hit-testing and clip paths differently), desktop and phone
   sizes, reduced motion. Record video and read it frame by frame for motion
   bugs. That's how we found a one-frame blank flash and a font-fallback flash
   on load that no unit test would catch.
3. **Lighthouse before every stop.** We ended at 96/100/100/100 desktop and
   95/100/100/100 mobile. Watch CLS from font swaps and contrast on small red or
   grey type.
4. **Keep e2e tests for every bug he reports**, so it can't come back.
5. **Don't leave dev servers running.** Never merge to main until he says so.

## Rules for commits and credit

- Author and commit as `Tejal Goyal <132282123+tejalgoyal2@users.noreply.github.com>`.
  GitHub rejects pushes that expose his gmail.
- No `Co-Authored-By`, no mention of Claude or AI in commits, code comments,
  READMEs or PR bodies, unless he asks for it in the product itself (he chose
  "broken by me (and Claude)" for his own colophon).
- He has asked for commit dates to be spread out naturally. Ask him what he
  wants for each repo before backdating anything.
- Don't use his personal Claude skills (Chibi, Rizzual) unless he asks.
- Never sign in to, or create accounts on, his live apps (Dime, WalletRIP)
  without asking. Read the code and use the public pages.

## Engineering patterns that held up

- One animation loop (GSAP ticker driving Lenis). Animate transforms and opacity
  only, cache layout, never measure per frame.
- Every interactive or motion piece gets three designs: desktop, touch, reduced
  motion. Light mode is designed first, never derived.
- Real CSS 3D or real WebGL only; no faked depth.
- Heavy things load after the first paint, pause when off screen or hidden, and
  render only when something changed (the cube dropped to near-zero idle cost).
- Fonts: preload without blocking paint, but hold back the type that's set first
  until its faces arrive. Ask for a face only after its stylesheet has loaded,
  or `document.fonts.load` answers instantly with nothing.
- Small backends on Cloudflare's free plan, so nothing can bill: Pages Functions,
  D1, Turnstile, Workers AI moderation, hard daily caps, salted hashes instead of
  IPs, secrets only in Cloudflare.

## Quotes worth remembering

- "the portfolio is a playground, not a LinkedIn profile"
- "each element should make it feel something"
- "be free and be creative (just do not make the page too heavy)"
- "first impression lasts"
