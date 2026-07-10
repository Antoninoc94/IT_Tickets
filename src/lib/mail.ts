import "server-only";
import nodemailer from "nodemailer";

let transporter: nodemailer.Transporter | null = null;

function getTransporter() {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT ?? 25),
      secure: process.env.SMTP_SECURE === "true",
      auth:
        process.env.SMTP_USER && process.env.SMTP_PASS
          ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
          : undefined,
    });
  }
  return transporter;
}

export async function sendMail(to: string, subject: string, text: string) {
  try {
    await getTransporter().sendMail({
      from: process.env.SMTP_FROM,
      to,
      subject,
      text,
    });
  } catch (err) {
    // Don't fail the request if the internal mail server is unreachable.
    console.error("Failed to send email notification:", err);
  }
}

export function ticketUrl(ticketId: string) {
  return `${process.env.APP_URL ?? "http://localhost:3000"}/tickets/${ticketId}`;
}
