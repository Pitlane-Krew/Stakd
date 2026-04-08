import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export interface SendEmailOptions {
  to: string;
  subject: string;
  react: React.ReactNode;
}

/**
 * Send a transactional email via Resend.
 *
 * IMPORTANT: The `from` address MUST use a domain you've verified in Resend.
 * During testing you can use Resend's shared domain: onboarding@resend.dev
 * For production, verify your domain (e.g. stakd.app) and use noreply@stakd.app
 */
export async function sendEmail({ to, subject, react }: SendEmailOptions) {
  try {
    const fromAddress = process.env.EMAIL_FROM_ADDRESS || 'STAKD <noreply@stakd.vip>';

    const result = await resend.emails.send({
      from: fromAddress,
      to,
      subject,
      react,
    });

    return result;
  } catch (error) {
    console.error(`Failed to send email to ${to}:`, error);
    throw error;
  }
}
