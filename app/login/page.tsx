"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";

export default function LoginPage() {
  const [isSignUp, setIsSignUp] = useState(false);
  const [callsign, setCallsign] = useState("");
  const [secretCode, setSecretCode] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [shake, setShake] = useState(0);
  const router = useRouter();
  const supabase = createClient();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const email = `${callsign.toLowerCase().replace(/\s+/g, "")}@spendlog.app`;

      if (isSignUp) {
        const inviteRes = await fetch("/api/validate-invite", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ code: inviteCode }),
        });
        if (!inviteRes.ok) {
          const data = (await inviteRes.json().catch(() => ({}))) as {
            error?: string;
          };
          throw new Error(data.error || "Invalid Invite Code");
        }

        const { error: signUpError } = await supabase.auth.signUp({
          email,
          password: secretCode,
          options: { data: { callsign } },
        });
        if (signUpError) throw signUpError;
      } else {
        const { error: signInError } =
          await supabase.auth.signInWithPassword({
            email,
            password: secretCode,
          });
        if (signInError) throw signInError;
      }

      router.push("/");
      router.refresh();
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Something went wrong";

      if (
        message.includes("already registered") ||
        message.includes("unique constraint")
      ) {
        setShake((prev) => prev + 1);
        const sarcasticMessages = [
          `Bro, ${callsign} is already famous here. Try another.`,
          `Arey! ${callsign} pehle se hai. Kuch aur soch.`,
          `Our database only has budget for one ${callsign}.`,
          `Error 404: The name ${callsign} is taken. Try ${callsign}_pro_max.`,
          `Identity theft is not a joke, ${callsign}.`,
        ];
        setError(
          sarcasticMessages[
            Math.floor(Math.random() * sarcasticMessages.length)
          ]
        );
      } else {
        setError(message);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="font-[family-name:var(--font-display)] text-3xl font-bold tracking-tight text-[var(--text)]">
            Dime
          </h1>
          <p className="mt-1 text-xs text-[var(--text-muted)]">
            every cent has a story. usually a bad one.
          </p>
        </div>

        <div className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] overflow-hidden">
          <div className="flex border-b border-[var(--border)]">
            <button
              onClick={() => setIsSignUp(false)}
              className={`flex-1 py-3 text-xs font-medium transition-colors ${
                !isSignUp
                  ? "text-[var(--text)] border-b-2 border-[var(--accent)]"
                  : "text-[var(--text-muted)] hover:text-[var(--text)]"
              }`}
            >
              Sign In
            </button>
            <button
              onClick={() => setIsSignUp(true)}
              className={`flex-1 py-3 text-xs font-medium transition-colors ${
                isSignUp
                  ? "text-[var(--text)] border-b-2 border-[var(--accent)]"
                  : "text-[var(--text-muted)] hover:text-[var(--text)]"
              }`}
            >
              Sign Up
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4 p-6">
            <div>
              <label className="mb-1.5 block text-xs text-[var(--text-muted)]">
                Callsign
              </label>
              <motion.input
                key={shake}
                animate={shake ? { x: [-8, 8, -8, 8, 0] } : {}}
                transition={{ duration: 0.4 }}
                type="text"
                value={callsign}
                onChange={(e) => setCallsign(e.target.value)}
                className="w-full rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--text)] placeholder:text-[var(--text-dimmed)] focus:border-[var(--accent)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
                placeholder="maverick"
                required
              />
            </div>

            <div>
              <label className="mb-1.5 block text-xs text-[var(--text-muted)]">
                Secret Code
              </label>
              <input
                type="password"
                value={secretCode}
                onChange={(e) => setSecretCode(e.target.value)}
                className="w-full rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--text)] placeholder:text-[var(--text-dimmed)] focus:border-[var(--accent)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
                placeholder="••••••••"
                required
              />
            </div>

            {isSignUp && (
              <div>
                <label className="mb-1.5 block text-xs text-[var(--text-muted)]">
                  Invite Code
                </label>
                <input
                  type="text"
                  value={inviteCode}
                  onChange={(e) => setInviteCode(e.target.value)}
                  className="w-full rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--text)] placeholder:text-[var(--text-dimmed)] focus:border-[var(--accent)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
                  placeholder="ask a friend"
                  required
                />
              </div>
            )}

            {error && (
              <p className="text-center text-xs italic text-[var(--accent)]">
                {error}
              </p>
            )}

            <Button
              type="submit"
              disabled={loading}
              className="w-full"
            >
              {loading
                ? "hold on..."
                : isSignUp
                  ? "join the roast"
                  : "let's see the damage"}
            </Button>
          </form>
        </div>

        <p className="mt-4 text-center text-[10px] text-[var(--text-dimmed)]">
          invite-only. your wallet&apos;s secrets are safe-ish.
        </p>
      </div>
    </div>
  );
}
