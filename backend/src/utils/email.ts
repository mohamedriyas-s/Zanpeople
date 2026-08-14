import nodemailer from 'nodemailer';
import { env } from '../config/env';

/**
 * Sends a notification email using Nodemailer.
 * Relies on environment variables for SMTP configuration.
 */
export async function sendNotificationEmail(
  to: string,
  subject: string,
  text: string,
  html: string
): Promise<void> {
  // If SMTP is not configured, just log to console to prevent crashing in development
  if (!env.SMTP_HOST || !env.SMTP_USER || !env.SMTP_PASS) {
    console.warn('[Email Not Sent - Missing Config]', { to, subject, text });
    return;
  }

  try {
    const transporter = nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT || 587,
      secure: env.SMTP_PORT === 465, // true for 465, false for other ports
      auth: {
        user: env.SMTP_USER,
        pass: env.SMTP_PASS,
      },
    });

    await transporter.sendMail({
      from: env.SMTP_FROM || '"Zansphere HR" <no-reply@zansphere.com>',
      to,
      subject,
      text,
      html,
    });

    console.log(`[Email Sent] To: ${to}, Subject: ${subject}`);
  } catch (error) {
    console.error('[Email Failed]', error);
  }
}
