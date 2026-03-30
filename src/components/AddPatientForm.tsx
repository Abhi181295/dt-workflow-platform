"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
  type: string;
}

export function AddPatientForm({ templates }: { templates: Template[] }) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [sessionType, setSessionType] = useState<"counselling" | "followup">(
    "counselling"
  );
  const [date, setDate] = useState("");
  const [time, setTime] = useState("09:00");
  const [templateId, setTemplateId] = useState("");
  const [reminders, setReminders] = useState<string[]>(["on_the_day"]);
  // Follow-up specific
  const [followUpDays, setFollowUpDays] = useState("5");
  const [loading, setLoading] = useState(false);

  const router = useRouter();
  const supabase = createClient();

  const filteredTemplates = templates.filter(
    (t) => t.type === sessionType || t.type === "general"
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    if (!name || !phone) {
      toast.error("Name and phone are required");
      setLoading(false);
      return;
    }

    if (!templateId) {
      toast.error("Please select a template");
      setLoading(false);
      return;
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      toast.error("Not authenticated");
      setLoading(false);
      return;
    }

    // 1. Create patient
    const { data: patient, error: patientError } = await supabase
      .from("patients")
      .insert({
        name,
        phone,
        code: code || null,
        assigned_dt_id: user.id,
        created_by: user.id,
      })
      .select()
      .single();

    if (patientError) {
      toast.error("Failed to create patient: " + patientError.message);
      setLoading(false);
      return;
    }

    // 2. Calculate scheduled_at
    let scheduledAt: Date;
    if (sessionType === "counselling") {
      if (!date) {
        toast.error("Please select a date");
        setLoading(false);
        return;
      }
      scheduledAt = new Date(`${date}T${time}:00`);
    } else {
      const days = parseInt(followUpDays);
      if (isNaN(days) || days < 1) {
        toast.error("Enter valid days");
        setLoading(false);
        return;
      }
      scheduledAt = new Date();
      scheduledAt.setDate(scheduledAt.getDate() + days);
      scheduledAt.setHours(9, 0, 0, 0);
    }

    // 3. Create session
    const { data: session, error: sessionError } = await supabase
      .from("sessions")
      .insert({
        patient_id: patient.id,
        dt_id: user.id,
        type: sessionType,
        status: "scheduled",
        scheduled_at: scheduledAt.toISOString(),
        template_id: templateId,
      })
      .select()
      .single();

    if (sessionError) {
      toast.error("Failed to create session: " + sessionError.message);
      setLoading(false);
      return;
    }

    // 4. Create reminders
    const reminderRecords = reminders.map((offset) => {
      const fireAt = new Date(scheduledAt);
      let offsetLabel = "";
      if (offset === "on_the_day") {
        offsetLabel = "on the day";
      } else if (offset === "1_day_before") {
        fireAt.setDate(fireAt.getDate() - 1);
        offsetLabel = "1 day before";
      } else if (offset === "2_hrs_before") {
        fireAt.setHours(fireAt.getHours() - 2);
        offsetLabel = "2 hrs before";
      }
      return {
        session_id: session.id,
        dt_id: user.id,
        fire_at: fireAt.toISOString(),
        offset_label: offsetLabel,
        status: "pending" as const,
      };
    });

    const { error: reminderError } = await supabase
      .from("reminders")
      .insert(reminderRecords);

    if (reminderError) {
      toast.error("Patient & session created but reminders failed");
    } else {
      toast.success("Patient added successfully!");
    }

    setLoading(false);
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <Card className="max-w-lg mx-auto">
      <CardHeader>
        <CardTitle>Add Patient</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Patient Name</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Priya Sharma"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>WhatsApp Number</Label>
              <Input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="e.g. +91 98765 43210"
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Patient Code</Label>
              <Input
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="e.g. FIT-1234"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Session Type</Label>
            <Select
              value={sessionType}
              onValueChange={(v) =>
                setSessionType(v as "counselling" | "followup")
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="counselling">Counselling</SelectItem>
                <SelectItem value="followup">Follow-up</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {sessionType === "counselling" ? (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Date</Label>
                <Input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Time</Label>
                <Input
                  type="time"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  required
                />
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <Label>Follow-up after (days)</Label>
              <Input
                type="number"
                min={1}
                value={followUpDays}
                onChange={(e) => setFollowUpDays(e.target.value)}
              />
            </div>
          )}

          <div className="space-y-2">
            <Label>Message Template</Label>
            <Select value={templateId} onValueChange={setTemplateId}>
              <SelectTrigger>
                <SelectValue placeholder="Select a template" />
              </SelectTrigger>
              <SelectContent>
                {filteredTemplates.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {filteredTemplates.length === 0 && (
              <p className="text-xs text-muted-foreground">
                No templates found. Ask your admin to create one.
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label>Reminder Timing</Label>
            <div className="flex flex-wrap gap-2">
              {[
                { value: "on_the_day", label: "On the day" },
                { value: "1_day_before", label: "1 day before" },
                { value: "2_hrs_before", label: "2 hrs before" },
              ].map((opt) => (
                <Button
                  key={opt.value}
                  type="button"
                  size="sm"
                  variant={
                    reminders.includes(opt.value) ? "default" : "outline"
                  }
                  onClick={() =>
                    setReminders((prev) =>
                      prev.includes(opt.value)
                        ? prev.filter((v) => v !== opt.value)
                        : [...prev, opt.value]
                    )
                  }
                >
                  {opt.label}
                </Button>
              ))}
            </div>
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Creating..." : "Add Patient"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
