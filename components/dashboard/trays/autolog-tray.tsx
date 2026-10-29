"use client";

import { useCallback, useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { formatDistanceToNowStrict, parseISO } from "date-fns";
import { Check, Copy, Trash2, Zap } from "lucide-react";
import { Pills } from "@/components/ui/pills";
import { useExpenses } from "@/components/providers/expenses-provider";
import { useToast } from "@/components/providers/toast-provider";
import { Tray } from "@/components/ui/tray";
import { Button } from "@/components/ui/button";

type Token = { id: string; name: string; prefix: string; created_at: string; last_used_at: string | null };
type Platform = "iphone" | "android" | "other";

const SAMPLE = "RBC: Your Visa card ending 4417 was charged $14.85 at BLUE BOTTLE COFFEE TORONTO on Oct 25.";

function CopyField({ label, value, secret }: { label: string; value: string; secret?: boolean }) {
  const [copied, setCopied] = useState(false);
  return (
    <div>
      <p className="mb-1 px-1 text-[12px] font-medium text-ink-3">{label}</p>
      <button
        onClick={async () => {
          await navigator.clipboard.writeText(value);
          setCopied(true);
          setTimeout(() => setCopied(false), 1400);
        }}
        className="flex w-full items-center gap-2 rounded-[8px] bg-sunken px-3.5 py-2.5 text-left transition-transform active:scale-[0.99]"
      >
        <code className={`min-w-0 flex-1 truncate text-[13px] ${secret ? "font-semibold" : ""}`}>{value}</code>
        <AnimatePresence mode="wait" initial={false}>
          <motion.span key={String(copied)} initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.6, opacity: 0 }}>
            {copied ? <Check size={15} className="text-[#2fbf71]" /> : <Copy size={15} className="text-ink-3" />}
          </motion.span>
        </AnimatePresence>
      </button>
    </div>
  );
}

function Steps({ items }: { items: React.ReactNode[] }) {
  return (
    <ol className="space-y-2.5">
      {items.map((s, i) => (
        <li key={i} className="flex gap-3 text-[14px] leading-snug">
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-ink text-[12px] font-semibold text-paper">{i + 1}</span>
          <span className="pt-0.5 text-ink-2">{s}</span>
        </li>
      ))}
    </ol>
  );
}

const B = ({ children }: { children: React.ReactNode }) => <span className="font-medium text-ink">{children}</span>;

