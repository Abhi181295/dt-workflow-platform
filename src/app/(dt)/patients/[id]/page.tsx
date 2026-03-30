import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import { NavHeader } from "@/components/NavHeader";
import { SessionTimeline } from "@/components/SessionTimeline";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import Link from "next/link";

export default async function PatientDetailPage({
  params,
}: {
  params: { id: string };
}) {
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

  if (!profile) redirect("/login");

  const { data: patient } = await supabase
    .from("patients")
    .select("id, name, phone, code, created_at")
    .eq("id", params.id)
    .single();

  if (!patient) notFound();

  const { data: rawSessions } = await supabase
    .from("sessions")
    .select(
      `id, type, status, scheduled_at, created_at,
       template:templates(name),
       reminders(id, fire_at, status, offset_label, slack_message_sent_at)`
    )
    .eq("patient_id", patient.id)
    .order("created_at", { ascending: false });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sessions = (rawSessions ?? []).map((s: any) => ({
    ...s,
    template: Array.isArray(s.template) ? s.template[0] ?? null : s.template,
  }));

  return (
    <div className="min-h-screen bg-muted/40">
      <NavHeader name={profile.name} role={profile.role as "admin" | "dt"} />
      <div className="p-6 max-w-4xl mx-auto">
        <div className="mb-6">
          <Link href="/dashboard">
            <Button variant="ghost" size="sm">
              &larr; Back to Dashboard
            </Button>
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Patient Info */}
          <div className="md:col-span-1 space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>{patient.name}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div>
                  <span className="text-muted-foreground">Phone: </span>
                  {patient.phone}
                </div>
                <div>
                  <span className="text-muted-foreground">Code: </span>
                  {patient.code ?? "—"}
                </div>
                <div>
                  <span className="text-muted-foreground">Added: </span>
                  {new Date(patient.created_at).toLocaleDateString("en-IN", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Timeline */}
          <div className="md:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Timeline</CardTitle>
              </CardHeader>
              <CardContent>
                <SessionTimeline sessions={sessions ?? []} />
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
