import nodemailer, { type Transporter } from 'nodemailer';
import { config } from '../config.js';

export interface MailMessage {
  to: string;
  subject: string;
  text: string;
  html: string;
}

let transporter: Transporter | null = null;

export function mailConfigured(): boolean {
  return Boolean(config.mail.gmailUser && config.mail.gmailAppPassword);
}

/** Development can always "send": messages land in the server console. */
export function canSendMail(): boolean {
  return mailConfigured() || !config.isProduction;
}

export async function sendMail(message: MailMessage): Promise<void> {
  if (!mailConfigured()) {
    if (config.isProduction) throw new Error('Email is not configured. Set GMAIL_USER and GMAIL_APP_PASSWORD.');
    console.log(`\n[mail] Not configured, so this was printed instead of sent.\nTo: ${message.to}\nSubject: ${message.subject}\n\n${message.text}\n`);
    return;
  }

  transporter ??= nodemailer.createTransport({
    service: 'gmail',
    auth: { user: config.mail.gmailUser, pass: config.mail.gmailAppPassword },
  });

  await transporter.sendMail({
    from: { name: config.mail.fromName, address: config.mail.gmailUser },
    to: message.to,
    subject: message.subject,
    text: message.text,
    html: message.html,
  });
}
