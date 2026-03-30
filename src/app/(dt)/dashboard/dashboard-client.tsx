"use client";

import { NavHeader } from "@/components/NavHeader";
import { PatientCard } from "@/components/PatientCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Link from "next/link";

interface Session {
  id: string;
  type: string;
  status: string;
  scheduled_at: string;
  template: { name: string; body: string } | null;
  patient: { id: string; name: string; phone: string; code: string | null };
}

interface Patient {
  id: string;
  name: string;
  phone: string;
  code: string | null;
  created_at: string;
  sessions: {
    id: string;
    type: string;
    status: string;
    scheduled_at: string;
  }[];
}

interface Template {
  id: string;
  name: string;
  body: string;
  type: string;
}

interface Reminder {
  id: string;
  fire_at: string;
  offset_label: string | null;
  status: string;
  slack_message_sent_at: string | null;
  session_type: string;
  patient_name: string;
}

const statusColors: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  sent: "bg-green-100 text-green-800",
  failed: "bg-red-100 text-red-800",
};

export function DashboardClient({
  profile,
  todaySessions,
  allPatients,
  templates,
  recentReminders,
}: {
  profile: { name: string; role: string };
  todaySessions: Session[];
  allPatients: Patient[];
  templates: Template[];
  recentReminders: Reminder[];
}) {
  return (
    <div className="min-h-screen bg-muted/40">
      <NavHeader name={profile.name} role="dt" />

      <div className="p-4 sm:p-6 max-w-4xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold">Dashboard</h1>
            <p className="text-muted-foreground text-sm">
              Welcome back, {profile.name}
            </p>
          </div>
          <Link href="/dashboard/add">
            <Button className="w-full sm:w-auto">+ Add Patient</Button>
          </Link>
        </div>

        <Tabs defaultValue="today">
          <TabsList className="w-full sm:w-auto">
            <TabsTrigger value="today" className="flex-1 sm:flex-none">
              Today&apos;s Queue
              {todaySessions.length > 0 && (
                <Badge variant="secondary" className="ml-2">
                  {todaySessions.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="patients" className="flex-1 sm:flex-none">
              All Patients
            </TabsTrigger>
            <TabsTrigger value="reminders" className="flex-1 sm:flex-none">
              Reminder Log
            </TabsTrigger>
          </TabsList>

          <TabsContent value="today" className="mt-4">
            {todaySessions.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <p className="text-lg">No tasks for today</p>
                <p className="text-sm mt-1">
                  Add a patient to get started
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {todaySessions.map((session) => (
                  <PatientCard
                    key={session.id}
                    session={session}
                    dtName={profile.name}
                    templates={templates}
                  />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="patients" className="mt-4">
            {allPatients.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <p>No patients yet</p>
              </div>
            ) : (
              <div className="rounded-lg border bg-white overflow-x-auto">
                <table className="w-full text-sm min-w-[500px]">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="text-left p-3 font-medium">Name</th>
                      <th className="text-left p-3 font-medium">Code</th>
                      <th className="text-left p-3 font-medium hidden sm:table-cell">Phone</th>
                      <th className="text-left p-3 font-medium">Status</th>
                      <th className="text-left p-3 font-medium">
                        Next Session
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {allPatients.map((patient) => {
                      const activeSessions = patient.sessions?.filter(
                        (s) => s.status !== "done" && s.status !== "cancelled"
                      );
                      const nextSession = activeSessions?.sort(
                        (a, b) =>
                          new Date(a.scheduled_at).getTime() -
                          new Date(b.scheduled_at).getTime()
                      )[0];
                      const lastDone = patient.sessions
                        ?.filter((s) => s.status === "done")
                        .sort(
                          (a, b) =>
                            new Date(b.scheduled_at).getTime() -
                            new Date(a.scheduled_at).getTime()
                        )[0];

                      return (
                        <tr
                          key={patient.id}
                          className="border-t hover:bg-muted/30 cursor-pointer"
                          onClick={() =>
                            (window.location.href = `/patients/${patient.id}`)
                          }
                        >
                          <td className="p-3 font-medium">{patient.name}</td>
                          <td className="p-3 text-muted-foreground">
                            {patient.code ?? "—"}
                          </td>
                          <td className="p-3 hidden sm:table-cell">{patient.phone}</td>
                          <td className="p-3">
                            {nextSession ? (
                              <Badge variant="outline" className="bg-yellow-50 text-yellow-800">
                                {nextSession.status.replace("_", " ")}
                              </Badge>
                            ) : lastDone ? (
                              <Badge variant="outline" className="bg-green-50 text-green-800">
                                done
                              </Badge>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </td>
                          <td className="p-3 text-muted-foreground">
                            {nextSession
                              ? new Date(
                                  nextSession.scheduled_at
                                ).toLocaleDateString("en-IN", {
                                  day: "numeric",
                                  month: "short",
                                })
                              : "—"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </TabsContent>

          <TabsContent value="reminders" className="mt-4">
            {recentReminders.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <p>No reminders yet</p>
              </div>
            ) : (
              <div className="rounded-lg border bg-white overflow-x-auto">
                <table className="w-full text-sm min-w-[500px]">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="text-left p-3 font-medium">Patient</th>
                      <th className="text-left p-3 font-medium">Type</th>
                      <th className="text-left p-3 font-medium hidden sm:table-cell">Offset</th>
                      <th className="text-left p-3 font-medium">Fire Time</th>
                      <th className="text-left p-3 font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentReminders.map((r) => (
                      <tr key={r.id} className="border-t">
                        <td className="p-3 font-medium">
                          {r.patient_name ?? "—"}
                        </td>
                        <td className="p-3 capitalize">
                          {r.session_type ?? "—"}
                        </td>
                        <td className="p-3 text-muted-foreground hidden sm:table-cell">
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
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
