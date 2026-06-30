import "server-only"
import { Resend } from "resend"

/**
 * Single shared Resend client. Lazily created so a missing key only blows up
 * when we actually try to send, not at module load.
 */
let client: Resend | null = null
function getResend(): Resend {
  if (!client) client = new Resend(process.env.RESEND_API_KEY)
  return client
}

/**
 * The sender address. In dev this is Resend's test sender, which only delivers
 * to the Resend account owner's email. For production, verify a domain in Resend
 * and change this to e.g. "JournaLink <noreply@yourdomain.com>".
 */
export const FROM_EMAIL = "JournaLink <onboarding@resend.dev>"

/** Send a password-reset email containing the one-time reset link. Throws on failure. */
export async function sendPasswordResetEmail(to: string, resetUrl: string): Promise<void> {
  const { error } = await getResend().emails.send({
    from: FROM_EMAIL,
    to,
    subject: "Reset your JournaLink password",
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 24px; color: #1a1a1a;">
        <h1 style="font-size: 20px; margin: 0 0 16px;">Reset your password</h1>
        <p style="font-size: 14px; line-height: 1.6; margin: 0 0 24px; color: #444;">
          We received a request to reset your JournaLink password. Click the button below to choose a new one.
          This link expires in 1 hour.
        </p>
        <a href="${resetUrl}" style="display: inline-block; background: #FFD700; color: #1a1a1a; text-decoration: none; font-weight: 600; font-size: 14px; padding: 12px 24px; border-radius: 8px;">
          Reset password
        </a>
        <p style="font-size: 12px; line-height: 1.6; margin: 24px 0 0; color: #888;">
          If you didn't request this, you can safely ignore this email. Your password won't change.
        </p>
        <p style="font-size: 12px; line-height: 1.6; margin: 16px 0 0; color: #888; word-break: break-all;">
          Or paste this link into your browser:<br />${resetUrl}
        </p>
      </div>
    `,
  })

  if (error) {
    throw new Error(error.message)
  }
}
