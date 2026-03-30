interface SlackDMPayload {
  dtName: string;
  dtSlackUserId: string;
  patientName: string;
  patientPhone: string;
  patientCode: string;
  filledMessage: string;
  appUrl: string;
}

export async function sendSlackDM({
  dtName,
  dtSlackUserId,
  patientName,
  patientPhone,
  patientCode,
  filledMessage,
  appUrl,
}: SlackDMPayload): Promise<{ ok: boolean; error?: string }> {
  const token = process.env.SLACK_BOT_TOKEN;
  if (!token) {
    return { ok: false, error: "SLACK_BOT_TOKEN not configured" };
  }

  const text = [
    `👋 Hi ${dtName.split(" ")[0]}!`,
    "",
    "Here's your reminder for today:",
    "",
    `👤 Patient: ${patientName}`,
    `📱 WhatsApp: ${patientPhone}`,
    `🔖 Code: ${patientCode || "—"}`,
    "",
    "📋 Copy & send this message on WhatsApp:",
    "━━━━━━━━━━━━━━━━━━",
    filledMessage,
    "━━━━━━━━━━━━━━━━━━",
    "",
    `➡️ Open panel to mark done: ${appUrl}/dashboard`,
  ].join("\n");

  const res = await fetch("https://slack.com/api/chat.postMessage", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      channel: dtSlackUserId,
      text,
    }),
  });

  const data = await res.json();
  if (!data.ok) {
    return { ok: false, error: data.error ?? "Unknown Slack error" };
  }
  return { ok: true };
}
