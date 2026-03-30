"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { fillTemplate } from "@/lib/templates";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

interface Template {
  id: string;
  name: string;
  body: string;
  type: string;
  created_at: string;
}

export function TemplatesClient({
  templates: initialTemplates,
  userId,
}: {
  templates: Template[];
  userId: string;
}) {
  const [templates, setTemplates] = useState(initialTemplates);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [body, setBody] = useState("");
  const [type, setType] = useState("counselling");
  const [loading, setLoading] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const router = useRouter();
  const supabase = createClient();

  function openNew() {
    setEditingId(null);
    setName("");
    setBody("");
    setType("counselling");
    setShowForm(true);
  }

  function openEdit(t: Template) {
    setEditingId(t.id);
    setName(t.name);
    setBody(t.body);
    setType(t.type);
    setShowForm(true);
  }

  async function handleSave() {
    setLoading(true);
    if (!name || !body) {
      toast.error("Name and body are required");
      setLoading(false);
      return;
    }

    if (editingId) {
      const { error } = await supabase
        .from("templates")
        .update({ name, body, type })
        .eq("id", editingId);

      if (error) {
        toast.error("Failed to update: " + error.message);
      } else {
        toast.success("Template updated");
        setTemplates((prev) =>
          prev.map((t) =>
            t.id === editingId ? { ...t, name, body, type } : t
          )
        );
      }
    } else {
      const { data, error } = await supabase
        .from("templates")
        .insert({ name, body, type, created_by: userId })
        .select()
        .single();

      if (error) {
        toast.error("Failed to create: " + error.message);
      } else {
        toast.success("Template created");
        setTemplates((prev) => [data, ...prev]);
      }
    }

    setShowForm(false);
    setLoading(false);
    router.refresh();
  }

  async function handleDelete(id: string) {
    const { error } = await supabase.from("templates").delete().eq("id", id);
    if (error) {
      toast.error("Failed to delete: " + error.message);
    } else {
      toast.success("Template deleted");
      setTemplates((prev) => prev.filter((t) => t.id !== id));
    }
    setDeleteConfirm(null);
  }

  const previewText = fillTemplate(body, {
    patient_name: "Priya Sharma",
    patient_first_name: "Priya",
    dt_name: "Dr. Ankit",
    phone: "+91 98765 43210",
    code: "FIT-1234",
    counselling_date: "Mon, 31 Mar 2026",
  });

  const typeColors: Record<string, string> = {
    counselling: "bg-purple-100 text-purple-800",
    followup: "bg-teal-100 text-teal-800",
    general: "bg-gray-100 text-gray-800",
  };

  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Message Templates</h1>
        <Button onClick={openNew}>+ New Template</Button>
      </div>

      {templates.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          No templates yet. Create one to get started.
        </div>
      ) : (
        <div className="space-y-3">
          {templates.map((t) => (
            <Card key={t.id}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-base">{t.name}</CardTitle>
                    <Badge variant="outline" className={typeColors[t.type] ?? ""}>
                      {t.type}
                    </Badge>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openEdit(t)}
                    >
                      Edit
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-destructive"
                      onClick={() => setDeleteConfirm(t.id)}
                    >
                      Delete
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <pre className="text-sm text-muted-foreground whitespace-pre-wrap font-sans">
                  {t.body}
                </pre>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingId ? "Edit Template" : "New Template"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Name</Label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Counselling Intro"
                />
              </div>
              <div className="space-y-2">
                <Label>Type</Label>
                <Select value={type} onValueChange={setType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="counselling">Counselling</SelectItem>
                    <SelectItem value="followup">Follow-up</SelectItem>
                    <SelectItem value="general">General</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>
                Body{" "}
                <span className="text-muted-foreground font-normal">
                  (placeholders: {"{patient_name}"}, {"{patient_first_name}"},
                  {" {dt_name}"}, {"{phone}"}, {"{code}"},
                  {" {counselling_date}"})
                </span>
              </Label>
              <Textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Hi {patient_first_name}! I'm {dt_name}, your dietitian..."
                rows={6}
              />
            </div>
            {body && (
              <div className="space-y-2">
                <Label>Preview</Label>
                <div className="rounded-md border bg-muted/30 p-3">
                  <pre className="text-sm whitespace-pre-wrap font-sans">
                    {previewText}
                  </pre>
                </div>
              </div>
            )}
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

      {/* Delete Confirmation */}
      <Dialog
        open={deleteConfirm !== null}
        onOpenChange={() => setDeleteConfirm(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete template?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            This action cannot be undone. Sessions using this template will keep
            their existing messages.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirm(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteConfirm && handleDelete(deleteConfirm)}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
