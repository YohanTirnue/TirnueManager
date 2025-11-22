import crypto from "crypto";
import { logger } from "./log";
import type { UserPermissions } from "../entity/entity_interface";

export interface InvitationRecord {
  invitationId: string;
  parentUserId: string;
  parentEmail: string;
  parentUserName: string;
  inviteeEmail: string;
  daemonId: string;
  instanceUuid: string;
  instanceName: string;
  permissions: UserPermissions;
  ownerOtpVerified: boolean;
  token: string;
  expiryMinutes: 30 | 60;
  createdAt: number;
  expiresAt: number;
  status: "pending_owner_otp" | "pending_invitee" | "accepted" | "expired" | "cancelled";
}

interface PendingInvitation {
  inviteeEmail: string;
  daemonId: string;
  instanceUuid: string;
  instanceName: string;
  permissions: UserPermissions;
  expiryMinutes: 30 | 60;
  parentUserId: string;
  parentEmail: string;
  parentUserName: string;
  createdAt: number;
}

class InvitationService {
  private invitationStore: Map<string, InvitationRecord> = new Map();
  private pendingOwnerOtpStore: Map<string, PendingInvitation> = new Map();

  constructor() {
    // Clean up expired invitations every 5 minutes
    setInterval(() => this.cleanupExpired(), 300000);
  }

  private generateToken(): string {
    return crypto.randomBytes(32).toString("hex");
  }

  private generateInvitationId(): string {
    return `inv_${crypto.randomUUID()}`;
  }

  // Store pending invitation while waiting for owner OTP verification
  storePendingInvitation(
    parentUserId: string,
    parentEmail: string,
    parentUserName: string,
    inviteeEmail: string,
    daemonId: string,
    instanceUuid: string,
    instanceName: string,
    permissions: UserPermissions,
    expiryMinutes: 30 | 60
  ): string {
    // Clear any existing pending invitation for same owner+invitee+instance combo
    const key = `${parentUserId}:${inviteeEmail}:${instanceUuid}`;

    const pending: PendingInvitation = {
      inviteeEmail,
      daemonId,
      instanceUuid,
      instanceName,
      permissions,
      expiryMinutes,
      parentUserId,
      parentEmail,
      parentUserName,
      createdAt: Date.now()
    };

    this.pendingOwnerOtpStore.set(key, pending);
    logger.info(`[InvitationService] Stored pending invitation from ${parentEmail} to ${inviteeEmail} for instance ${instanceUuid}`);

    return key;
  }

  // Create invitation directly without OTP verification
  createInvitation(
    parentUserId: string,
    parentUserName: string,
    inviteeEmail: string,
    daemonId: string,
    instanceUuid: string,
    instanceName: string,
    permissions: UserPermissions,
    expiryMinutes: 30 | 60,
    token?: string
  ): InvitationRecord {
    const invitationId = this.generateInvitationId();
    const inviteToken = token || this.generateToken();
    const now = Date.now();

    const invitation: InvitationRecord = {
      invitationId,
      parentUserId,
      parentEmail: "", // Not needed for direct invitations
      parentUserName,
      inviteeEmail,
      daemonId,
      instanceUuid,
      instanceName,
      permissions,
      ownerOtpVerified: false, // No OTP used in direct flow
      token: inviteToken,
      expiryMinutes,
      createdAt: now,
      expiresAt: now + expiryMinutes * 60 * 1000,
      status: "pending_invitee"
    };

    this.invitationStore.set(invitationId, invitation);
    logger.info(`[InvitationService] Created direct invitation ${invitationId} for ${inviteeEmail}`);

    return invitation;
  }

  // After owner OTP verification, create the actual invitation (legacy OTP flow)
  createInvitationAfterOtpVerification(pendingKey: string): InvitationRecord | null {
    const pending = this.pendingOwnerOtpStore.get(pendingKey);
    if (!pending) {
      logger.warn(`[InvitationService] No pending invitation found for key ${pendingKey}`);
      return null;
    }

    // Remove from pending store
    this.pendingOwnerOtpStore.delete(pendingKey);

    const invitationId = this.generateInvitationId();
    const token = this.generateToken();
    const now = Date.now();

    const invitation: InvitationRecord = {
      invitationId,
      parentUserId: pending.parentUserId,
      parentEmail: pending.parentEmail,
      parentUserName: pending.parentUserName,
      inviteeEmail: pending.inviteeEmail,
      daemonId: pending.daemonId,
      instanceUuid: pending.instanceUuid,
      instanceName: pending.instanceName,
      permissions: pending.permissions,
      ownerOtpVerified: true,
      token,
      expiryMinutes: pending.expiryMinutes,
      createdAt: now,
      expiresAt: now + pending.expiryMinutes * 60 * 1000,
      status: "pending_invitee"
    };

    this.invitationStore.set(invitationId, invitation);
    logger.info(`[InvitationService] Created invitation ${invitationId} for ${pending.inviteeEmail}`);

    return invitation;
  }

