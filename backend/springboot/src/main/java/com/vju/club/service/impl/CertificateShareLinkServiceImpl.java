package com.vju.club.service.impl;

import com.vju.club.dto.CertificateDtos.CertificateShareLinkListResponse;
import com.vju.club.dto.CertificateDtos.CertificateShareLinkResponse;
import com.vju.club.dto.CertificateDtos.CreateCertificateShareLinkRequest;
import com.vju.club.dto.CertificateDtos.PublicCertificateProofItem;
import com.vju.club.dto.CertificateDtos.PublicCertificateProofResponse;
import com.vju.club.entity.CertificateShareLink;
import com.vju.club.entity.EventCertificate;
import com.vju.club.entity.User;
import com.vju.club.enums.CertificateStatus;
import com.vju.club.error.ApiException;
import com.vju.club.repository.CertificateShareLinkRepository;
import com.vju.club.repository.EventCertificateRepository;
import com.vju.club.repository.UserRepository;
import com.vju.club.security.Actor;
import com.vju.club.service.CertificateShareLinkService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.time.Clock;
import java.time.OffsetDateTime;
import java.util.Base64;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class CertificateShareLinkServiceImpl implements CertificateShareLinkService {
    private static final int MAX_ACTIVE_LINKS_PER_USER = 10;
    private static final SecureRandom SECURE_RANDOM = new SecureRandom();

    private final CertificateShareLinkRepository shareLinkRepository;
    private final EventCertificateRepository certificateRepository;
    private final UserRepository userRepository;
    private final Clock clock;

    @Override
    @Transactional(readOnly = true)
    public CertificateShareLinkListResponse listMine(Actor actor) {
        OffsetDateTime now = OffsetDateTime.now(clock);
        List<CertificateShareLinkResponse> items = shareLinkRepository
                .findByUser_IdOrderByCreatedAtDesc(actor.id())
                .stream()
                .map(link -> toResponse(link, now))
                .toList();
        return new CertificateShareLinkListResponse(items, items.size());
    }

    @Override
    @Transactional
    public CertificateShareLinkResponse create(Actor actor, CreateCertificateShareLinkRequest request) {
        OffsetDateTime now = OffsetDateTime.now(clock);
        long activeCount = shareLinkRepository.countActiveByUserId(actor.id(), now);
        if (activeCount >= MAX_ACTIVE_LINKS_PER_USER) {
            throw new ApiException(HttpStatus.CONFLICT, "SHARE_LINK_LIMIT_REACHED",
                    "Bạn chỉ có thể giữ tối đa " + MAX_ACTIVE_LINKS_PER_USER + " liên kết minh chứng đang hoạt động. Vui lòng thu hồi bớt liên kết cũ.");
        }

        User user = userRepository.findById(actor.id())
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "USER_NOT_FOUND", "User not found"));

        String term = request == null ? null : blankToNull(request.academicTerm());
        String title = request == null ? null : blankToNull(request.title());
        OffsetDateTime expiresAt = (request != null && request.expiresInDays() != null)
                ? now.plusDays(request.expiresInDays())
                : null;

        CertificateShareLink link = new CertificateShareLink();
        link.setId(UUID.randomUUID());
        link.setToken(generateToken());
        link.setUser(user);
        link.setAcademicTerm(term);
        link.setTitle(title);
        link.setExpiresAt(expiresAt);
        link.setViewCount(0);
        link.setCreatedAt(now);

        CertificateShareLink saved = shareLinkRepository.saveAndFlush(link);
        return toResponse(saved, now);
    }

    @Override
    @Transactional
    public void revoke(Actor actor, UUID linkId) {
        CertificateShareLink link = shareLinkRepository.findByIdAndUser_Id(linkId, actor.id())
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "SHARE_LINK_NOT_FOUND", "Share link not found"));
        if (link.getRevokedAt() == null) {
            link.setRevokedAt(OffsetDateTime.now(clock));
            shareLinkRepository.saveAndFlush(link);
        }
    }

    @Override
    @Transactional
    public PublicCertificateProofResponse resolvePublicProof(String token) {
        if (token == null || token.isBlank()) {
            throw new ApiException(HttpStatus.NOT_FOUND, "SHARE_LINK_NOT_FOUND", "Share link not found");
        }
        String normalized = token.strip();
        CertificateShareLink link = shareLinkRepository.findWithUserByToken(normalized)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "SHARE_LINK_NOT_FOUND", "Share link not found"));

        OffsetDateTime now = OffsetDateTime.now(clock);
        boolean revoked = link.getRevokedAt() != null;
        boolean expired = link.getExpiresAt() != null && !link.getExpiresAt().isAfter(now);
        boolean active = !revoked && !expired;

        int effectiveViews = link.getViewCount();
        if (!active) {
            return new PublicCertificateProofResponse(
                    link.getToken(),
                    link.getTitle(),
                    link.getAcademicTerm(),
                    false,
                    revoked,
                    expired,
                    link.getCreatedAt(),
                    link.getExpiresAt(),
                    effectiveViews,
                    now,
                    null,
                    null,
                    0,
                    0,
                    List.of()
            );
        }

        shareLinkRepository.incrementViewCount(link.getId(), now);
        effectiveViews += 1;

        User owner = link.getUser();
        String termFilter = link.getAcademicTerm();
        List<EventCertificate> certificates = certificateRepository.findByUser_IdOrderByIssuedAtDesc(owner.getId())
                .stream()
                .filter(c -> termFilter == null
                        || (c.getAcademicTerm() != null && c.getAcademicTerm().strip().equalsIgnoreCase(termFilter)))
                .toList();

        long issuedCount = certificates.stream().filter(c -> c.getStatus() == CertificateStatus.ISSUED).count();
        long revokedCount = certificates.stream().filter(c -> c.getStatus() == CertificateStatus.REVOKED).count();

        List<PublicCertificateProofItem> items = certificates.stream()
                .map(c -> new PublicCertificateProofItem(
                        c.getCertificateCode(),
                        c.getStatus().name(),
                        c.getClubCode(),
                        c.getClubName(),
                        c.getEventTitle(),
                        c.getEventStartTime(),
                        c.getAcademicTerm(),
                        c.getParticipantType().name(),
                        c.getEventRole(),
                        c.getIssuedAt(),
                        c.getAcknowledgedAt(),
                        c.getRevokedAt(),
                        c.getRevocationReason(),
                        c.getVerificationSha256(),
                        c.getTemplateImageUrl()
                ))
                .toList();

        return new PublicCertificateProofResponse(
                link.getToken(),
                link.getTitle(),
                link.getAcademicTerm(),
                true,
                false,
                false,
                link.getCreatedAt(),
                link.getExpiresAt(),
                effectiveViews,
                now,
                owner.getFullName(),
                owner.getStudentCode(),
                issuedCount,
                revokedCount,
                items
        );
    }

    private static CertificateShareLinkResponse toResponse(CertificateShareLink link, OffsetDateTime now) {
        boolean active = link.getRevokedAt() == null
                && (link.getExpiresAt() == null || link.getExpiresAt().isAfter(now));
        return new CertificateShareLinkResponse(
                link.getId(),
                link.getToken(),
                link.getAcademicTerm(),
                link.getTitle(),
                link.getExpiresAt(),
                link.getRevokedAt(),
                active,
                link.getViewCount(),
                link.getLastViewedAt(),
                link.getCreatedAt()
        );
    }

    private static String generateToken() {
        byte[] bytes = new byte[24];
        SECURE_RANDOM.nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }

    private static String blankToNull(String value) {
        if (value == null) return null;
        String trimmed = value.strip();
        return trimmed.isEmpty() ? null : trimmed;
    }
}
