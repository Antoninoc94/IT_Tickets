import "server-only";

export interface EmailSettings {
  appName: string;
  brandColor: string;
  logoStorageKey: string | null;
}

function baseUrl() {
  return (process.env.APP_URL ?? "http://localhost:3000").replace(/\/$/, "");
}

function esc(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function lineToHtml(line: string, brandColor: string): string {
  // Linkify URLs in the body text
  const parts = line.split(/(https?:\/\/[^\s]+)/);
  return parts
    .map((part, i) =>
      i % 2 === 1
        ? `<a href="${esc(part)}" style="color:${brandColor};text-decoration:underline;">${esc(part)}</a>`
        : esc(part)
    )
    .join("");
}

function textToHtmlBody(text: string, brandColor: string): string {
  return text
    .trim()
    .split(/\n\n+/)
    .map(
      (para) =>
        `<p style="margin:0 0 16px;line-height:1.6;color:#374151;font-size:15px;">${para
          .split("\n")
          .map((l) => lineToHtml(l, brandColor))
          .join("<br>")}</p>`
    )
    .join("");
}

function emailShell(opts: {
  bodyHtml: string;
  settings: EmailSettings;
  ctaUrl?: string;
  ctaLabel?: string;
}): string {
  const { bodyHtml, settings, ctaUrl, ctaLabel } = opts;
  const { appName, brandColor, logoStorageKey } = settings;
  const base = baseUrl();

  const headerLogo = logoStorageKey
    ? `<img src="${base}/api/branding/logo" alt="${esc(appName)}" height="40" style="max-height:40px;display:block;">`
    : `<span style="font-size:20px;font-weight:700;color:#ffffff;letter-spacing:-0.3px;">${esc(appName)}</span>`;

  const ctaHtml = ctaUrl
    ? `<table cellpadding="0" cellspacing="0" role="presentation" style="margin-top:8px;">
        <tr>
          <td style="background:${brandColor};border-radius:6px;">
            <a href="${esc(ctaUrl)}" style="display:block;padding:12px 24px;color:#ffffff;text-decoration:none;font-weight:600;font-size:14px;white-space:nowrap;">${esc(ctaLabel ?? "Apri →")}</a>
          </td>
        </tr>
      </table>`
    : "";

  return `<!DOCTYPE html>
<html lang="it" xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="color-scheme" content="light">
  <title>${esc(appName)}</title>
</head>
<body style="margin:0;padding:0;background:#f4f5f7;font-family:Arial,Helvetica,sans-serif;-webkit-text-size-adjust:100%;">
  <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background:#f4f5f7;">
    <tr>
      <td align="center" style="padding:40px 16px;">
        <table width="560" cellpadding="0" cellspacing="0" role="presentation" style="max-width:560px;width:100%;">

          <!-- Header -->
          <tr>
            <td style="background:${brandColor};border-radius:10px 10px 0 0;padding:24px 32px;">
              <a href="${base}" style="text-decoration:none;">${headerLogo}</a>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="background:#ffffff;padding:32px 32px 24px;border-left:1px solid #e5e7eb;border-right:1px solid #e5e7eb;">
              ${bodyHtml}
              ${ctaHtml}
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#f9fafb;border:1px solid #e5e7eb;border-top:0;border-radius:0 0 10px 10px;padding:16px 32px;text-align:center;">
              <p style="margin:0;font-size:12px;color:#6b7280;line-height:1.5;">
                Hai ricevuto questa email da <strong>${esc(appName)}</strong>.<br>
                Non rispondere a questa email.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

/** Wrap a plain-text email body in the branded HTML shell. */
export function buildEmailHtml(
  text: string,
  settings: EmailSettings,
  opts?: { ctaUrl?: string; ctaLabel?: string }
): string {
  return emailShell({
    bodyHtml: textToHtmlBody(text, settings.brandColor),
    settings,
    ...opts,
  });
}

/** Dedicated HTML layout for the daily digest (ticket table). */
export function buildDigestHtml(
  tickets: {
    title: string;
    status: string;
    requesterName: string;
    assigneeName: string | null;
    url: string;
  }[],
  settings: EmailSettings
): string {
  const { brandColor } = settings;
  const base = baseUrl();

  const rows = tickets
    .map(
      (t) => `
      <tr>
        <td style="padding:10px 12px;border-bottom:1px solid #f3f4f6;max-width:220px;">
          <a href="${esc(t.url)}" style="color:${brandColor};text-decoration:none;font-weight:600;font-size:13px;word-break:break-word;">${esc(t.title)}</a>
        </td>
        <td style="padding:10px 12px;border-bottom:1px solid #f3f4f6;white-space:nowrap;font-size:12px;color:#6b7280;">${esc(t.status)}</td>
        <td style="padding:10px 12px;border-bottom:1px solid #f3f4f6;font-size:12px;color:#374151;">${esc(t.requesterName)}</td>
        <td style="padding:10px 12px;border-bottom:1px solid #f3f4f6;font-size:12px;color:#374151;">${esc(t.assigneeName ?? "—")}</td>
      </tr>`
    )
    .join("");

  const thStyle =
    "padding:8px 12px;text-align:left;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;color:#6b7280;border-bottom:1px solid #e5e7eb;";

  const bodyHtml = `
    <p style="margin:0 0 20px;font-size:15px;color:#111827;line-height:1.6;">
      Ci sono <strong style="color:${brandColor};">${tickets.length}</strong> ticket aperti che richiedono attenzione.
    </p>
    <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;border:1px solid #e5e7eb;font-size:13px;">
      <thead>
        <tr style="background:#f9fafb;">
          <th style="${thStyle}">Titolo</th>
          <th style="${thStyle}">Stato</th>
          <th style="${thStyle}">Richiedente</th>
          <th style="${thStyle}">Assegnato a</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>`;

  return emailShell({
    bodyHtml,
    settings,
    ctaUrl: `${base}/dashboard`,
    ctaLabel: "Apri dashboard →",
  });
}
