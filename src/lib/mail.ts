import "server-only";
import nodemailer from "nodemailer";
import { getSettings } from "@/lib/settings";

// ---------------------------------------------------------------------------
// SMTP (existing path)
// ---------------------------------------------------------------------------

let smtpTransporter: nodemailer.Transporter | null = null;

function getSmtpTransporter() {
  if (!smtpTransporter) {
    smtpTransporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT ?? 25),
      secure: process.env.SMTP_SECURE === "true",
      auth:
        process.env.SMTP_USER && process.env.SMTP_PASS
          ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
          : undefined,
    });
  }
  return smtpTransporter;
}

async function sendViaSmtp(to: string, subject: string, text: string, html?: string) {
  await getSmtpTransporter().sendMail({
    from: process.env.SMTP_FROM,
    to,
    subject,
    text,
    ...(html ? { html } : {}),
  });
}

// ---------------------------------------------------------------------------
// Microsoft Graph API (Office 365)
// ---------------------------------------------------------------------------

let graphTokenCache: { token: string; expiresAt: number } | null = null;

async function getGraphToken(tenantId: string, clientId: string, clientSecret: string): Promise<string> {
  if (graphTokenCache && Date.now() < graphTokenCache.expiresAt) {
    return graphTokenCache.token;
  }

  const res = await fetch(
    `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`,
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "client_credentials",
        client_id: clientId,
        client_secret: clientSecret,
        scope: "https://graph.microsoft.com/.default",
      }),
    }
  );

  const data = await res.json();
  if (!data.access_token) {
    throw new Error(`Microsoft Graph auth fallita: ${data.error_description ?? data.error ?? "risposta non valida"}`);
  }

  // Cache for (expires_in - 60) seconds to avoid using a token about to expire
  graphTokenCache = {
    token: data.access_token,
    expiresAt: Date.now() + (Number(data.expires_in ?? 3600) - 60) * 1000,
  };
  return graphTokenCache.token;
}

async function sendViaGraph(to: string, subject: string, text: string, html?: string) {
  const tenantId = process.env.GRAPH_TENANT_ID;
  const clientId = process.env.GRAPH_CLIENT_ID;
  const clientSecret = process.env.GRAPH_CLIENT_SECRET;
  const senderEmail = process.env.GRAPH_SENDER_EMAIL;

  if (!tenantId || !clientId || !clientSecret || !senderEmail) {
    throw new Error(
      "Credenziali Microsoft Graph non configurate. Imposta GRAPH_TENANT_ID, GRAPH_CLIENT_ID, GRAPH_CLIENT_SECRET e GRAPH_SENDER_EMAIL nel file .env."
    );
  }

  const token = await getGraphToken(tenantId, clientId, clientSecret);

  const res = await fetch(
    `https://graph.microsoft.com/v1.0/users/${senderEmail}/sendMail`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message: {
          subject,
          body: { contentType: html ? "HTML" : "Text", content: html ?? text },
          toRecipients: [{ emailAddress: { address: to } }],
          from: { emailAddress: { address: senderEmail } },
        },
      }),
    }
  );

  if (!res.ok) {
    // Token might be stale; clear cache so next call fetches a fresh one
    graphTokenCache = null;
    const body = await res.text().catch(() => res.statusText);
    throw new Error(`Microsoft Graph sendMail fallita (${res.status}): ${body}`);
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export async function sendMail(to: string, subject: string, text: string, html?: string) {
  try {
    const settings = await getSettings();
    if (settings.emailProvider === "graph") {
      await sendViaGraph(to, subject, text, html);
    } else {
      await sendViaSmtp(to, subject, text, html);
    }
  } catch (err) {
    // Don't fail the request if mail is unreachable.
    console.error("Failed to send email notification:", err);
  }
}

export function ticketUrl(ticketId: string) {
  return `${process.env.APP_URL ?? "http://localhost:3000"}/tickets/${ticketId}`;
}
