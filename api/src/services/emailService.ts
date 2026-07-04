import nodemailer from "nodemailer";

function getSmtpConfig() {
  return {
    host: process.env.SMTP_HOST ?? "localhost",
    port: parseInt(process.env.SMTP_PORT ?? "1025", 10),
    secure: false,
  };
}

function getFromAddress(): string {
  return process.env.SMTP_FROM ?? "finance@localhost";
}

function getFrontendUrl(): string {
  return process.env.FRONTEND_URL ?? "http://localhost:3000";
}

const transporter = nodemailer.createTransport(getSmtpConfig());

export async function sendPasswordResetEmail(
  to: string,
  name: string,
  token: string,
): Promise<void> {
  const resetUrl = `${getFrontendUrl()}/reset-password?token=${encodeURIComponent(token)}`;

  await transporter.sendMail({
    from: getFromAddress(),
    to,
    subject: "Reset your Finance password",
    text: `Hi ${name},\n\nReset your password using this link (valid for 1 hour):\n${resetUrl}\n\nIf you did not request this, you can ignore this email.`,
    html: `<p>Hi ${name},</p><p>Reset your password using this link (valid for 1 hour):</p><p><a href="${resetUrl}">${resetUrl}</a></p><p>If you did not request this, you can ignore this email.</p>`,
  });
}
