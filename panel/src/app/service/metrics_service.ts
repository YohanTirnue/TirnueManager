import { Registry, Counter, Histogram, Gauge, collectDefaultMetrics } from "prom-client";
import { logger } from "./log";

class MetricsService {
  private registry: Registry;

  // Counters
  public otpCreated: Counter;
  public otpVerified: Counter;
  public otpFailed: Counter;
  public invitationsSent: Counter;
  public invitationsAccepted: Counter;
  public subUsersCreated: Counter;
  public emailsSent: Counter;
  public emailsFailed: Counter;

  // Histograms (for latency)
  public emailSendDuration: Histogram;
  public otpVerifyDuration: Histogram;

  // Gauges (for current state)
  public activeOTPs: Gauge;
  public pendingInvitations: Gauge;
  public circuitBreakerState: Gauge;

  constructor() {
    this.registry = new Registry();

    // Collect default Node.js metrics
    collectDefaultMetrics({ register: this.registry });

    // OTP Counters
    this.otpCreated = new Counter({
      name: "tirnue_otp_created_total",
      help: "Total OTPs created",
      labelNames: ["type"],
      registers: [this.registry]
    });

    this.otpVerified = new Counter({
      name: "tirnue_otp_verified_total",
      help: "Total OTPs successfully verified",
      labelNames: ["type"],
      registers: [this.registry]
    });

    this.otpFailed = new Counter({
      name: "tirnue_otp_failed_total",
      help: "Total OTP verification failures",
      labelNames: ["type", "reason"],
      registers: [this.registry]
    });

    // Invitation Counters
    this.invitationsSent = new Counter({
      name: "tirnue_invitations_sent_total",
      help: "Total invitations sent",
      registers: [this.registry]
    });

    this.invitationsAccepted = new Counter({
      name: "tirnue_invitations_accepted_total",
      help: "Total invitations accepted",
      registers: [this.registry]
    });

    // Sub-user Counter
    this.subUsersCreated = new Counter({
      name: "tirnue_sub_users_created_total",
      help: "Total sub-users created",
      registers: [this.registry]
    });

    // Email Counters
    this.emailsSent = new Counter({
      name: "tirnue_emails_sent_total",
      help: "Total emails sent",
      labelNames: ["type"],
      registers: [this.registry]
    });

    this.emailsFailed = new Counter({
      name: "tirnue_emails_failed_total",
      help: "Total email send failures",
      labelNames: ["type"],
      registers: [this.registry]
    });

    // Histograms
    this.emailSendDuration = new Histogram({
      name: "tirnue_email_send_duration_seconds",
      help: "Email send duration",
      labelNames: ["type", "result"],
      buckets: [0.1, 0.5, 1, 2, 5, 10, 30],
      registers: [this.registry]
    });

    this.otpVerifyDuration = new Histogram({
      name: "tirnue_otp_verify_duration_seconds",
      help: "OTP verification duration",
      buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5],
      registers: [this.registry]
    });

    // Gauges
    this.activeOTPs = new Gauge({
      name: "tirnue_active_otps",
      help: "Current number of active OTPs",
      labelNames: ["type"],
      registers: [this.registry]
    });

    this.pendingInvitations = new Gauge({
      name: "tirnue_pending_invitations",
      help: "Current number of pending invitations",
      registers: [this.registry]
    });

    this.circuitBreakerState = new Gauge({
      name: "tirnue_circuit_breaker_state",
      help: "Circuit breaker state (0=closed, 1=half-open, 2=open)",
      labelNames: ["service"],
      registers: [this.registry]
    });

    logger.info("[MetricsService] Prometheus metrics initialized");
  }

  /**
   * Get all metrics in Prometheus format
   */
  async getMetrics(): Promise<string> {
    return await this.registry.metrics();
  }

  /**
   * Get content type for Prometheus
   */
  getContentType(): string {
    return this.registry.contentType;
  }
}

export const metrics = new MetricsService();
