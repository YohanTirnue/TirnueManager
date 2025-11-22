import nodemailer from "nodemailer";
import type { Transporter } from "nodemailer";
import { logger } from "./log";

// Hardcoded SMTP configuration
const SMTP_CONFIG = {
  host: "smtp.gmail.com",
  port: 587,
  secure: false,
  auth: {
    user: "tirnuehosting@gmail.com",
    pass: "tirnuehost678902"
  }
};

const FROM_EMAIL = {
  name: "Tirnue Manager",
  address: "tirnuehosting@gmail.com"
};

class EmailService {
  private transporter: Transporter | null = null;

  constructor() {
    this.initializeTransporter();
  }

  private initializeTransporter() {
    try {
      this.transporter = nodemailer.createTransport({
        host: SMTP_CONFIG.host,
        port: SMTP_CONFIG.port,
        secure: SMTP_CONFIG.secure,
        auth: {
          user: SMTP_CONFIG.auth.user,
          pass: SMTP_CONFIG.auth.pass
        }
      });

      logger.info("[EmailService] SMTP transporter initialized");
    } catch (error) {
      logger.error("[EmailService] Failed to initialize SMTP:", error);
    }
  }

  async sendOTP(
    email: string,
    otp: string,
    type: "registration" | "password_reset" | "email_change",
    firstName?: string
  ): Promise<boolean> {
    if (!this.transporter) {
      logger.error("[EmailService] Transporter not initialized");
      return false;
    }

    const subjects = {
      registration: "Verify Your Email - Tirnue Manager",
      password_reset: "Reset Your Password - Tirnue Manager",
      email_change: "Verify New Email - Tirnue Manager"
    };

    const html = this.generateOTPEmailHTML(otp, type, firstName);

    try {
      await this.transporter.sendMail({
        from: `"${FROM_EMAIL.name}" <${FROM_EMAIL.address}>`,
        to: email,
        subject: subjects[type],
        html
      });

      logger.info(`[EmailService] OTP email sent to ${email} for ${type}`);
      return true;
    } catch (error) {
      logger.error(`[EmailService] Failed to send OTP email to ${email}:`, error);
      return false;
    }
  }

  async sendWelcomeEmail(email: string, firstName: string): Promise<boolean> {
    if (!this.transporter) return false;

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="margin: 0; padding: 0; background-color: #0a0a0a; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #0a0a0a;">
          <tr>
            <td align="center" style="padding: 40px 20px;">
              <table role="presentation" width="100%" style="max-width: 600px; background: linear-gradient(135deg, rgba(255, 140, 66, 0.1) 0%, rgba(20, 20, 20, 0.95) 100%); border-radius: 16px; border: 1px solid rgba(255, 140, 66, 0.2);">
                <tr>
                  <td style="padding: 40px; text-align: center;">
                    <h1 style="color: #FF8C42; font-size: 32px; margin: 0 0 16px 0;">Welcome to Tirnue!</h1>
                    <p style="color: rgba(255, 255, 255, 0.8); font-size: 18px; margin: 0 0 24px 0;">
                      Hi ${firstName}, your account has been created successfully.
                    </p>
                    <p style="color: rgba(255, 255, 255, 0.6); font-size: 14px; margin: 0;">
                      You can now access your dashboard and manage your servers.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `;

    try {
      await this.transporter.sendMail({
        from: `"${FROM_EMAIL.name}" <${FROM_EMAIL.address}>`,
        to: email,
        subject: "Welcome to Tirnue Manager!",
        html
      });
      return true;
    } catch (error) {
      logger.error(`[EmailService] Failed to send welcome email:`, error);
      return false;
    }
  }

  async sendPasswordChangedNotification(email: string): Promise<boolean> {
    if (!this.transporter) return false;

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="margin: 0; padding: 0; background-color: #0a0a0a; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #0a0a0a;">
          <tr>
            <td align="center" style="padding: 40px 20px;">
              <table role="presentation" width="100%" style="max-width: 600px; background: linear-gradient(135deg, rgba(255, 140, 66, 0.1) 0%, rgba(20, 20, 20, 0.95) 100%); border-radius: 16px; border: 1px solid rgba(255, 140, 66, 0.2);">
                <tr>
                  <td style="padding: 40px; text-align: center;">
                    <h1 style="color: #FF8C42; font-size: 28px; margin: 0 0 16px 0;">Password Changed</h1>
                    <p style="color: rgba(255, 255, 255, 0.8); font-size: 16px; margin: 0 0 24px 0;">
                      Your password has been successfully changed.
                    </p>
                    <p style="color: rgba(255, 255, 255, 0.6); font-size: 14px; margin: 0;">
                      If you didn't make this change, please contact support immediately.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `;

    try {
      await this.transporter.sendMail({
        from: `"${FROM_EMAIL.name}" <${FROM_EMAIL.address}>`,
        to: email,
        subject: "Password Changed - Tirnue Manager",
        html
      });
      return true;
    } catch (error) {
      logger.error(`[EmailService] Failed to send password changed email:`, error);
      return false;
    }
  }

