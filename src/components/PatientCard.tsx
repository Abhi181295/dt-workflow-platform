"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { fillTemplate } from "@/lib/templates";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

interface PatientCardProps {
  session: {
    id: string;
    type: string;
    status: string;
    scheduled_at: string;
    template: { body: string; name: string } | null;
    patient: {
      id: string;
      name: string;
      phone: string;
      code: string | null;
    };
  };
  dtName: string;
  templates: { id: string; name: string; body: string; type: string }[];
}

const statusColors: Record<string, string> = {
  scheduled: "bg-yellow-100 text-yellow-800 border-yellow-200",
  reminder_sent: "bg-blue-100 text-blue-800 border-blue-200",
  done: "bg-green-100 text-green-800 border-green-200",
  cancelled: "bg-gray-100 text-gray-800 border-gray-200",
};

export function PatientCard({ session, dtName, templates }: PatientCardProps) {
  const [copied, setCopied] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [showFollowUp, setShowFollowUp] = useState(false);
  const [followUpDays, setFollowUpDays] = useState("5");
  const [followUpTemplateId, setFollowUpTemplateId] = useState("");
  const [followUpReminders, setFollowUpReminders] = useState<string[]>(["on_the_day"]);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const filledMessage = session.template
    ? fillTemplate(session.template.body, {
        patient_name: session.patient.name,
        dt_name: dtName,
        phone: session.patient.phone,
        code: session.patient.code ?? "",
        counselling_date: new Date(session.scheduled_at).toLocaleDateString("en-IN", {
          weekday: "short",
          day: "numeric",
          month: "short",
          year: "numeric",
        }),
      })
    : "";

  async function handleCopy() {
    await navigator.clipboard.writeText(filledMessage);
    setCopied(true);
    toast.success("Message copied to clipboard!");
    setTimeout(() => setCopied(false), 2000);
  }

  async function handleMarkDone() {
    setLoading(true);
    const { error } = await supabase
      .from("sessions")
      .update({ status: "done" })
      .eq("id", session.id);

    if (error) {
      toast.error("Failed to mark as done");
      setLoading(false);
      return;
    }

    setShowConfirm(false);
    toast.success("Session marked as done!");
    setShowFollowUp(true);
    setLoading(false);
  }

  async function handleSetFollowUp() {
    setLoading(true);
    const days = parseInt(followUpDays);
    if (isNaN(days) || days < 1) {
      toast.error("Enter a valid number of days");
      setLoading(false);
      return;
    }

    if (!followUpTemplateId) {
      toast.error("Please select a template");
      setLoading(false);
      return;
    }

    const scheduledAt = new Date();
    scheduledAt.setDate(scheduledAt.getDate() + days);
    scheduledAt.setHours(9, 0, 0, 0);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    // Create follow-up session
    const { data: newSession, error: sessionError } = await supabase
      .from("sessions")
      .insert({
        patient_id: session.patient.id,
        dt_id: user!.id,
        type: "followup",
        status: "scheduled",
        scheduled_at: scheduledAt.toISOString(),
        template_id: followUpTemplateId,
      })
      .select()
      .single();

    if (sessionError) {
      toast.error("Failed to create follow-up");
      setLoading(false);
      return;
    }

    // Create reminders based on selected offsets
    const reminders = followUpReminders.map((offset) => {
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
        session_id: newSession.id,
        dt_id: user!.id,
        fire_at: fireAt.toISOString(),
        offset_label: offsetLabel,
        status: "pending",
      };
    });

    const { error: reminderError } = await supabase
      .from("reminders")
      .insert(reminders);

    if (reminderError) {
      toast.error("Follow-up created but reminders failed");
    } else {
      toast.success(`Follow-up set for ${days} days from now`);
    }

    setShowFollowUp(false);
    setLoading(false);
    router.refresh();
  }

  const isOverdue =
    session.status !== "done" &&
    new Date(session.scheduled_at) < new Date();

  return (
    <>
      <Card className={isOverdue ? "border-red-300 bg-red-50/50" : ""}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">
              <a
                href={`/patients/${session.patient.id}`}
                className="hover:underline"
              >
                {session.patient.name}
              </a>
            </CardTitle>
            <div className="flex items-center gap-2">
              <Badge
                variant="outline"
                className={
                  session.type === "counselling"
                    ? "bg-purple-100 text-purple-800 border-purple-200"
                    : "bg-teal-100 text-teal-800 border-teal-200"
                }
              >
                {session.type === "counselling" ? "Counselling" : "Follow-up"}
              </Badge>
              <Badge
                variant="outline"
                className={statusColors[session.status] ?? ""}
              >
                {session.status.replace("_", " ")}
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-1 sm:gap-2 text-sm">
            <div>
              <span className="text-muted-foreground">Phone: </span>
              {session.patient.phone}
            </div>
            <div>
              <span className="text-muted-foreground">Code: </span>
              {session.patient.code ?? "—"}
            </div>
            <div>
              <span className="text-muted-foreground">Scheduled: </span>
              {new Date(session.scheduled_at).toLocaleString("en-IN", {
                day: "numeric",
                month: "short",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </div>
          </div>

          {isOverdue && (
            <p className="text-xs font-medium text-red-600">Overdue</p>
          )}

          <div className="flex gap-2 pt-1">
            {session.template && (
              <Button
                size="sm"
                variant="outline"
                onClick={handleCopy}
                disabled={copied}
              >
                {copied ? "Copied!" : "Copy Message"}
              </Button>
            )}
            {session.status !== "done" && (
              <Button
                size="sm"
                onClick={() => setShowConfirm(true)}
              >
                Mark Done
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Mark Done Confirmation */}
      <Dialog open={showConfirm} onOpenChange={setShowConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Mark as done?</DialogTitle>
            <DialogDescription>
              Confirm that you&apos;ve sent the message to{" "}
              <strong>{session.patient.name}</strong> on WhatsApp.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowConfirm(false)}
            >
              Cancel
            </Button>
            <Button onClick={handleMarkDone} disabled={loading}>
              {loading ? "Updating..." : "Yes, mark done"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Follow-up Setup */}
      <Dialog open={showFollowUp} onOpenChange={setShowFollowUp}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Set follow-up for {session.patient.name}</DialogTitle>
            <DialogDescription>
              Schedule a follow-up session after this{" "}
              {session.type === "counselling" ? "counselling" : "follow-up"}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Follow-up after (days)</Label>
              <Input
                type="number"
                min={1}
                value={followUpDays}
                onChange={(e) => setFollowUpDays(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Template</Label>
              <Select
                value={followUpTemplateId}
                onValueChange={setFollowUpTemplateId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a template" />
                </SelectTrigger>
                <SelectContent>
                  {templates.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Reminder timing</Label>
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
                      followUpReminders.includes(opt.value)
                        ? "default"
                        : "outline"
                    }
                    onClick={() =>
                      setFollowUpReminders((prev) =>
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
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowFollowUp(false);
                router.refresh();
              }}
            >
              Skip
            </Button>
            <Button onClick={handleSetFollowUp} disabled={loading}>
              {loading ? "Creating..." : "Set follow-up"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
