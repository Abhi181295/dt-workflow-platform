interface TimelineEvent {
  id: string;
  type: string;
  status: string;
  scheduled_at: string;
  created_at: string;
  template: { name: string } | null;
  reminders: {
    id: string;
    fire_at: string;
    status: string;
    offset_label: string | null;
    slack_message_sent_at: string | null;
  }[];
}

export function SessionTimeline({ sessions }: { sessions: TimelineEvent[] }) {
  // Sort newest first
  const sorted = [...sessions].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  return (
    <div className="relative space-y-0">
      {/* Vertical line */}
      <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-border" />

      {sorted.map((session) => {
        const events = buildEvents(session);
        return (
          <div key={session.id} className="relative pl-10 pb-6">
            {events.map((event, i) => (
              <div key={i} className="relative mb-3">
                {/* Dot */}
                <div
                  className={`absolute -left-[1.625rem] top-1 h-3 w-3 rounded-full border-2 border-white ${event.dotColor}`}
                />
                <div className="text-sm">
                  <span className="font-medium">{event.label}</span>
                  <span className="text-muted-foreground ml-2 text-xs">
                    {event.time}
                  </span>
                </div>
              </div>
            ))}
          </div>
        );
      })}

      {sorted.length === 0 && (
        <p className="text-sm text-muted-foreground pl-10">
          No sessions yet.
        </p>
      )}
    </div>
  );
}

function buildEvents(session: TimelineEvent) {
  const events: { label: string; time: string; dotColor: string }[] = [];
  const fmt = (d: string) =>
    new Date(d).toLocaleString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

  const typeLabel =
    session.type === "counselling" ? "Counselling" : "Follow-up";

  events.push({
    label: `${typeLabel} scheduled${session.template ? ` (${session.template.name})` : ""}`,
    time: fmt(session.scheduled_at),
    dotColor: "bg-blue-500",
  });

  for (const r of session.reminders) {
    if (r.status === "sent" && r.slack_message_sent_at) {
      events.push({
        label: `Reminder sent${r.offset_label ? ` (${r.offset_label})` : ""}`,
        time: fmt(r.slack_message_sent_at),
        dotColor: "bg-yellow-500",
      });
    }
  }

  if (session.status === "done") {
    events.push({
      label: `${typeLabel} marked done`,
      time: fmt(session.created_at),
      dotColor: "bg-green-500",
    });
  } else if (session.status === "cancelled") {
    events.push({
      label: `${typeLabel} cancelled`,
      time: fmt(session.created_at),
      dotColor: "bg-gray-400",
    });
  }

  return events;
}
