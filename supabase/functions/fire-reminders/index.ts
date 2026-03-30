import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const SLACK_BOT_TOKEN = Deno.env.get("SLACK_BOT_TOKEN")!;
const APP_URL = Deno.env.get("APP_URL") || "https://your-app.vercel.app";

Deno.serve(async () => {
  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // 1. Get pending reminders whose fire_at has passed
    const { data: reminders, error: fetchError } = await supabase
      .from("reminders")
      .select(
        `id, fire_at, offset_label,
         session:sessions!inner(
           id, type, status, scheduled_at,
           template:templates(body),
           patient:patients!inner(name, phone, code),
           dt:profiles!sessions_dt_id_fkey(name, slack_user_id)
         )`
      )
      .eq("status", "pending")
      .lte("fire_at", new Date().toISOString());

    if (fetchError) {
      return new Response(
        JSON.stringify({ error: fetchError.message }),
        { status: 500 }
      );
    }

    if (!reminders || reminders.length === 0) {
      return new Response(JSON.stringify({ fired: 0 }), { status: 200 });
    }

    let fired = 0;
    let failed = 0;

    for (const reminder of reminders) {
      const session = reminder.session as any;
      if (!session) continue;

      const dt = Array.isArray(session.dt) ? session.dt[0] : session.dt;
      const patient = Array.isArray(session.patient)
        ? session.patient[0]
        : session.patient;
      const template = Array.isArray(session.template)
        ? session.template[0]
        : session.template;

      if (!dt?.slack_user_id || !patient) {
        // Mark as failed if no Slack ID
        await supabase
          .from("reminders")
          .update({ status: "failed" })
          .eq("id", reminder.id);
        failed++;
        continue;
      }

      // Fill template placeholders
      let messageBody = template?.body ?? "Please check in with your patient.";
      messageBody = messageBody.replace(/\{patient_name\}/g, patient.name);
      messageBody = messageBody.replace(
        /\{patient_first_name\}/g,
        patient.name.split(" ")[0]
      );
      messageBody = messageBody.replace(/\{dt_name\}/g, dt.name);
      messageBody = messageBody.replace(/\{phone\}/g, patient.phone);
      messageBody = messageBody.replace(/\{code\}/g, patient.code ?? "");
      messageBody = messageBody.replace(
        /\{counselling_date\}/g,
        new Date(session.scheduled_at).toLocaleDateString("en-IN", {
          weekday: "short",
          day: "numeric",
          month: "short",
          year: "numeric",
        })
      );

      // Build Slack DM text
      const text = [
        `👋 Hi ${dt.name.split(" ")[0]}!`,
        "",
        "Here's your reminder for today:",
        "",
        `👤 Patient: ${patient.name}`,
        `📱 WhatsApp: ${patient.phone}`,
        `🔖 Code: ${patient.code || "—"}`,
        "",
        "📋 Copy & send this message on WhatsApp:",
        "━━━━━━━━━━━━━━━━━━",
        messageBody,
        "━━━━━━━━━━━━━━━━━━",
        "",
        `➡️ Open panel to mark done: ${APP_URL}/dashboard`,
      ].join("\n");

      // Send Slack DM
      const slackRes = await fetch("https://slack.com/api/chat.postMessage", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${SLACK_BOT_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          channel: dt.slack_user_id,
          text,
        }),
      });

      const slackData = await slackRes.json();

      if (slackData.ok) {
        // Update reminder status
        await supabase
          .from("reminders")
          .update({
            status: "sent",
            slack_message_sent_at: new Date().toISOString(),
          })
          .eq("id", reminder.id);

        // Update session status to reminder_sent (if still scheduled)
        await supabase
          .from("sessions")
          .update({ status: "reminder_sent" })
          .eq("id", session.id)
          .eq("status", "scheduled");

        fired++;
      } else {
        await supabase
          .from("reminders")
          .update({ status: "failed" })
          .eq("id", reminder.id);
        failed++;
        console.error(`Slack error for reminder ${reminder.id}:`, slackData.error);
      }
    }

    return new Response(
      JSON.stringify({ fired, failed, total: reminders.length }),
      { status: 200 }
    );
  } catch (err) {
    console.error("fire-reminders error:", err);
    return new Response(
      JSON.stringify({ error: (err as Error).message }),
      { status: 500 }
    );
  }
});
