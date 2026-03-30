import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { NavHeader } from "@/components/NavHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function AdminPage() {
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

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date();
  todayEnd.setHours(23, 59, 59, 999);

  // Stats queries in parallel
  const [
    { count: totalPatientsToday },
    { count: pendingReminders },
    { count: completedToday },
    { data: dts },
  ] = await Promise.all([
    supabase
      .from("patients")
      .select("*", { count: "exact", head: true })
      .gte("created_at", todayStart.toISOString())
      .lte("created_at", todayEnd.toISOString()),
    supabase
      .from("reminders")
      .select("*", { count: "exact", head: true })
      .eq("status", "pending")
      .lte("fire_at", todayEnd.toISOString()),
    supabase
      .from("sessions")
      .select("*", { count: "exact", head: true })
      .eq("status", "done")
      .gte("created_at", todayStart.toISOString()),
    supabase
      .from("profiles")
      .select("id, name")
      .eq("role", "dt"),
  ]);

  // DT-wise breakdown
  const dtBreakdown = await Promise.all(
    (dts ?? []).map(async (dt) => {
      const [{ count: patients }, { count: pending }, { count: done }] =
        await Promise.all([
          supabase
            .from("patients")
            .select("*", { count: "exact", head: true })
            .eq("assigned_dt_id", dt.id),
          supabase
            .from("sessions")
            .select("*", { count: "exact", head: true })
            .eq("dt_id", dt.id)
            .in("status", ["scheduled", "reminder_sent"]),
          supabase
            .from("sessions")
            .select("*", { count: "exact", head: true })
            .eq("dt_id", dt.id)
            .eq("status", "done"),
        ]);
      return { name: dt.name, patients: patients ?? 0, pending: pending ?? 0, done: done ?? 0 };
    })
  );

  const stats = [
    { label: "Patients Added Today", value: totalPatientsToday ?? 0 },
    { label: "Pending Reminders", value: pendingReminders ?? 0 },
    { label: "Completed Today", value: completedToday ?? 0 },
    { label: "Total DTs", value: dts?.length ?? 0 },
  ];

  return (
    <div className="min-h-screen bg-muted/40">
      <NavHeader name={profile.name} role="admin" />
      <div className="p-6 max-w-5xl mx-auto">
        <h1 className="text-2xl font-bold mb-6">Admin Overview</h1>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {stats.map((s) => (
            <Card key={s.label}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {s.label}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">{s.value}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">DT-wise Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            {dtBreakdown.length === 0 ? (
              <p className="text-sm text-muted-foreground">No DTs added yet.</p>
            ) : (
              <div className="rounded-lg border overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="text-left p-3 font-medium">DT Name</th>
                      <th className="text-left p-3 font-medium">Total Patients</th>
                      <th className="text-left p-3 font-medium">Pending Sessions</th>
                      <th className="text-left p-3 font-medium">Completed</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dtBreakdown.map((dt) => (
                      <tr key={dt.name} className="border-t">
                        <td className="p-3 font-medium">{dt.name}</td>
                        <td className="p-3">{dt.patients}</td>
                        <td className="p-3">{dt.pending}</td>
                        <td className="p-3">{dt.done}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
