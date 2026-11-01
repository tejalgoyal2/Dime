# Dime, the subjective version

How Dime got made, told through what Tejal asked for, what they pushed back on, and what they cared about. [DIME.md](DIME.md) is the objective reference (what is in the repo). This file is the other half: the story, the taste, and the opinions behind it.

**Where this comes from.** Tejal's messages in the build sessions (25 Oct to 1 Nov 2026), plus what the assistant (Claude) learned about how they work. Quotes are lightly trimmed for length. Where a message was mostly anger, it is paraphrased and the swearing is left out. The substance of every complaint is kept. This is one person's account of working with an AI on a product, so it is deliberately opinionated.

---

## 1. The short version

Tejal wanted an expense tracker that does not feel like one. It should feel like texting a friend who roasts you, with a dashboard behind it that looks like a person designed it. They had no reference design and said so: "I do not have any definitive reference, that is why I came to you." They wanted the assistant to research, think, and bring ideas. They did not want it to fill in a template.

The product ended up as: type `coffee 7` and Tom the lizard (a Hinglish-roasting character) answers in one line. Each purchase is sorted into **Life** (needs) or **Lego** (wants). A dashboard of cards shows where the money goes. Phone automations can auto-log bank texts. It is invite-only and asks for no email or phone number.

It took about eight days and roughly ten rounds of "no, not that." Most of the good decisions came out of the rejections.

## 2. How they work (the pattern)

- **They tell you how the user should feel and leave the how to you.** "I am not giving you ideas, I am telling you how the user, how me, should feel when we get to the page."
- **They judge by looking.** Many decisions began with "I can only tell after seeing what you do." They send screenshots with arrows and say exactly what is off: a bubble that jumps, a dot that gets clipped, a label in the wrong place.
- **They expect real research.** The assistant once looked at a single website and ran with it. The reply: "You just saw one website when researching and went along. This is not the research I want. Look at multiple things. Do not follow any one skill, website or idea blindly."
- **They want autonomy.** "Please make branches and push the code, do not get stuck on just saving it on device." Push, deploy and check it live yourself. Cloudflare too.
- **They hate stale advice.** "I do not ever want these kind of outdated ideas from you. If it was going to expire this year, why would you recommend this to me?" No deprecated tech, and the newest model should be picked up automatically.
- **They think about the user who is not them.** "We assume the user is not financially literate. It is our duty." That is why the `(i)` explainers exist. Same for privacy: putting their own name on the main-screen chat "feels like I'm personally reading their expenses."
- **They care about tokens and money.** "Try to use not more tokens than required." The prompts were cut down, the free AI tier is used first, and no heavy graphics were allowed.
- **They notice the small stuff** and treat it as a signal. A glitch in a toggle is a sign the whole thing was not thought through: "this shows that the design is not thought upon, and we don't want that."

## 3. The story, round by round

### Round A: "Revamp it" (25 Oct)
First message: a visual overhaul, "very immersive", a code review, better usability, and a GitHub Action so the free Supabase project never pauses for inactivity. Also: do not use more tokens than needed.

- Result: the keep-alive workflow (still there). The first redesign was thrown away.
- Verdict: "This is pure AI slop. The fonts and everything look so bad." A security review was wanted, but "not right now, have it all in a file that is not committed." That became `SECURITY_NOTES.md`, which stays local.

### Round B: Finding the look (26 Oct)
The most painful day. Three redesigns were rejected in a row.

- "Nah nah nah this looks so vibe coded. Do a deep research and get some actual good creative, novel designs."
- "These look not polished, thought upon, and look like some lazy kid told AI to make some expense tracking website. We do not want to be seen like that, do we?"
- Asked for: a **dark mode**, feel-good modern colours, a **dashboard where users can move things around**, many card options so every user gets their own, and "hella smooth and simple" animation. Later: Excel/report export. Also an **API for auto-logging** bank text messages.
- Tried and rejected: a comic-panel layout ("too comicky and gimmicky, this is not a toy"), a bold yellow look, a blue tone, a mascot. More on those in section 4.
- The turning point was a long brief on the feeling: someone opens dime.tgoyal.me and finds "a friend that is waiting for you to log in and wants to listen to you and your expenses and roast and help you", then a lively dashboard where "someone thought behind every swipe, every click."

