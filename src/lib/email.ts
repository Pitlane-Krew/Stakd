import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export interface SendEmailOptions {
  to: string;
  subject: string;
  react: React.ReactNode;
}

export async function sendEmail({ to, subject, react }: SendEmailOptions) {
  try {
    const result = await resend.emails.send({
      from: 'STAKD <pitlanevitrina@gmail.com>',
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