  private generateOTPEmailHTML(
    otp: string,
    type: "registration" | "password_reset" | "email_change",
    firstName?: string
  ): string {
    const titles = {
      registration: "Verify Your Email",
      password_reset: "Reset Your Password",
      email_change: "Verify New Email"
    };

    const descriptions = {
      registration: "Thank you for registering! Please use the code below to verify your email address.",
      password_reset: "We received a request to reset your password. Use the code below to proceed.",
      email_change: "Please verify your new email address using the code below."
    };

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="margin: 0; padding: 0; background-color: #0a0a0a; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #0a0a0a;">
          <tr>
            <td align="center" style="padding: 40px 20px;">
              <table role="presentation" width="100%" style="max-width: 600px; background: linear-gradient(135deg, rgba(255, 140, 66, 0.1) 0%, rgba(20, 20, 20, 0.95) 100%); border-radius: 16px; border: 1px solid rgba(255, 140, 66, 0.2);">
                <tr>
                  <td style="padding: 40px; text-align: center;">
                    <!-- Logo/Brand -->
                    <div style="margin-bottom: 24px;">
                      <h1 style="color: #FF8C42; font-size: 36px; margin: 0; font-weight: 800;">Tirnue</h1>
                    </div>

                    <!-- Title -->
                    <h2 style="color: white; font-size: 24px; margin: 0 0 16px 0; font-weight: 600;">
                      ${titles[type]}
                    </h2>

                    <!-- Greeting -->
                    ${firstName ? `<p style="color: rgba(255, 255, 255, 0.8); font-size: 16px; margin: 0 0 16px 0;">Hi ${firstName},</p>` : ""}

                    <!-- Description -->
                    <p style="color: rgba(255, 255, 255, 0.7); font-size: 14px; margin: 0 0 32px 0; line-height: 1.6;">
                      ${descriptions[type]}
                    </p>

                    <!-- OTP Code -->
                    <div style="background: rgba(255, 140, 66, 0.15); border: 2px solid rgba(255, 140, 66, 0.3); border-radius: 12px; padding: 24px; margin-bottom: 32px;">
                      <p style="color: rgba(255, 255, 255, 0.6); font-size: 12px; margin: 0 0 8px 0; text-transform: uppercase; letter-spacing: 1px;">
                        Your verification code
                      </p>
                      <p style="color: #FF8C42; font-size: 40px; font-weight: 700; margin: 0; letter-spacing: 8px; font-family: monospace;">
                        ${otp}
                      </p>
                    </div>

                    <!-- Expiry Notice -->
                    <p style="color: rgba(255, 255, 255, 0.5); font-size: 12px; margin: 0 0 24px 0;">
                      This code expires in <strong style="color: #FF8C42;">5 minutes</strong>
                    </p>

                    <!-- Security Notice -->
                    <div style="background: rgba(255, 255, 255, 0.05); border-radius: 8px; padding: 16px;">
                      <p style="color: rgba(255, 255, 255, 0.5); font-size: 12px; margin: 0; line-height: 1.5;">
                        If you didn't request this code, you can safely ignore this email.
                        Never share this code with anyone.
                      </p>
                    </div>
                  </td>
                </tr>

                <!-- Footer -->
                <tr>
                  <td style="padding: 24px 40px; border-top: 1px solid rgba(255, 140, 66, 0.1);">
                    <p style="color: rgba(255, 255, 255, 0.4); font-size: 12px; margin: 0; text-align: center;">
                      © ${new Date().getFullYear()} Tirnue Manager. All rights reserved.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `;
  }
}

export const emailService = new EmailService();