export function AutologTray({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { toast } = useToast();
  const { refresh } = useExpenses();
  const [tokens, setTokens] = useState<Token[] | null>(null);
  const [unavailable, setUnavailable] = useState(false);
  const [fresh, setFresh] = useState<string | null>(null);
  const [platform, setPlatform] = useState<Platform>("iphone");
  const [busy, setBusy] = useState(false);
  const [test, setTest] = useState<string | null>(null);
  const endpoint = typeof window === "undefined" ? "/api/ingest" : `${window.location.origin}/api/ingest`;

  const load = useCallback(() => {
    fetch("/api/tokens")
      .then(async (r) => {
        if (!r.ok) throw new Error();
        setTokens((await r.json()) as Token[]);
        setUnavailable(false);
      })
      .catch(() => setUnavailable(true));
  }, []);

  useEffect(() => {
    if (open) load();
  }, [open, load]);

  async function create() {
    setBusy(true);
    const r = await fetch("/api/tokens", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: platform === "android" ? "Android" : platform === "iphone" ? "iPhone" : "Automation" }),
    }).catch(() => null);
    setBusy(false);
    if (!r?.ok) return toast("Couldn't create a token", "error");
    const t = (await r.json()) as Token & { token: string };
    setFresh(t.token);
    load();
  }

  async function revoke(id: string) {
    setTokens((ts) => ts?.filter((t) => t.id !== id) ?? null);
    const r = await fetch("/api/tokens", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
    if (!r.ok) {
      toast("Couldn't revoke that", "error");
      load();
    }
  }

  async function sendTest() {
    if (!fresh) return;
    setTest("…");
    const r = await fetch("/api/ingest", {
      method: "POST",
      headers: { Authorization: `Bearer ${fresh}`, "Content-Type": "application/json" },
      body: JSON.stringify({ text: SAMPLE, source: "sms" }),
    }).catch(() => null);
    // Success is an empty 204 with the outcome in a header; errors are JSON.
    const status = r?.headers.get("X-Dime-Status");
    const d = r && !r.ok ? ((await r.json().catch(() => null)) as { error?: string } | null) : null;
    setTest(status === "logged" ? "Logged it. Check your receipt." : status === "duplicate" ? "Already had that one." : status === "ignored" ? "Not a purchase, so I skipped it." : d?.error ?? "No response");
    if (r?.ok) refresh();
  }

  const shownToken = fresh ?? "dime_••••••••••••";

  return (
    <Tray open={open} onClose={onClose} title="Auto-log" icon={<Zap size={18} />}>
      <div className="space-y-5">
        <p className="text-[15px] leading-snug text-ink-2">
          Your bank already texts you every purchase. Forward those texts here and they log themselves. Dime ignores OTPs,
          refunds and deposits, and never logs the same message twice.
        </p>

        {unavailable ? (
          <div className="rounded-[10px] bg-sunken p-4 text-[14px] leading-snug text-ink-2">
            <p className="font-medium text-ink">Almost there. The server needs a one-time setup:</p>
            <p className="mt-1">
              run <code>supabase/migrations/002_dashboard_autolog.sql</code> in Supabase and add the{" "}
              <code>SUPABASE_SERVICE_ROLE_KEY</code> secret to Cloudflare.
            </p>
          </div>
        ) : (
          <>
            <Pills
              label="Your phone"
              value={platform}
              onChange={setPlatform}
              options={[
                { value: "iphone", label: "iPhone" },
                { value: "android", label: "Android" },
                { value: "other", label: "Anything" },
              ]}
              className="rounded-[10px] bg-sunken p-1"
              buttonClassName="h-9 flex-1 rounded-[8px] text-[14px] font-medium"
              markerClassName="bg-paper shadow-paper"
              activeClassName="text-ink"
              idleClassName="text-ink-2 hover:text-ink"
            />

            <div className="space-y-3">
              <CopyField label="Endpoint" value={endpoint} />
              {fresh ? (
                <>
                  <CopyField label="Your token (shown once, copy it now)" value={fresh} secret />
                  <div className="flex items-center gap-2">
                    <Button size="sm" variant="secondary" onClick={sendTest}>
                      Send a test alert
                    </Button>
                    {test && <span className="text-[13px] text-ink-2">{test}</span>}
                  </div>
                </>
              ) : (
                <Button onClick={create} disabled={busy} className="w-full" size="lg">
                  <Zap size={15} fill="currentColor" /> Create a token
                </Button>
              )}
            </div>

            {platform === "iphone" && (
              <Steps
                items={[
                  <>Open <B>Shortcuts</B> → <B>Automation</B> → <B>+</B> → <B>Message</B>.</>,
                  <>Set <B>Message Contains</B> to a word your bank uses, like <B>charged</B> or <B>debited</B> (or pick your bank as <B>Sender</B>). Choose <B>Run Immediately</B>.</>,
                  <>Add <B>Get Contents of URL</B>. URL: the endpoint. Method <B>POST</B>. Header <B>Authorization</B>: <code>Bearer {shownToken.slice(0, 14)}…</code></>,
                  <>Request Body <B>JSON</B>, key <B>text</B>, value <B>Shortcut Input → Message</B>. That&apos;s it. It logs quietly, no pop-ups.</>,
                ]}
              />
            )}
            {platform === "android" && (
              <Steps
                items={[
                  <>Install <B>MacroDroid</B> (free) or Tasker.</>,
                  <>Trigger: <B>SMS Received</B> containing <B>charged</B>/<B>debited</B>. Or <B>Notification Received</B> from your bank&apos;s app.</>,
                  <>Action: <B>HTTP Request</B>, POST to the endpoint, header <B>Authorization: Bearer …</B></>,
                  <>Body: <code>{'{"text": "[sms_message]"}'}</code> (or <code>[notification]</code>), content type JSON.</>,
                ]}
              />
            )}
            {platform === "other" && (
              <div className="space-y-2">
                <p className="text-[14px] text-ink-2">
                  Anything that can make a web request works: Zapier, IFTTT, an email rule, a script.
                </p>
                <pre className="overflow-x-auto rounded-[8px] bg-sunken p-3.5 text-[12px] leading-relaxed">{`curl -X POST ${endpoint} \\
  -H "Authorization: Bearer ${shownToken}" \\
  -H "Content-Type: application/json" \\
  -d '{"text": "Card charged $14.85 at Blue Bottle", "source": "api"}'`}</pre>
              </div>
            )}

            <a
              href="https://github.com/tejalgoyal2/Dime/blob/main/docs/auto-log.md"
              target="_blank"
              rel="noopener noreferrer"
              className="block text-[14px] font-medium text-ink-2 underline decoration-line-strong underline-offset-4 hover:text-ink"
            >
              More ways: Apple Pay, Siri, Raycast, the terminal →
            </a>

            {tokens && tokens.length > 0 && (
              <div>
                <p className="mb-1.5 px-1 text-[12px] font-medium text-ink-3">Active tokens</p>
                <ul className="overflow-hidden rounded-[10px] bg-sunken">
                  {tokens.map((t) => (
                    <li key={t.id} className="flex items-center gap-3 border-b border-line px-4 py-2.5 last:border-b-0">
                      <span className="min-w-0 flex-1">
                        <span className="block text-[14px] font-medium">{t.name}</span>
                        <span className="text-[12px] text-ink-3">
                          {t.prefix}… ·{" "}
                          {t.last_used_at ? `used ${formatDistanceToNowStrict(parseISO(t.last_used_at), { addSuffix: true })}` : "never used"}
                        </span>
                      </span>
                      <button onClick={() => revoke(t.id)} aria-label={`Revoke ${t.name}`} className="flex h-8 w-8 items-center justify-center rounded-[8px] text-danger hover:bg-surface active:scale-90">
                        <Trash2 size={15} />
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </>
        )}
      </div>
    </Tray>
  );
}
