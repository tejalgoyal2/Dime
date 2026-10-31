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

  const animal = typeof user.user_metadata?.animal === "string" ? user.user_metadata.animal : null;

  // Toasts (and the motion config) live with the dashboard, so /login stays light.
  return (
    <ToastProvider>
      <DashboardShell callsign={callsign} animal={animal} />
    </ToastProvider>
  );
}
