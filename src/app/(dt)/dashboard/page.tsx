import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { DashboardClient } from "./dashboard-client";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // Use service-role-free query — RLS should allow users to read own profile
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("name, role")
    .eq("id", user.id)
    .single();

  // If profile can't be fetched, show a helpful message instead of looping
  if (!profile || profileError) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center space-y-2 p-6">
          <h1 className="text-xl font-bold">Profile not found</h1>
          <p className="text-muted-foreground text-sm">
            Your account ({user.email}) exists but no profile was found.
          </p>
          <p className="text-muted-foreground text-sm">
            Error: {profileError?.message ?? "No profile row"}
          </p>
          <p className="text-xs text-muted-foreground mt-4">
            Ask your admin to check the profiles table.
          </p>
        </div>
      </div>
    );
  }

  // Admin on DT page — redirect once
  if (profile.role === "admin") redirect("/admin");

  // Today's sessions
  const todayEnd = new Date();
  todayEnd.setHours(23, 59, 59, 999);

  const { data: rawSessions } = await supabase
    .from("sessions")
    .select(
      `id, type, status, scheduled_at, created_at,
       template:templates(name, body),
       patient:patients!inner(id, name, phone, code)`
    )
    .eq("dt_id", user.id)
    .in("status", ["scheduled", "reminder_sent"])
    .lte("scheduled_at", todayEnd.toISOString())
    .order("scheduled_at", { ascending: true });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const todaySessions = (rawSessions ?? []).map((s: any) => ({
    ...s,
    template: Array.isArray(s.template) ? s.template[0] ?? null : s.template,
    patient: Array.isArray(s.patient) ? s.patient[0] : s.patient,
  }));

  // All patients for the DT
  const { data: allPatients } = await supabase
    .from("patients")
    .select(
      `id, name, phone, code, created_at,
       sessions(id, type, status, scheduled_at)`
    )
    .eq("assigned_dt_id", user.id)
    .order("created_at", { ascending: false });

  // Templates for follow-up dialog
  const { data: templates } = await supabase
    .from("templates")
    .select("id, name, body, type");

  // Recent reminders for this DT
  const { data: rawReminders } = await supabase
    .from("reminders")
    .select(
      `id, fire_at, offset_label, status, slack_message_sent_at,
       session:sessions!inner(
         type,
         patient:patients!inner(name)
       )`
    )
    .eq("dt_id", user.id)
    .order("fire_at", { ascending: false })
    .limit(20);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recentReminders = (rawReminders ?? []).map((r: any) => ({
    id: r.id,
    fire_at: r.fire_at,
    offset_label: r.offset_label,
    status: r.status,
    slack_message_sent_at: r.slack_message_sent_at,
    session_type: r.session?.type,
    patient_name: Array.isArray(r.session?.patient)
      ? r.session.patient[0]?.name
      : r.session?.patient?.name,
  }));

  return (
    <DashboardClient
      profile={profile}
      todaySessions={todaySessions}
      allPatients={(allPatients ?? []) as any} // eslint-disable-line @typescript-eslint/no-explicit-any
      templates={(templates ?? []) as any} // eslint-disable-line @typescript-eslint/no-explicit-any
      recentReminders={recentReminders}
    />
  );
}
