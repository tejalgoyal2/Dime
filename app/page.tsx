import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { ToastProvider } from "@/components/providers/toast-provider";

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const callsign =
    user.user_metadata?.callsign ??
    user.email?.split("@")[0] ??
    "anon";

  const meta = user.user_metadata ?? {};
  const animal = typeof meta.animal === "string" ? meta.animal : null;
  const budget = typeof meta.budget === "number" && meta.budget > 0 ? meta.budget : null;
  const punchGoal = typeof meta.punch_goal === "number" ? meta.punch_goal : null;

  // Toasts (and the motion config) live with the dashboard, so /login stays light.
  return (
    <ToastProvider>
      <DashboardShell callsign={callsign} animal={animal} budget={budget} punchGoal={punchGoal} />
    </ToastProvider>
  );
}
