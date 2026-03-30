"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Patient {
  id: string;
  name: string;
  phone: string;
  code: string | null;
  created_at: string;
  dt: { name: string } | null;
  sessions: { id: string; type: string; status: string; scheduled_at: string }[];
}

export function PatientsClient({
  patients,
  dts,
}: {
  patients: Patient[];
  dts: { id: string; name: string }[];
}) {
  const [filterDt, setFilterDt] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");

  const filtered = patients.filter((p) => {
    if (filterDt !== "all" && p.dt?.name !== filterDt) return false;
    if (filterStatus !== "all") {
      const hasStatus = p.sessions.some((s) => s.status === filterStatus);
      if (!hasStatus) return false;
    }
    return true;
  });

  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">All Patients</h1>
        <div className="flex gap-3">
          <Select value={filterDt} onValueChange={setFilterDt}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter by DT" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All DTs</SelectItem>
              {dts.map((dt) => (
                <SelectItem key={dt.id} value={dt.name}>
                  {dt.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="scheduled">Scheduled</SelectItem>
              <SelectItem value="reminder_sent">Reminder Sent</SelectItem>
              <SelectItem value="done">Done</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          No patients found.
        </div>
      ) : (
        <div className="rounded-lg border bg-white overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left p-3 font-medium">Patient</th>
                <th className="text-left p-3 font-medium">Code</th>
                <th className="text-left p-3 font-medium">Phone</th>
                <th className="text-left p-3 font-medium">Assigned DT</th>
                <th className="text-left p-3 font-medium">Status</th>
                <th className="text-left p-3 font-medium">Added</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => {
                const activeSession = p.sessions
                  .filter((s) => s.status !== "done" && s.status !== "cancelled")
                  .sort(
                    (a, b) =>
                      new Date(a.scheduled_at).getTime() -
                      new Date(b.scheduled_at).getTime()
                  )[0];

                const latestStatus = activeSession?.status ??
                  (p.sessions.some((s) => s.status === "done") ? "done" : "—");

                const statusColors: Record<string, string> = {
                  scheduled: "bg-yellow-100 text-yellow-800",
                  reminder_sent: "bg-blue-100 text-blue-800",
                  done: "bg-green-100 text-green-800",
                  cancelled: "bg-gray-100 text-gray-800",
                };

                return (
                  <tr
                    key={p.id}
                    className="border-t hover:bg-muted/30 cursor-pointer"
                    onClick={() =>
                      (window.location.href = `/patients/${p.id}`)
                    }
                  >
                    <td className="p-3 font-medium">{p.name}</td>
                    <td className="p-3 text-muted-foreground">
                      {p.code ?? "—"}
                    </td>
                    <td className="p-3">{p.phone}</td>
                    <td className="p-3">{p.dt?.name ?? "—"}</td>
                    <td className="p-3">
                      {latestStatus !== "—" ? (
                        <Badge
                          variant="outline"
                          className={statusColors[latestStatus] ?? ""}
                        >
                          {latestStatus.replace("_", " ")}
                        </Badge>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="p-3 text-muted-foreground">
                      {new Date(p.created_at).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                      })}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
