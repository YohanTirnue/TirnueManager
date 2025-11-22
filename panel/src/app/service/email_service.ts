import nodemailer from "nodemailer";
import { systemConfig } from "../setting";
import { logger } from "./log";

interface EmailConfig {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;
  from: string;
}

class EmailService {
  private transporter: nodemailer.Transporter | null = null;

  private getConfig(): EmailConfig | null {
    // Get email config from system settings
    const config = systemConfig?.emailConfig;
    if (!config || !config.host || !config.user || !config.pass) {
      return null;
    }
    return {
      host: config.host,
      port: config.port || 587,
      secure: config.secure || false,
      user: config.user,
      pass: config.pass,
      from: config.from || config.user
    };
  }

  private createTransporter(): nodemailer.Transporter | null {
    const config = this.getConfig();
    if (!config) {
      logger.warn("Email service not configured");
      return null;
    }

    return nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.secure,
      auth: {
        user: config.user,
        pass: config.pass
      }
    });
  }

  async sendInviteEmail(
    toEmail: string,
    inviteLink: string,
    instanceName: string,
    inviterName: string
  ): Promise<boolean> {
    const transporter = this.createTransporter();
    if (!transporter) {
      logger.error("Cannot send email: Email service not configured");
      return false;
    }

    const config = this.getConfig();
    if (!config) return false;

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #FF8C42, #FF6B35); padding: 30px; border-radius: 12px 12px 0 0; text-align: center; }
          .header h1 { color: white; margin: 0; font-size: 24px; }
          .content { background: #f8f9fa; padding: 30px; border: 1px solid #e9ecef; }
          .button { display: inline-block; background: linear-gradient(135deg, #FF8C42, #FF6B35); color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; margin: 20px 0; }
          .footer { background: #2d2d2d; color: #999; padding: 20px; text-align: center; border-radius: 0 0 12px 12px; font-size: 12px; }
          .info-box { background: white; padding: 15px; border-radius: 8px; margin: 15px 0; border-left: 4px solid #FF8C42; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Instance Access Invitation</h1>
          </div>
          <div class="content">
            <p>Hello,</p>
            <p>You have been invited by <strong>${inviterName}</strong> to access the following instance:</p>
            <div class="info-box">
              <strong>Instance:</strong> ${instanceName}
            </div>
            <p>Click the button below to accept this invitation and set up your account:</p>
            <center>
              <a href="${inviteLink}" class="button">Accept Invitation</a>
            </center>
            <p style="font-size: 12px; color: #666;">
              If the button doesn't work, copy and paste this link into your browser:<br>
              <a href="${inviteLink}">${inviteLink}</a>
            </p>
            <p style="font-size: 12px; color: #999;">This invitation link will expire in 72 hours.</p>
          </div>
          <div class="footer">
            <p>This email was sent by TirnueManager Panel</p>
          </div>
        </div>
      </body>
      </html>
    `;

    try {
      await transporter.sendMail({
        from: config.from,
        to: toEmail,
        subject: `You've been invited to access "${instanceName}"`,
        html: htmlContent
      });
      logger.info(`Invitation email sent to ${toEmail}`);
      return true;
    } catch (error: any) {
      logger.error(`Failed to send invitation email to ${toEmail}: ${error.message}`);
      return false;
    }
  }

  isConfigured(): boolean {
    return this.getConfig() !== null;
  }
}

export const emailService = new EmailService();
export default emailService;
