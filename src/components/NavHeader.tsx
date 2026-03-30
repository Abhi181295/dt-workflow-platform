"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";

export function NavHeader({
  name,
  role,
}: {
  name: string;
  role: "admin" | "dt";
}) {
  const router = useRouter();
  const supabase = createClient();

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <header className="border-b bg-white">
      <div className="flex h-14 items-center justify-between px-4 sm:px-6">
        <div className="flex items-center gap-2 sm:gap-4 min-w-0">
          <span className="text-base sm:text-lg font-semibold shrink-0">DT Workflow</span>
          {role === "admin" && (
            <nav className="hidden md:flex items-center gap-2 ml-4 text-sm">
              <a href="/admin" className="text-muted-foreground hover:text-foreground">Overview</a>
              <a href="/admin/templates" className="text-muted-foreground hover:text-foreground">Templates</a>
              <a href="/admin/team" className="text-muted-foreground hover:text-foreground">Team</a>
              <a href="/admin/patients" className="text-muted-foreground hover:text-foreground">Patients</a>
              <a href="/admin/logs" className="text-muted-foreground hover:text-foreground">Logs</a>
            </nav>
          )}
        </div>
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <span className="text-sm text-muted-foreground hidden sm:inline">{name}</span>
          <Button variant="outline" size="sm" onClick={handleLogout}>
            Sign out
          </Button>
        </div>
      </div>
      {/* Mobile admin nav */}
      {role === "admin" && (
        <nav className="flex md:hidden items-center gap-3 px-4 pb-2 text-sm overflow-x-auto">
          <a href="/admin" className="text-muted-foreground hover:text-foreground whitespace-nowrap">Overview</a>
          <a href="/admin/templates" className="text-muted-foreground hover:text-foreground whitespace-nowrap">Templates</a>
          <a href="/admin/team" className="text-muted-foreground hover:text-foreground whitespace-nowrap">Team</a>
          <a href="/admin/patients" className="text-muted-foreground hover:text-foreground whitespace-nowrap">Patients</a>
          <a href="/admin/logs" className="text-muted-foreground hover:text-foreground whitespace-nowrap">Logs</a>
        </nav>
      )}
    </header>
  );
}
