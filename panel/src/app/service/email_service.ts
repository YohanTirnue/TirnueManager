import nodemailer from "nodemailer";
import type { Transporter } from "nodemailer";
import CircuitBreaker from "opossum";
import { logger } from "./log";

// Hardcoded SMTP configuration
const SMTP_CONFIG = {
  host: "smtp.gmail.com",
  port: 587,
  secure: false,
  auth: {
    user: "tirnuehosting@gmail.com",
    pass: "kzyl ttwm jdhf lqaq"
  }
};

const FROM_EMAIL = {
  name: "Tirnue Manager",
  address: "tirnuehosting@gmail.com"
};

class EmailService {
  private transporter: Transporter | null = null;
  private maxRetries: number = 3;
  private circuitBreaker: CircuitBreaker | null = null;

  constructor() {
    this.initializeTransporter();
    this.initializeCircuitBreaker();
  }

  private initializeCircuitBreaker() {
    // Create circuit breaker for email sending
    this.circuitBreaker = new CircuitBreaker(
      async (mailOptions: any) => {
        return await this.sendWithRetryInternal(mailOptions);
      },
      {
        timeout: 30000, // 30 second timeout
        errorThresholdPercentage: 50, // Open circuit if 50% of requests fail
        resetTimeout: 30000, // Try again after 30 seconds
        rollingCountTimeout: 60000, // Count errors in 60 second window
        rollingCountBuckets: 10, // Split window into 10 buckets
        name: "email-service"
      }
    );

    // Circuit opened - stop trying
    this.circuitBreaker.on("open", () => {
      logger.error("[EmailService] Circuit breaker opened - email service is failing");
    });

    // Circuit half-open - testing if service recovered
    this.circuitBreaker.on("halfOpen", () => {
      logger.warn("[EmailService] Circuit breaker half-open - testing email service");
    });

    // Circuit closed - service recovered
    this.circuitBreaker.on("close", () => {
      logger.info("[EmailService] Circuit breaker closed - email service recovered");
    });

    logger.info("[EmailService] Circuit breaker initialized");
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

  /**
   * Send email with circuit breaker protection
   */
  private async sendWithRetry(mailOptions: any): Promise<void> {
    if (!this.circuitBreaker) {
      // Fallback if circuit breaker not initialized
      return await this.sendWithRetryInternal(mailOptions);
    }

    try {
      await this.circuitBreaker.fire(mailOptions);
    } catch (error: any) {
      if (error.message === "Breaker is open") {
        logger.error("[EmailService] Circuit breaker is open - email service temporarily unavailable");
        throw new Error("Email service temporarily unavailable. Please try again later.");
      }
      throw error;
    }
  }

  /**
   * Internal send with retry logic and exponential backoff
   */
  private async sendWithRetryInternal(mailOptions: any): Promise<void> {
    if (!this.transporter) {
      throw new Error("Transporter not initialized");
    }

    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      try {
        await this.transporter.sendMail(mailOptions);

        if (attempt > 0) {
          logger.info(`[EmailService] Email sent successfully after ${attempt} retries`);
        }

        return; // Success!

      } catch (error: any) {
        lastError = error;

        // Check if error is retryable
        const isRetryable = this.isRetryableError(error);

        if (!isRetryable || attempt === this.maxRetries) {
          logger.error(`[EmailService] Email failed permanently:`, error.message);
          throw error;
        }

        // Exponential backoff: 1s, 2s, 4s
        const delayMs = Math.pow(2, attempt) * 1000;
        const jitter = Math.random() * 200; // Add jitter to prevent thundering herd

        logger.warn(
          `[EmailService] Email attempt ${attempt + 1} failed, retrying in ${delayMs}ms: ${error.message}`
        );

        await this.sleep(delayMs + jitter);
      }
    }

    throw lastError;
  }

  /**
   * Get circuit breaker status for monitoring
   */
  getCircuitBreakerStatus(): { state: string; stats: any } | null {
    if (!this.circuitBreaker) return null;

    return {
      state: this.circuitBreaker.opened ? "open" :
             this.circuitBreaker.halfOpen ? "half-open" : "closed",
      stats: this.circuitBreaker.stats
    };
  }