  getPendingInvitation(pendingKey: string): PendingInvitation | null {
    return this.pendingOwnerOtpStore.get(pendingKey) || null;
  }

  getInvitationById(invitationId: string): InvitationRecord | null {
    return this.invitationStore.get(invitationId) || null;
  }

  getInvitationByToken(token: string): InvitationRecord | null {
    for (const invitation of this.invitationStore.values()) {
      if (invitation.token === token) {
        // Check if expired
        if (Date.now() > invitation.expiresAt) {
          invitation.status = "expired";
          return null;
        }
        return invitation;
      }
    }
    return null;
  }

  // Get all pending invitations for a parent user
  getInvitationsByParent(parentUserId: string): InvitationRecord[] {
    const invitations: InvitationRecord[] = [];
    for (const invitation of this.invitationStore.values()) {
      if (invitation.parentUserId === parentUserId && invitation.status === "pending_invitee") {
        // Check expiry
        if (Date.now() > invitation.expiresAt) {
          invitation.status = "expired";
        } else {
          invitations.push(invitation);
        }
      }
    }
    return invitations;
  }

  // Get all invitations (pending, accepted, expired) for a parent user
  getAllInvitationsByParent(parentUserId: string): InvitationRecord[] {
    const invitations: InvitationRecord[] = [];
    for (const invitation of this.invitationStore.values()) {
      if (invitation.parentUserId === parentUserId) {
        // Update status if expired
        if (invitation.status === "pending_invitee" && Date.now() > invitation.expiresAt) {
          invitation.status = "expired";
        }
        invitations.push(invitation);
      }
    }
    return invitations.sort((a, b) => b.createdAt - a.createdAt);
  }

  // Check if invitee already has a pending invitation for this instance
  hasPendingInvitation(inviteeEmail: string, instanceUuid: string): boolean {
    for (const invitation of this.invitationStore.values()) {
      if (
        invitation.inviteeEmail.toLowerCase() === inviteeEmail.toLowerCase() &&
        invitation.instanceUuid === instanceUuid &&
        invitation.status === "pending_invitee" &&
        Date.now() <= invitation.expiresAt
      ) {
        return true;
      }
    }
    return false;
  }

  // Mark invitation as accepted
  acceptInvitation(invitationId: string): boolean {
    const invitation = this.invitationStore.get(invitationId);
    if (!invitation) return false;

    if (invitation.status !== "pending_invitee") {
      logger.warn(`[InvitationService] Cannot accept invitation ${invitationId} with status ${invitation.status}`);
      return false;
    }

    if (Date.now() > invitation.expiresAt) {
      invitation.status = "expired";
      logger.warn(`[InvitationService] Invitation ${invitationId} has expired`);
      return false;
    }

    invitation.status = "accepted";
    logger.info(`[InvitationService] Invitation ${invitationId} accepted by ${invitation.inviteeEmail}`);
    return true;
  }

  // Cancel invitation
  cancelInvitation(invitationId: string, parentUserId: string): boolean {
    const invitation = this.invitationStore.get(invitationId);
    if (!invitation) return false;

    if (invitation.parentUserId !== parentUserId) {
      logger.warn(`[InvitationService] User ${parentUserId} cannot cancel invitation ${invitationId}`);
      return false;
    }

    if (invitation.status === "accepted") {
      logger.warn(`[InvitationService] Cannot cancel already accepted invitation ${invitationId}`);
      return false;
    }

    invitation.status = "cancelled";
    logger.info(`[InvitationService] Invitation ${invitationId} cancelled by ${parentUserId}`);
    return true;
  }

  // Cleanup expired invitations and pending OTPs
  private cleanupExpired(): void {
    const now = Date.now();
    let cleaned = 0;

    // Cleanup expired invitations older than 24 hours past expiry
    for (const [id, invitation] of this.invitationStore.entries()) {
      if (now > invitation.expiresAt + 24 * 60 * 60 * 1000) {
        this.invitationStore.delete(id);
        cleaned++;
      }
    }

    // Cleanup pending OTPs older than 10 minutes
    for (const [key, pending] of this.pendingOwnerOtpStore.entries()) {
      if (now > pending.createdAt + 10 * 60 * 1000) {
        this.pendingOwnerOtpStore.delete(key);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      logger.debug(`[InvitationService] Cleaned up ${cleaned} expired records`);
    }
  }
}

export const invitationService = new InvitationService();
