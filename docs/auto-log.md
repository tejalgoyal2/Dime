# Auto-log: let your phone do the logging

Opening an app to type "coffee 5" is already one step too many. The fix: let your phone send Dime what you spent while you get on with your life.

Every setup below does the same thing: send a bit of text to one URL with your token. Dime reads it, works out the item, price, Life or Lego, and logs it quietly. No reply, no pop-up, no roast. The roasts are for when you open the app.

## First: get your token

1. Open [dime.tgoyal.me](https://dime.tgoyal.me), tap your avatar (top right) → **Auto-log**.
2. Tap **Create a token** and copy it. It looks like `dime_` followed by a lot of gibberish.
3. Put it somewhere safe. Dime only stores a fingerprint of it, so it's shown exactly once. Lose it? Revoke it and make a new one, no drama.

Treat it like a password: anyone with it can add expenses to your account (they can't read anything, but still).

You'll need two things in every recipe:

- **URL:** `https://dime.tgoyal.me/api/ingest`
- **Header:** `Authorization` = `Bearer dime_your_token_here` (the word Bearer, a space, then your token)

---

## iPhone

All three use the **Shortcuts** app, which is already on your phone. Pick one, or do all three.

### 1. "Hey Siri, log expense"

The everyday one. Say it, then say what you bought.

1. Shortcuts → **+** (new shortcut). Name it **Log expense**.
2. Add **Ask for Input**. Type: Text. Prompt: *what'd you get?*
3. Add **Get Contents of URL**.
   - URL: `https://dime.tgoyal.me/api/ingest`
   - Tap the arrow to show more. Method: **POST**
   - Headers: add `Authorization` → `Bearer dime_…`
   - Request Body: **JSON**. Add a field: key `text`, value: the **Provided Input** variable.
4. Done. Now: "Hey Siri, log expense" → "uber home 18". Logged.

Bonus: add it to your Home Screen or Action button for one-tap logging.

### 2. Tap to pay, logged automatically (Apple Pay)

The magic one. Every time you tap your phone or watch to pay, Dime logs it. You literally do nothing.

1. Shortcuts → **Automation** → **+** → **Transaction** (it's under Wallet).
2. Pick your cards. Choose **Run Immediately** and turn off **Notify When Run**.
3. Tap **New Blank Automation** and add **Get Contents of URL**, set up like above (POST, the `Authorization` header, JSON body).
4. For the `text` value, tap the variables and build: **Shortcut Input → Merchant**, a space, then **Shortcut Input → Amount**. It ends up like "Starbucks $6.45".

This only fires for Apple Pay in person. Online and card-swipe purchases still need recipe 1 or 3.

### 3. Forward your bank's texts

If your bank texts you every purchase ("Your card was charged $14.85 at..."), Dime can read those.

1. Shortcuts → **Automation** → **+** → **Message**.
2. **Message Contains**: a word your bank always uses, like `charged`, `debited` or `purchase`. Or set **Sender** to your bank.
3. **Run Immediately**, then **New Blank Automation** → **Get Contents of URL** like above.
4. JSON body: `text` = **Shortcut Input → Message**, and add a second field `source` = `sms`.

Dime ignores OTPs, refunds, deposits and declined payments, and if the same text arrives twice it only logs it once.

---

## Android

### 1. Bank texts or bank app notifications (MacroDroid)

[MacroDroid](https://play.google.com/store/apps/details?id=com.arlosoft.macrodroid) is free and doesn't need root.

1. New macro → Trigger: **SMS Received**. Set the sender to your bank, or "content contains" `debited` / `charged`.
   - Bank only sends app notifications? Use **Notification Received** and pick your bank's app instead.
2. Action: **HTTP Request**.
   - Method **POST**, URL `https://dime.tgoyal.me/api/ingest`
   - Header: `Authorization` → `Bearer dime_…`
   - Body (content type `application/json`): `{"text": "[sms_message]", "source": "sms"}`
   - For notifications: `{"text": "[notification]", "source": "notification"}`
3. Save. Buy something. Watch it show up.

Tasker works too if you already live in Tasker; same idea, an **HTTP Request** action.

### 2. A "log expense" button on your home screen

[HTTP Shortcuts](https://play.google.com/store/apps/details?id=ch.rmy.android.http_shortcuts) (free, open source) makes a home-screen button that asks you what you bought:

1. New shortcut → method **POST**, URL as above, header `Authorization`.
2. Add a variable of type **Text input** called `what`.
3. Body: `{"text": "{{what}}"}`. Put the shortcut on your home screen.

Google Assistant can open that shortcut by name too.

---

## Everything else

### Terminal

Put this in your `.zshrc` or `.bashrc` and never leave the keyboard again:

```bash
dime() { curl -s -X POST https://dime.tgoyal.me/api/ingest -H "Authorization: Bearer dime_…" -d "$*"; }
```

```bash
dime pad thai 16
```

### Raycast (Mac)

Make a script command (`~/raycast/dime.sh`, then add the folder in Raycast → Extensions → Script Commands):

```bash
#!/bin/bash
# @raycast.schemaVersion 1
# @raycast.title Log expense
# @raycast.mode silent
# @raycast.argument1 { "type": "text", "placeholder": "coffee 5" }
curl -s -X POST https://dime.tgoyal.me/api/ingest -H "Authorization: Bearer dime_…" -d "$1"
```

### Email receipts, Zapier, Make, n8n, your own script

Anything that can send a POST request works. Point it at the URL with the header, and send the email subject or body as `text` with `"source": "email"`.

---

## The fine print (for nerds)

**Request.** `POST /api/ingest` with `Authorization: Bearer dime_…`. Body is either plain text or JSON:

```json
{ "text": "Your Visa *4417 was charged $14.85 at BLUE BOTTLE", "source": "sms", "date": "2026-10-29" }
```

- `text` (required): the note or the alert, up to 1500 characters.
- `source` (optional): `api` (default), `shortcut`, `sms`, `email` or `notification`. Only `sms`, `email` and `notification` get de-duplicated, because two "coffee 5"s in a day are two coffees.
- `date` (optional): `YYYY-MM-DD`, to log something from another day.

**Response.** Success is an empty `204 No Content`. If you're curious what happened, the `X-Dime-Status` header says `logged`, `duplicate` or `ignored` (not a purchase).

Errors come back as JSON (`{ "error", "code", "retryAfter" }`):

| Status | Means |
|---|---|
| 401 | Token missing, wrong, or revoked |
| 413 | Message too long (8 KB max) |
| 422 | Couldn't find a purchase in that |
| 429 | Slow down (see the limits) |

**Limits**, so nobody can run up the bill: 30 requests a minute per IP, 12 a minute per token, and 300 AI reads per person per day (shared with the app).

**Privacy.** Dime sends the text to Google's Gemini to work out the item and price, saves the expense, and keeps a hash of alerts so it can spot duplicates. It doesn't keep the original message.

**Sorting.** If you've flipped something to Life or Lego before, auto-logged expenses with the same name follow your call.

`/api/quick-add` is the old endpoint. It still works and does the same thing.