### Round C: Font and structure locked (27 Oct)
- The font was decided: **Chillax**. "I liked the first font style. The others look like all the AI websites."
- The name stays **Dime**. A Hindi name ("Hisaab") was rejected, and only the roasts are in Hinglish.
- The login page must not show anything about the user before they log in, so the "Dime club" counter was removed: "if the user hasn't logged in, how will you know."
- "Do not use a mascot." Round shapes everywhere were also bad, but "do not go and make a sharp square shape either." The landing zone was 8 to 14px corners.
- Second round, after the reset: "hmm, much better."

### Round D: Palettes, API, and shipping (28 to 29 Oct)
- "Looks good. Have more colour palette options, a thoughtful dark mode, an interesting login screen", plus small tweaks like "coffee & croissant" instead of "chai & samosa".
- Wanted: the auto-log API ready to use, secured against someone "bombarding me", and the database kept alive.
- Asked a real question about Supabase's legacy service key, then got annoyed when the answer was outdated.
- Wanted the new Dime live: "when can I see the new Dime in place?" That is when the habit started of pushing to main so every change shows up on the real site.
- The text-message API should return nothing and skip the AI reply, because "that is for people logging into the app."
- A new logo and a link preview image (LinkedIn, etc.). README and docs "clever, funny, natural, how I talk", with iPhone setup first, then Android.
- A long polish list from live use: a glitchy selection bubble, the white colour dots piercing dark mode, "typing..." replaced by iMessage-style dots, a green dollar bill for big spends, a profile animal, a roast that showed `**` markdown, better Life/Lego categorising with the option to override, and a "6 7" easter egg.

### Round E: Delight and translation (29 to 31 Oct)
- A translation button on the Tom chat (later with Chinese), an advice card with a small disclaimer, a better calendar, the Life/Lego flip made more obvious, CSV export fixed, and "fade out more smoothly, all the animations."
- Sign-out confirmation. A real account-delete with two funny confirmations that removes everything. The tejal icon for the login chat instead of a letter, as long as it is not a "low quality look alike." The animal icons should not tilt on hover. The footer should read "made with too much coffee," not a name.
- Mobile pass at the end, "after all your changes", with a separate sub-agent.

### Round F: Glitch hunting (31 Oct)
Every item here is a screenshot-driven bug report.
- The translation text glitches when the cursor is over it. The login chat shows a "weird black box" while the reply is typing. The average label on the bar chart sits in a weird spot. The click-ripple gets cut off on the left. The divider between Life and Lego in the bar "looks weird."
- Requests were slow: keep Gemini, or move to Groq?
- The cash-rain animation "is very unnatural," but must not be heavy.
- The chat character is **Tom the lizard** in the app. Tejal appears only on the login chat. Having their own name on the main-screen chat feels like a breach of the user's privacy.
- The Microsoft-style emoji profile icons look odd.
- Then: "drop that coin thing, just keep the emoji animals for now", and "use this kind of Lego block."
- And: "have an (i) that tells the user what type of graph shows what... in a non-distracting (i) so it does not hinder the experience."
- Ending note: "I love it overall."

### Round G: Prompts and smartness (1 Nov, morning)
- The AI replies were not engaging, and the prompts should be shorter and cheaper.
- Remove the "dance" animation on replies. Fix the bug where deleting a typed message replays the big-expense animation, "and I suspect there might be more things like this that will make them think I did not do a good job."
- More translation effects, and a glitch where "a word shows for an instant and the cell changes shape abruptly."
- "I also do not like the Lego logo" (the brick was redrawn).
- **Price parsing:** `6 milk 2%` logged milk for $2 and nagged about "two numbers." The ask: figure out which number is the price and which is part of the name. `6 for milk 2` means milk 2% for $6. Tejal asked first whether that was even possible.
- Prefer Gemini for serious questions, and "if Gemini releases a new model I do not want to go change something in the code."
- The budget was saved only in the browser (it vanished on the phone), so it moved to the account.
- Think of other possibilities and fix those too.
- A security review of a pasted network request: "make sure our database and our network are secure and ready for real-world attackers."
- Meta questions (see section 6).

