import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";

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

  const adminEmail = process.env.ADMIN_EMAIL;
  const isAdmin =
    !!adminEmail &&
    user.email?.toLowerCase() === adminEmail.toLowerCase();

  return <DashboardShell callsign={callsign} isAdmin={isAdmin} />;
}