  /**
   * Check if an error is retryable
   */
  private isRetryableError(error: any): boolean {
    // Retryable: Network errors, timeouts, rate limits
    const retryableCodes = [
      "ETIMEDOUT",
      "ECONNRESET",
      "ENOTFOUND",
      "ECONNREFUSED",
      "ESOCKET",
      "ECONNECTION"
    ];

    // Non-retryable: Auth failures, invalid recipients
    const nonRetryableCodes = [
      "EAUTH", // Authentication failed
      "EMESSAGE" // Invalid message format
    ];

    if (nonRetryableCodes.some(code => error.code === code)) {
      return false;
    }

    if (retryableCodes.some(code => error.code === code)) {
      return true;
    }

    // Gmail rate limit (HTTP 421)
    if (error.responseCode === 421) {
      return true;
    }

    // Temporary failures (4xx)
    if (error.responseCode >= 400 && error.responseCode < 500 && error.responseCode !== 401) {
      return true;
    }

    // Default: don't retry unknown errors
    return false;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
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
      await this.sendWithRetry({
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
      await this.sendWithRetry({
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
      await this.sendWithRetry({
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

  async sendEmailChangedNotification(oldEmail: string, newEmail: string): Promise<boolean> {
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
                    <h1 style="color: #FF8C42; font-size: 28px; margin: 0 0 16px 0;">Email Address Changed</h1>
                    <p style="color: rgba(255, 255, 255, 0.8); font-size: 16px; margin: 0 0 24px 0;">
                      Your email has been changed to: <strong style="color: #FF8C42;">${newEmail}</strong>
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
      await this.sendWithRetry({
        from: `"${FROM_EMAIL.name}" <${FROM_EMAIL.address}>`,
        to: oldEmail,
        subject: "Email Address Changed - Tirnue Manager",
        html
      });
      return true;
    } catch (error) {
      logger.error(`[EmailService] Failed to send email changed notification:`, error);
      return false;
    }
  }

  async sendInvitationEmail(
    email: string,
    inviterName: string,
    instanceName: string,
    token: string,
    expiryMinutes: number,
    hasAccount: boolean = false
  ): Promise<boolean> {
    if (!this.transporter) return false;

    // Generate the invitation link - adjust baseUrl as needed
    const baseUrl = process.env.PANEL_URL || "https://hosting.tirnue.space";
    const inviteLink = `${baseUrl}/#/accept-invitation/${token}`;

    // Customize message based on account status
    const ctaText = hasAccount ? "Log In to Accept" : "Create Account & Accept";
    const instructionText = hasAccount
      ? "You already have an account! Click below to log in and you'll immediately gain access to the instance."
      : "Click below to create your account. No email verification needed - you'll get instant access after creating your account!";

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
                    <!-- Logo/Brand -->
                    <div style="margin-bottom: 24px;">
                      <h1 style="color: #FF8C42; font-size: 36px; margin: 0; font-weight: 800;">Tirnue</h1>
                    </div>

                    <!-- Title -->
                    <h2 style="color: white; font-size: 24px; margin: 0 0 16px 0; font-weight: 600;">
                      You've Been Invited!
                    </h2>

                    <!-- Description -->
                    <p style="color: rgba(255, 255, 255, 0.8); font-size: 16px; margin: 0 0 16px 0;">
                      <strong style="color: #FF8C42;">${inviterName}</strong> has invited you to access their server instance:
                    </p>

                    <p style="color: rgba(255, 255, 255, 0.9); font-size: 18px; margin: 0 0 16px 0; font-weight: 600;">
                      "${instanceName}"
                    </p>

                    <!-- Instructions based on account status -->
                    <p style="color: rgba(255, 255, 255, 0.7); font-size: 14px; margin: 0 0 32px 0; line-height: 1.5;">
                      ${instructionText}
                    </p>

                    <!-- CTA Button -->
                    <div style="margin-bottom: 32px;">
                      <a href="${inviteLink}" style="display: inline-block; background: linear-gradient(135deg, #FF8C42 0%, #FF6B1A 100%); color: white; text-decoration: none; padding: 16px 32px; border-radius: 8px; font-weight: 600; font-size: 16px;">
                        ${ctaText}
                      </a>
                    </div>

                    <!-- Expiry Notice -->
                    <p style="color: rgba(255, 255, 255, 0.5); font-size: 12px; margin: 0 0 24px 0;">
                      This invitation expires in <strong style="color: #FF8C42;">${expiryMinutes} minutes</strong>
                    </p>

                    <!-- Link fallback -->
                    <div style="background: rgba(255, 255, 255, 0.05); border-radius: 8px; padding: 16px; margin-bottom: 16px;">
                      <p style="color: rgba(255, 255, 255, 0.6); font-size: 12px; margin: 0 0 8px 0;">
                        Or copy this link:
                      </p>
                      <p style="color: rgba(255, 255, 255, 0.8); font-size: 11px; margin: 0; word-break: break-all;">
                        ${inviteLink}
                      </p>
                    </div>

                    <!-- Security Notice -->
                    <div style="background: rgba(255, 255, 255, 0.05); border-radius: 8px; padding: 16px;">
                      <p style="color: rgba(255, 255, 255, 0.5); font-size: 12px; margin: 0; line-height: 1.5;">
                        If you don't know this person or didn't expect this invitation, you can safely ignore this email.
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

    try {
      await this.sendWithRetry({
        from: `"${FROM_EMAIL.name}" <${FROM_EMAIL.address}>`,
        to: email,
        subject: `${inviterName} invited you to access "${instanceName}" - Tirnue Manager`,
        html
      });
      logger.info(`[EmailService] Invitation email sent to ${email}`);
      return true;
    } catch (error) {
      logger.error(`[EmailService] Failed to send invitation email to ${email}:`, error);
      return false;
    }
  }

  async sendTransactionReceipt(
    email: string,
    userName: string,
    transaction: {
      id: string;
      date: string;
      type: string;
      amount: number;
      currency: string;
      status: string;
      description: string;
      paymentMethod?: string;
    }
  ): Promise<boolean> {
    if (!this.transporter) return false;

    const formatCurrency = (amount: number, currency: string) => {
      return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: currency || "USD"
      }).format(amount);
    };

    const formatDate = (dateString: string) => {
      return new Date(dateString).toLocaleString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit"
      });
    };

    const statusColors: Record<string, string> = {
      completed: "#52c41a",
      pending: "#faad14",
      failed: "#f5222d",
      refunded: "#722ed1"
    };

    const typeLabels: Record<string, string> = {
      payment: "Payment",
      refund: "Refund",
      subscription: "Subscription",
      "one-time": "One-Time Payment"
    };

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
                  <td style="padding: 40px;">
                    <!-- Logo/Brand -->
                    <div style="text-align: center; margin-bottom: 32px;">
                      <h1 style="color: #FF8C42; font-size: 36px; margin: 0; font-weight: 800;">Tirnue</h1>
                    </div>

                    <!-- Title -->
                    <h2 style="color: white; font-size: 24px; margin: 0 0 8px 0; font-weight: 600; text-align: center;">
                      Payment Receipt
                    </h2>
                    <p style="color: rgba(255, 255, 255, 0.6); font-size: 14px; margin: 0 0 32px 0; text-align: center;">
                      Thank you for your ${typeLabels[transaction.type] || transaction.type}!
                    </p>

                    <!-- Amount -->
                    <div style="background: rgba(255, 140, 66, 0.15); border: 2px solid rgba(255, 140, 66, 0.3); border-radius: 12px; padding: 24px; margin-bottom: 32px; text-align: center;">
                      <p style="color: rgba(255, 255, 255, 0.6); font-size: 12px; margin: 0 0 8px 0; text-transform: uppercase; letter-spacing: 1px;">
                        Total Amount
                      </p>
                      <p style="color: #FF8C42; font-size: 48px; font-weight: 700; margin: 0;">
                        ${formatCurrency(transaction.amount, transaction.currency)}
                      </p>
                    </div>

                    <!-- Receipt Details -->
                    <div style="background: rgba(255, 255, 255, 0.05); border-radius: 8px; padding: 24px; margin-bottom: 24px;">
                      <table width="100%" cellspacing="0" cellpadding="0">
                        <tr>
                          <td style="padding: 8px 0; color: rgba(255, 255, 255, 0.6); font-size: 14px;">Transaction ID</td>
                          <td style="padding: 8px 0; color: rgba(255, 255, 255, 0.9); font-size: 14px; text-align: right; font-family: monospace;">${transaction.id.substring(0, 12)}...</td>
                        </tr>
                        <tr>
                          <td style="padding: 8px 0; color: rgba(255, 255, 255, 0.6); font-size: 14px;">Date</td>
                          <td style="padding: 8px 0; color: rgba(255, 255, 255, 0.9); font-size: 14px; text-align: right;">${formatDate(transaction.date)}</td>
                        </tr>
                        <tr>
                          <td style="padding: 8px 0; color: rgba(255, 255, 255, 0.6); font-size: 14px;">Type</td>
                          <td style="padding: 8px 0; color: rgba(255, 255, 255, 0.9); font-size: 14px; text-align: right;">${typeLabels[transaction.type] || transaction.type}</td>
                        </tr>
                        <tr>
                          <td style="padding: 8px 0; color: rgba(255, 255, 255, 0.6); font-size: 14px;">Status</td>
                          <td style="padding: 8px 0; text-align: right;">
                            <span style="display: inline-block; padding: 4px 12px; background: ${statusColors[transaction.status] || "#666"}22; color: ${statusColors[transaction.status] || "#666"}; border-radius: 12px; font-size: 12px; font-weight: 600; text-transform: uppercase;">
                              ${transaction.status}
                            </span>
                          </td>
                        </tr>
                        ${transaction.paymentMethod ? `
                        <tr>
                          <td style="padding: 8px 0; color: rgba(255, 255, 255, 0.6); font-size: 14px;">Payment Method</td>
                          <td style="padding: 8px 0; color: rgba(255, 255, 255, 0.9); font-size: 14px; text-align: right;">${transaction.paymentMethod}</td>
                        </tr>
                        ` : ''}
                        <tr>
                          <td colspan="2" style="padding: 16px 0 8px 0; color: rgba(255, 255, 255, 0.6); font-size: 12px; border-top: 1px solid rgba(255, 255, 255, 0.1);">Description</td>
                        </tr>
                        <tr>
                          <td colspan="2" style="padding: 0 0 8px 0; color: rgba(255, 255, 255, 0.9); font-size: 14px;">
                            ${transaction.description}
                          </td>
                        </tr>
                      </table>
                    </div>

                    <!-- Support Notice -->
                    <div style="background: rgba(255, 255, 255, 0.05); border-radius: 8px; padding: 16px; text-align: center;">
                      <p style="color: rgba(255, 255, 255, 0.6); font-size: 13px; margin: 0 0 8px 0;">
                        Questions about this transaction?
                      </p>
                      <p style="color: rgba(255, 255, 255, 0.5); font-size: 12px; margin: 0;">
                        Contact our support team at <a href="mailto:${FROM_EMAIL.address}" style="color: #FF8C42; text-decoration: none;">${FROM_EMAIL.address}</a>
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

    try {
      await this.sendWithRetry({
        from: `"${FROM_EMAIL.name}" <${FROM_EMAIL.address}>`,
        to: email,
        subject: `Receipt for ${typeLabels[transaction.type]} - ${formatCurrency(transaction.amount, transaction.currency)}`,
        html
      });
      logger.info(`[EmailService] Transaction receipt sent to ${email} for transaction ${transaction.id}`);
      return true;
    } catch (error) {
      logger.error(`[EmailService] Failed to send transaction receipt to ${email}:`, error);
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
