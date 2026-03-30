import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { NavHeader } from "@/components/NavHeader";
import { Badge } from "@/components/ui/badge";

export default async function LogsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("name, role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") redirect("/dashboard");

  const { data: rawReminders } = await supabase
    .from("reminders")
    .select(
      `id, fire_at, offset_label, status, slack_message_sent_at, created_at,
       session:sessions!inner(
         type,
         patient:patients!inner(name),
         dt:profiles!sessions_dt_id_fkey(name)
       )`
    )
    .order("fire_at", { ascending: false })
    .limit(100);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const reminders = (rawReminders ?? []).map((r: any) => {
    const session = r.session;
    return {
      id: r.id,
      fire_at: r.fire_at,
      offset_label: r.offset_label,
      status: r.status,
      slack_message_sent_at: r.slack_message_sent_at,
      session_type: session?.type,
      patient_name: Array.isArray(session?.patient)
        ? session.patient[0]?.name
        : session?.patient?.name,
      dt_name: Array.isArray(session?.dt)
        ? session.dt[0]?.name
        : session?.dt?.name,
    };
  });

  const statusColors: Record<string, string> = {
    pending: "bg-yellow-100 text-yellow-800",
    sent: "bg-green-100 text-green-800",
    failed: "bg-red-100 text-red-800",
  };

  return (
    <div className="min-h-screen bg-muted/40">
      <NavHeader name={profile.name} role="admin" />
      <div className="p-6 max-w-5xl mx-auto">
        <h1 className="text-2xl font-bold mb-6">Reminder Logs</h1>

        {reminders.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            No reminders yet.
          </div>
        ) : (
          <div className="rounded-lg border bg-white overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left p-3 font-medium">Patient</th>
                  <th className="text-left p-3 font-medium">DT</th>
                  <th className="text-left p-3 font-medium">Type</th>
                  <th className="text-left p-3 font-medium">Offset</th>
                  <th className="text-left p-3 font-medium">Fire Time</th>
                  <th className="text-left p-3 font-medium">Status</th>
                  <th className="text-left p-3 font-medium">Sent At</th>
                </tr>
              </thead>
              <tbody>
                {reminders.map((r) => (
                  <tr key={r.id} className="border-t">
                    <td className="p-3 font-medium">
                      {r.patient_name ?? "—"}
                    </td>
                    <td className="p-3">{r.dt_name ?? "—"}</td>
                    <td className="p-3 capitalize">
                      {r.session_type ?? "—"}
                    </td>
                    <td className="p-3 text-muted-foreground">
                      {r.offset_label ?? "—"}
                    </td>
                    <td className="p-3">
                      {new Date(r.fire_at).toLocaleString("en-IN", {
                        day: "numeric",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                    <td className="p-3">
                      <Badge
                        variant="outline"
                        className={statusColors[r.status] ?? ""}
                      >
                        {r.status}
                      </Badge>
                    </td>
                    <td className="p-3 text-muted-foreground">
                      {r.slack_message_sent_at
                        ? new Date(r.slack_message_sent_at).toLocaleString(
                            "en-IN",
                            {
                              day: "numeric",
                              month: "short",
                              hour: "2-digit",
                              minute: "2-digit",
                            }
                          )
                        : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
