package com.vju.club.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

public final class CertificateDtos {
    private CertificateDtos() {
    }

    public record RevokeCertificateRequest(
            @NotBlank @Size(max = 500) String reason
    ) {
    }

    public record EventCertificateResponse(
            UUID id,
            String certificateCode,
            UUID eventId,
            UUID clubId,
            UUID userId,
            String participantType,
            String eventRole,
            String academicTerm,
            String recipientName,
            String studentCode,
            String clubCode,
            String clubName,
            String eventTitle,
            OffsetDateTime eventStartTime,
            String status,
            String verificationSha256,
            UUID issuedBy,
            OffsetDateTime issuedAt,
            UUID revokedBy,
            OffsetDateTime revokedAt,
            String revocationReason,
            String templateImageUrl,
            OffsetDateTime acknowledgedAt,
            OffsetDateTime remindedAt,
            int reminderCount
    ) {
    }

    public record IssueCertificatesResponse(
            UUID eventId,
            int issuedCount,
            long totalCertificates,
            List<EventCertificateResponse> items
    ) {
    }

    public record CertificateListResponse(
            List<EventCertificateResponse> items,
            long total
    ) {
    }

    public record PublicCertificateVerificationResponse(
            String certificateCode,
            String status,
            boolean valid,
            String recipientName,
            String studentCode,
            String clubCode,
            String clubName,
            String eventTitle,
            OffsetDateTime eventStartTime,
            String academicTerm,
            String participantType,
            String eventRole,
            OffsetDateTime issuedAt,
            OffsetDateTime revokedAt,
            String revocationReason,
            String verificationSha256,
            String templateImageUrl,
            OffsetDateTime acknowledgedAt
    ) {
    }

    public record RemindCertificatesRequest(
            List<UUID> certificateIds,
            @Size(max = 500) String customMessage
    ) {
    }

    public record RemindCertificatesResponse(
            UUID eventId,
            int remindedCount,
            int emailedCount,
            boolean smtpConfigured,
            List<EventCertificateResponse> items
    ) {
    }

    public record CertificateTemplateResponse(
            UUID eventId,
            String certificateTemplateUrl
    ) {
    }

    public record ClubCertificateBreakdownItem(
            UUID clubId,
            String clubCode,
            String clubName,
            long issuedCount,
            long acknowledgedCount,
            long pendingAcknowledgeCount,
            long revokedCount,
            int acknowledgementRate
    ) {
    }

    public record CertificateStatsSummary(
            long totalCertificates,
            long issuedCount,
            long revokedCount,
            long acknowledgedCount,
            long pendingAcknowledgeCount,
            int acknowledgementRate,
            List<ClubCertificateBreakdownItem> clubBreakdown
    ) {
    }

    public record CertificateManagementResponse(
            CertificateStatsSummary summary,
            List<EventCertificateResponse> items,
            long total
    ) {
    }

    public record CreateCertificateShareLinkRequest(
            @Size(max = 32) String academicTerm,
            @Size(max = 160) String title,
            @Min(1) @Max(365) Integer expiresInDays
    ) {
    }

    public record CertificateShareLinkResponse(
            UUID id,
            String token,
            String academicTerm,
            String title,
            OffsetDateTime expiresAt,
            OffsetDateTime revokedAt,
            boolean active,
            int viewCount,
            OffsetDateTime lastViewedAt,
            OffsetDateTime createdAt
    ) {
    }

    public record CertificateShareLinkListResponse(
            List<CertificateShareLinkResponse> items,
            long total
    ) {
    }

    public record PublicCertificateProofItem(
            String certificateCode,
            String status,
            String clubCode,
            String clubName,
            String eventTitle,
            OffsetDateTime eventStartTime,
            String academicTerm,
            String participantType,
            String eventRole,
            OffsetDateTime issuedAt,
            OffsetDateTime acknowledgedAt,
            OffsetDateTime revokedAt,
            String revocationReason,
            String verificationSha256,
            String templateImageUrl
    ) {
    }

    public record PublicCertificateProofResponse(
            String token,
            String title,
            String academicTerm,
            boolean active,
            boolean revoked,
            boolean expired,
            OffsetDateTime createdAt,
            OffsetDateTime expiresAt,
            int viewCount,
            OffsetDateTime verifiedAt,
            String studentName,
            String studentCode,
            long issuedCount,
            long revokedCount,
            List<PublicCertificateProofItem> items
    ) {
    }
}
