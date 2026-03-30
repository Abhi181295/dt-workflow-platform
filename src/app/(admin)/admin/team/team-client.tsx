"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";

interface DT {
  id: string;
  name: string;
  email: string;
  slack_user_id: string | null;
  created_at: string;
}

export function TeamClient({ dts: initialDts }: { dts: DT[] }) {
  const [dts, setDts] = useState(initialDts);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [slackUserId, setSlackUserId] = useState("");
  const [loading, setLoading] = useState(false);

  const router = useRouter();
  const supabase = createClient();

  function openNew() {
    setEditingId(null);
    setName("");
    setEmail("");
    setPassword("");
    setSlackUserId("");
    setShowForm(true);
  }

  function openEdit(dt: DT) {
    setEditingId(dt.id);
    setName(dt.name);
    setEmail(dt.email);
    setPassword("");
    setSlackUserId(dt.slack_user_id ?? "");
    setShowForm(true);
  }

  async function handleSave() {
    setLoading(true);

    if (editingId) {
      // Update profile
      const { error } = await supabase
        .from("profiles")
        .update({
          name,
          slack_user_id: slackUserId || null,
        })
        .eq("id", editingId);

      if (error) {
        toast.error("Failed to update: " + error.message);
      } else {
        toast.success("DT updated");
        setDts((prev) =>
          prev.map((dt) =>
            dt.id === editingId
              ? { ...dt, name, slack_user_id: slackUserId || null }
              : dt
          )
        );
      }
    } else {
      // Create new DT via API route (needs service role to create auth user)
      if (!name || !email || !password) {
        toast.error("Name, email and password are required");
        setLoading(false);
        return;
      }

      const res = await fetch("/api/admin/create-dt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password, slackUserId }),
      });

      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Failed to create DT");
      } else {
        toast.success("DT created");
        setDts((prev) => [
          {
            id: data.id,
            name,
            email,
            slack_user_id: slackUserId || null,
            created_at: new Date().toISOString(),
          },
          ...prev,
        ]);
      }
    }

    setShowForm(false);
    setLoading(false);
    router.refresh();
  }

  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Team Management</h1>
        <Button onClick={openNew}>+ Add DT</Button>
      </div>

      {dts.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          No dietitians added yet.
        </div>
      ) : (
        <div className="rounded-lg border bg-white overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left p-3 font-medium">Name</th>
                <th className="text-left p-3 font-medium">Email</th>
                <th className="text-left p-3 font-medium">Slack ID</th>
                <th className="text-left p-3 font-medium">Joined</th>
                <th className="text-left p-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {dts.map((dt) => (
                <tr key={dt.id} className="border-t">
                  <td className="p-3 font-medium">{dt.name}</td>
                  <td className="p-3 text-muted-foreground">{dt.email}</td>
                  <td className="p-3 text-muted-foreground font-mono text-xs">
                    {dt.slack_user_id ?? "—"}
                  </td>
                  <td className="p-3 text-muted-foreground">
                    {new Date(dt.created_at).toLocaleDateString("en-IN", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </td>
                  <td className="p-3">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openEdit(dt)}
                    >
                      Edit
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingId ? "Edit DT" : "Add New DT"}
            </DialogTitle>
            {!editingId && (
              <DialogDescription>
                This will create a new user account for the dietitian.
              </DialogDescription>
            )}
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Dr. Ankit Sharma"
              />
            </div>
            {!editingId && (
              <>
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="ankit@fitelo.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Password</Label>
                  <Input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Initial password"
                  />
                </div>
              </>
            )}
            <div className="space-y-2">
              <Label>Slack User ID</Label>
              <Input
                value={slackUserId}
                onChange={(e) => setSlackUserId(e.target.value)}
                placeholder="e.g. U0123ABC"
              />
              <p className="text-xs text-muted-foreground">
                To find this: open Slack → click on the user&apos;s profile →
                click &quot;...&quot; → &quot;Copy member ID&quot;
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowForm(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={loading}>
              {loading ? "Saving..." : editingId ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
