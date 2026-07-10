// Magic-link delivery.
//
// Local / unconfigured (no SMTP env): the link is printed to the terminal so
// the whole login flow works with zero external setup.
// Prod: sent via Brevo SMTP.
import type { Transporter } from 'nodemailer';

const SMTP_HOST = process.env.BREVO_SMTP_HOST;
const SMTP_USER = process.env.BREVO_SMTP_USER;
const SMTP_PASS = process.env.BREVO_SMTP_PASS;
// Absender fest auf die eigene Domain — Fremd-Domains unmöglich (KaR-Lektion).
const MAIL_FROM = process.env.MAIL_FROM ?? "Swallow's Rose <crew@swallowsrose.com>";

let transporter: Transporter | undefined;

export async function sendMagicLinkEmail({ email, url }: { email: string; url: string }) {
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) {
    console.log('\n────────── MAGIC LINK (dev, keine SMTP-Config) ──────────');
    console.log(`  an:   ${email}`);
    console.log(`  link: ${url}`);
    console.log('─────────────────────────────────────────────────────────\n');
    return;
  }

  const { createTransport } = await import('nodemailer');
  transporter ??= createTransport({
    host: SMTP_HOST,
    port: 587,
    secure: false,
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  });

  await transporter.sendMail({
    from: MAIL_FROM,
    to: email,
    subject: "Dein Login-Link — Swallow's Rose Crew",
    text: `Hier ist dein Login-Link:\n\n${url}\n\nDer Link ist nur kurz gültig. Wenn du das nicht warst, ignorier diese Mail einfach.`,
    html: `<div style="font-family:system-ui,sans-serif;max-width:480px;margin:0 auto;padding:24px">
      <h2 style="margin:0 0 16px">Swallow's Rose — Crew-Login</h2>
      <p style="margin:0 0 24px;color:#444">Klick auf den Button, um dich einzuloggen:</p>
      <a href="${url}" style="display:inline-block;padding:12px 20px;background:#111;color:#fff;text-decoration:none;border-radius:8px">Einloggen →</a>
      <p style="margin:24px 0 0;font-size:13px;color:#888">Der Link ist nur kurz gültig. Wenn du das nicht warst, ignorier diese Mail.</p>
    </div>`,
  });
}
