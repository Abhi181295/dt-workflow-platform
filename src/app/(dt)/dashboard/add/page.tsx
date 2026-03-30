import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { NavHeader } from "@/components/NavHeader";
import { AddPatientForm } from "@/components/AddPatientForm";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default async function AddPatientPage() {
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

  if (!profile || profile.role !== "dt") redirect("/login");

  const { data: templates } = await supabase
    .from("templates")
    .select("id, name, type");

  return (
    <div className="min-h-screen bg-muted/40">
      <NavHeader name={profile.name} role="dt" />
      <div className="p-6 max-w-4xl mx-auto">
        <div className="mb-6">
          <Link href="/dashboard">
            <Button variant="ghost" size="sm">
              &larr; Back to Dashboard
            </Button>
          </Link>
        </div>
        <AddPatientForm templates={templates ?? []} />
      </div>
    </div>
  );
}
