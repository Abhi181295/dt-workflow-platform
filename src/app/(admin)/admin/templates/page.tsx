import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { NavHeader } from "@/components/NavHeader";
import { TemplatesClient } from "./templates-client";

export default async function TemplatesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("name, role")
    .eq("id", user.id)
    .single();

  if (!profile || profileError) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center space-y-2 p-6">
          <h1 className="text-xl font-bold">Profile not found</h1>
          <p className="text-muted-foreground text-sm">
            Account: {user.email} | Error: {profileError?.message ?? "No profile row"}
          </p>
        </div>
      </div>
    );
  }

  if (profile.role !== "admin") redirect("/dashboard");

  const { data: templates } = await supabase
    .from("templates")
    .select("id, name, body, type, created_at")
    .order("created_at", { ascending: false });

  return (
    <div className="min-h-screen bg-muted/40">
      <NavHeader name={profile.name} role="admin" />
      <div className="p-6 max-w-5xl mx-auto">
        <TemplatesClient templates={templates ?? []} userId={user.id} />
      </div>
    </div>
  );
}
