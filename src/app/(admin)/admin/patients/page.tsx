import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { NavHeader } from "@/components/NavHeader";
import { PatientsClient } from "./patients-client";

export default async function AdminPatientsPage() {
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

  const { data: patients } = await supabase
    .from("patients")
    .select(
      `id, name, phone, code, created_at,
       dt:profiles!patients_assigned_dt_id_fkey(name),
       sessions(id, type, status, scheduled_at)`
    )
    .order("created_at", { ascending: false });

  const { data: dts } = await supabase
    .from("profiles")
    .select("id, name")
    .eq("role", "dt");

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const normalizedPatients = (patients ?? []).map((p: any) => ({
    ...p,
    dt: Array.isArray(p.dt) ? p.dt[0] : p.dt,
  }));

  return (
    <div className="min-h-screen bg-muted/40">
      <NavHeader name={profile.name} role="admin" />
      <div className="p-6 max-w-5xl mx-auto">
        <PatientsClient patients={normalizedPatients} dts={dts ?? []} />
      </div>
    </div>
  );
}