### Round H: Receipts, tap-to-fix, and the docs (1 Nov, afternoon)
- Yes to **tap the price to fix it**, yes to **logging from a photo of a receipt**. "No to the rest of the suggestions."
- Fix: after Undo, the translated roast still showed the old message.
- Translation effects "that go letter by letter, transforming or morphing, like the sci-fi one but not exactly similar." Not fade in, fade out.
- A sub-agent to write the full repo doc (this file's sibling) including secret names, exact prompts, and how to publish to Cloudflare. Fix whatever the audit finds, and for unused code, a one-line comment saying what it is and why it is unused.
- Last: raise contrast "slightly, not too big a change, I can only tell after seeing what you do", then these two docs, a release, and a clean GitHub.

## 4. The rejected pile (so nobody suggests these again)

| Rejected | Why, in their words or close to it |
|---|---|
| Mona Sans / Inter / Geist-style fonts | "That AI slop font." |
| Bold full-bleed yellow, volt, coral, cobalt mesh gradients | "Looks bad." Also glows and glass. |
| Comic panels | "Too comicky and gimmicky. This is not a toy." |
| A mascot or coin-with-a-face character | "Do not use a mascot. You are bad at making a character." |
| Blue / ultramarine tones | Rejected twice. |
| Pill shapes everywhere | Too round. But sharp squares were not wanted either. |
| Ledger or editorial hairlines, pastel bento | Looked like a template. |
| A Hindi product name | Only the roasts are in Hinglish. |
| User data on the login page | "How will you know who they are if they have not logged in." |
| Coin avatars | The emoji animals stayed. |
| The "dancing" reply bubble | Distracting. |
| Any animation that replays when content comes back | Looks like a bug. |
| Any reflow or size snap mid-animation | "Smooth and buttery and fluid." |
| A side/3-quarter view Lego brick | The front view with round studs won. |
| Cash rain that falls unnaturally | Changed or removed. |
| The name in the footer | "Made with too much coffee" instead. |
| "Text me" copy | "We do not want this much closeness." |
| Cmd+K search hint | Windows users exist, and it looked cramped. |

## 5. What landed

- **Chillax** font. Neutral surfaces with one colour for Life and one for Lego. Palettes: Graphite (ink and orange), Watermelon, Cherry, plus forest, plum and espresso, each with a thought-through dark mode.
- 8 to 14px corners.
- Tom the lizard: Hinglish roasts, with English and Chinese translations that morph letter by letter (decode, flap, materialize, rain).
- Life vs Lego as needs vs wants, with an override.
- A rearrangeable dashboard: receipt, seesaw, trends, punch-card streak, a year view, advice.
- Auto-logging from bank texts via a personal token, with no reply.
- Receipt photos. Tap the price to fix it.
- Account, budget and punch goal sync. Account delete.
- Gemini first (better jokes, auto-updating "latest" models), Groq as the backup.
- Security: per-request nonce CSP, rate limits on every write, RLS on every table, tokens stored only as hashes.
- Invite-only sign-up. No email or phone. And one honest line: if you forget your password, nobody can reset it for you.

## 6. Questions Tejal asked about the tooling itself

These show how they think about working with AI:
- What is the best way to handle a forgotten paste: stop and resend, edit the message, or paste into the running session?
- What does compaction really do, and why do the tokens climb back up after every new message?
- How do I delete images from context?
- Is the Supabase "secret key" the right one to use, and are legacy keys being deprecated?
- Why am I using the expensive model for this? ("If I were to just tell and code, Sonnet would have been better. Why would I waste my tokens on you.")

The last one is a fair summary of the deal: the expensive model was meant to bring ideas and judgement, not just type code.

## 7. Lessons worth keeping

1. **Taste is found by rejecting.** Nobody described the final look up front. It came out of about ten rounds of "no", each of which ruled something out.
2. **State the feeling, not the design.** The best brief of the project said how a user should feel. It said nothing about colours.
3. **Research more than one source.** Anything copied from a single site got rejected.
4. **Ship to the real site early.** Seeing it live changed what Tejal asked for next.
5. **A glitch is a design signal.** Small jumps, clipped ripples and mid-animation size changes were each treated as proof the thing was not finished.
6. **Make the AI cheap and swappable.** Short prompts, a free tier first, a fallback, and "latest" model names so a new release needs no code change.
7. **Privacy is part of the personality.** The author's own name stays off the user's screen. No emails or phone numbers. Data deletion is real.
8. **Write down what was rejected.** It stopped the same ideas coming back after each reset.

## 8. Not covered

- Tejal's real-life reasons and plans for the project beyond what was said in chat.
- Anything said outside these sessions.
- The exact number of rounds. Some were small and are folded into the ones above.
