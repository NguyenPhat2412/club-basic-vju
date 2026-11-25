import type { EventParticipantRole } from "@/types/event/event.types";

export type CertificateStatus = "ISSUED" | "REVOKED";

export type EventCertificate = {
  id: string;
  certificateCode: string;
  eventId: string;
  clubId: string;
  userId: string;
  participantType: EventParticipantRole | string;
  eventRole?: string | null;
  academicTerm?: string | null;
  recipientName: string;
  studentCode?: string | null;
  clubCode: string;
  clubName: string;
  eventTitle: string;
  eventStartTime: string;
  status: CertificateStatus;
  verificationSha256: string;
  issuedBy: string;
  issuedAt: string;
  revokedBy?: string | null;
  revokedAt?: string | null;
  revocationReason?: string | null;
  templateImageUrl?: string | null;
  acknowledgedAt?: string | null;
  remindedAt?: string | null;
  reminderCount?: number;
};

export type IssueCertificatesResponse = {
  eventId: string;
  issuedCount: number;
  totalCertificates: number;
  items: EventCertificate[];
};

export type RemindCertificatesRequest = {
  certificateIds?: string[];
  customMessage?: string;
};

export type RemindCertificatesResponse = {
  eventId: string;
  remindedCount: number;
  emailedCount: number;
  smtpConfigured: boolean;
  items: EventCertificate[];
};

export type CertificateTemplateResponse = {
  eventId: string;
  certificateTemplateUrl?: string | null;
};

export type ClubCertificateBreakdownItem = {
  clubId: string;
  clubCode: string;
  clubName: string;
  issuedCount: number;
  acknowledgedCount: number;
  pendingAcknowledgeCount: number;
  revokedCount: number;
  acknowledgementRate: number;
};

export type CertificateStatsSummary = {
  totalCertificates: number;
  issuedCount: number;
  revokedCount: number;
  acknowledgedCount: number;
  pendingAcknowledgeCount: number;
  acknowledgementRate: number;
  clubBreakdown: ClubCertificateBreakdownItem[];
};

export type CertificateManagementQuery = {
  clubId?: string;
  academicTerm?: string;
  status?: CertificateStatus | "";
  acknowledged?: boolean;
  search?: string;
  offset?: number;
  limit?: number;
};

export type CertificateManagementResponse = {
  summary: CertificateStatsSummary;
  items: EventCertificate[];
  total: number;
};

export type PublicCertificateVerification = {
  certificateCode: string;
  status: CertificateStatus;
  valid: boolean;
  recipientName: string;
  studentCode?: string | null;
  clubCode: string;
  clubName: string;
  eventTitle: string;
  eventStartTime: string;
  academicTerm?: string | null;
  participantType: EventParticipantRole | string;
  eventRole?: string | null;
  issuedAt: string;
  revokedAt?: string | null;
  revocationReason?: string | null;
  verificationSha256: string;
  templateImageUrl?: string | null;
  acknowledgedAt?: string | null;
};
