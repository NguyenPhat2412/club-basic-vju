package com.vju.club.service;

import com.vju.club.dto.CertificateDtos.CreateCertificateShareLinkRequest;
import com.vju.club.entity.CertificateShareLink;
import com.vju.club.entity.EventCertificate;
import com.vju.club.entity.User;
import com.vju.club.enums.CertificateStatus;
import com.vju.club.enums.EventParticipantType;
import com.vju.club.error.ApiException;
import com.vju.club.repository.CertificateShareLinkRepository;
import com.vju.club.repository.EventCertificateRepository;
import com.vju.club.repository.UserRepository;
import com.vju.club.security.Actor;
import com.vju.club.service.impl.CertificateShareLinkServiceImpl;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Clock;
import java.time.Instant;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class CertificateShareLinkServiceTest {
    @Mock private CertificateShareLinkRepository shareLinkRepository;
    @Mock private EventCertificateRepository certificateRepository;
    @Mock private UserRepository userRepository;

    private final Clock clock = Clock.fixed(Instant.parse("2026-11-28T10:00:00Z"), ZoneOffset.UTC);
    private CertificateShareLinkServiceImpl service;

    @BeforeEach
    void setUp() {
        service = new CertificateShareLinkServiceImpl(shareLinkRepository, certificateRepository, userRepository, clock);
    }

    @Test
    void createEnforcesActiveLimitAndGeneratesTokenWithExpiry() {
        UUID userId = UUID.randomUUID();
        Actor actor = new Actor(userId);
        User user = new User();
        user.setId(userId);
        user.setFullName("Nguyen Van A");
        user.setStudentCode("22110001");

        when(shareLinkRepository.countActiveByUserId(any(), any())).thenReturn(0L);
        when(userRepository.findById(userId)).thenReturn(Optional.of(user));
        when(shareLinkRepository.saveAndFlush(any())).thenAnswer(inv -> inv.getArgument(0));

        var created = service.create(actor, new CreateCertificateShareLinkRequest("2026-1", "Hồ sơ ĐRL HK1", 30));

        assertThat(created.token()).isNotBlank().hasSizeGreaterThanOrEqualTo(24);
        assertThat(created.academicTerm()).isEqualTo("2026-1");
        assertThat(created.active()).isTrue();
        assertThat(created.expiresAt()).isEqualTo(OffsetDateTime.now(clock).plusDays(30));

        when(shareLinkRepository.countActiveByUserId(any(), any())).thenReturn(10L);
        assertThatThrownBy(() -> service.create(actor, new CreateCertificateShareLinkRequest(null, null, 7)))
                .isInstanceOf(ApiException.class)
                .hasMessageContaining("10");
    }

    @Test
    void resolvePublicProofFiltersByTermAndHidesStudentInfoWhenRevoked() {
        UUID userId = UUID.randomUUID();
        User owner = new User();
        owner.setId(userId);
        owner.setFullName("Tran Thi B");
        owner.setStudentCode("22110002");

        CertificateShareLink link = new CertificateShareLink();
        link.setId(UUID.randomUUID());
        link.setToken("proof-token-xyz");
        link.setUser(owner);
        link.setAcademicTerm("2026-1");
        link.setViewCount(2);
        link.setCreatedAt(OffsetDateTime.now(clock).minusDays(1));
        link.setExpiresAt(OffsetDateTime.now(clock).plusDays(10));

        EventCertificate match = new EventCertificate();
        match.setCertificateCode("VJU-CERT-2026-0001");
        match.setStatus(CertificateStatus.ISSUED);
        match.setAcademicTerm("2026-1");
        match.setClubCode("MONOZUKURI");
        match.setClubName("CLB Monozukuri");
        match.setEventTitle("Workshop Robotics");
        match.setParticipantType(EventParticipantType.CTV);
        match.setVerificationSha256("a".repeat(64));

        EventCertificate otherTerm = new EventCertificate();
        otherTerm.setCertificateCode("VJU-CERT-2025-0009");
        otherTerm.setStatus(CertificateStatus.ISSUED);
        otherTerm.setAcademicTerm("2025-2");
        otherTerm.setParticipantType(EventParticipantType.MEMBER);

        when(shareLinkRepository.findWithUserByToken("proof-token-xyz")).thenReturn(Optional.of(link));
        when(certificateRepository.findByUser_IdOrderByIssuedAtDesc(userId)).thenReturn(List.of(match, otherTerm));

        var proof = service.resolvePublicProof("proof-token-xyz");
        assertThat(proof.active()).isTrue();
        assertThat(proof.studentName()).isEqualTo("Tran Thi B");
        assertThat(proof.studentCode()).isEqualTo("22110002");
        assertThat(proof.issuedCount()).isEqualTo(1L);
        assertThat(proof.items()).hasSize(1);
        assertThat(proof.viewCount()).isEqualTo(3);
        verify(shareLinkRepository).incrementViewCount(any(), any());

        // Revoked link must NOT leak student PII or certificates
        link.setRevokedAt(OffsetDateTime.now(clock).minusMinutes(5));
        var revokedProof = service.resolvePublicProof("proof-token-xyz");
        assertThat(revokedProof.active()).isFalse();
        assertThat(revokedProof.revoked()).isTrue();
        assertThat(revokedProof.studentName()).isNull();
        assertThat(revokedProof.studentCode()).isNull();
        assertThat(revokedProof.items()).isEmpty();
    }

    @Test
    void revokeRejectsUnknownLink() {
        UUID userId = UUID.randomUUID();
        UUID linkId = UUID.randomUUID();
        when(shareLinkRepository.findByIdAndUser_Id(linkId, userId)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.revoke(new Actor(userId), linkId))
                .isInstanceOf(ApiException.class);
        verify(shareLinkRepository, never()).saveAndFlush(any());
    }
}
