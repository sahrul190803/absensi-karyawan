import "server-only";
import { env } from "@/lib/env";

export type MailMessage = {
  to: string;
  subject: string;
  text: string;
  html?: string;
};

export async function sendMail(message: MailMessage) {
  if (!env.RESEND_API_KEY) {
    console.warn(
      `Email to ${message.to} skipped: RESEND_API_KEY belum diatur di env.`,
    );
    return { sent: false, reason: "missing_key" };
  }
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: env.EMAIL_FROM ?? "Hadirku Lecarassa <onboarding@resend.dev>",
      to: [message.to],
      subject: message.subject,
      text: message.text,
      ...(message.html ? { html: message.html } : {}),
    }),
  });
  if (!response.ok) {
    const detail = (await response.text()).slice(0, 500);
    console.error(`Resend failed ${response.status}: ${detail}`);
    return { sent: false, reason: `resend_${response.status}` };
  }
  return { sent: true };
}

// Untuk callback auth: pengiriman email tidak boleh memblokir atau
// menggagalkan request utama, dan error dikonsumsi agar tidak crash.
export function sendMailInBackground(message: MailMessage) {
  void sendMail(message).catch((error) => {
    console.error(
      "Email delivery failed:",
      error instanceof Error ? error.message : error,
    );
  });
}
