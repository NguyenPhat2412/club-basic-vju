package com.vju.club.application;

import com.vju.club.audit.AuditAction;
import com.vju.club.audit.AuditService;
import com.vju.club.application.dto.CreateClubApplicationRequest;
import com.vju.club.application.dto.ReviewClubApplicationRequest;
import com.vju.club.entity.Club;
import com.vju.club.entity.ClubApplication;
import com.vju.club.entity.ClubApplicationStatus;
import com.vju.club.entity.ClubStatus;
import com.vju.club.entity.Membership;
import com.vju.club.entity.User;
import com.vju.club.entity.UserStatus;
import com.vju.club.repository.ClubApplicationRepository;
import com.vju.club.repository.ClubRepository;
import com.vju.club.repository.MembershipRepository;
import com.vju.club.repository.UserRepository;
import com.vju.club.security.Actor;
import com.vju.club.security.PermissionAuthorizationService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.Optional;
import java.util.UUID;

import static com.vju.club.support.ApiErrors.assertApiError;
import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ClubApplicationServiceTest {

    @Mock ClubApplicationRepository applicationRepository;
    @Mock ClubRepository clubRepository;
    @Mock UserRepository userRepository;
    @Mock MembershipRepository membershipRepository;
    @Mock PermissionAuthorizationService authorization;
    @Mock AuditService auditService;

    private final Actor actor = new Actor(UUID.randomUUID());
    private final Clock clock = Clock.fixed(Instant.parse("2026-10-06T00:00:00Z"), ZoneOffset.UTC);
    private ClubApplicationService service;

    @BeforeEach
    void setUp() {
        service = new ClubApplicationService(applicationRepository, clubRepository, userRepository,
                membershipRepository, authorization, auditService, clock);
    }

    private User user(UserStatus status) {
        User user = new User();
        user.setId(actor.id());
        user.setEmail("student@example.test");
        user.setFullName("Student");
        user.setStatus(status);
        return user;
    }

    private Club club(ClubStatus status) {
        Club club = new Club();
        club.setId(UUID.randomUUID());
        club.setCode("VJUA");
        club.setName("VJUA");
        club.setStatus(status);
        return club;
    }

    @Test
    void inactiveApplicantCannotCreateApplication() {
        when(userRepository.findById(actor.id())).thenReturn(Optional.of(user(UserStatus.INACTIVE)));

        assertApiError(() -> service.create(actor, UUID.randomUUID(), new CreateClubApplicationRequest("message")),
                HttpStatus.CONFLICT, "USER_INACTIVE");
        verify(applicationRepository, never()).saveAndFlush(any());
    }

    @Test
    void inactiveClubCannotReceiveApplication() {
        Club club = club(ClubStatus.INACTIVE);
        when(userRepository.findById(actor.id())).thenReturn(Optional.of(user(UserStatus.ACTIVE)));
        when(clubRepository.findById(club.getId())).thenReturn(Optional.of(club));

        assertApiError(() -> service.create(actor, club.getId(), new CreateClubApplicationRequest("message")),
                HttpStatus.CONFLICT, "CLUB_INACTIVE");
        verify(applicationRepository, never()).saveAndFlush(any());
    }

    @Test
    void currentMembershipBlocksNewApplication() {
        Club club = club(ClubStatus.ACTIVE);
        when(userRepository.findById(actor.id())).thenReturn(Optional.of(user(UserStatus.ACTIVE)));
        when(clubRepository.findById(club.getId())).thenReturn(Optional.of(club));
        when(membershipRepository.findFirstByUser_IdAndClub_IdAndStatusNot(actor.id(), club.getId(),
                com.vju.club.entity.MembershipStatus.LEFT)).thenReturn(Optional.of(new Membership()));

        assertApiError(() -> service.create(actor, club.getId(), new CreateClubApplicationRequest("message")),
                HttpStatus.CONFLICT, "ALREADY_CLUB_MEMBER");
    }

    @Test
    void duplicatePendingApplicationIsRejected() {
        User user = user(UserStatus.ACTIVE);
        Club club = club(ClubStatus.ACTIVE);
        ClubApplication pending = new ClubApplication();
        pending.setStatus(ClubApplicationStatus.PENDING);
        when(userRepository.findById(actor.id())).thenReturn(Optional.of(user));
        when(clubRepository.findById(club.getId())).thenReturn(Optional.of(club));
        when(membershipRepository.findFirstByUser_IdAndClub_IdAndStatusNot(actor.id(), club.getId(),
                com.vju.club.entity.MembershipStatus.LEFT)).thenReturn(Optional.empty());
        when(applicationRepository.findByApplicant_IdAndClub_IdAndStatus(actor.id(), club.getId(),
                ClubApplicationStatus.PENDING)).thenReturn(Optional.of(pending));

        assertApiError(() -> service.create(actor, club.getId(), new CreateClubApplicationRequest("message")),
                HttpStatus.CONFLICT, "APPLICATION_ALREADY_PENDING");
    }

    @Test
    void createStartsPendingAndAuditsOwnerAndClub() {
        User user = user(UserStatus.ACTIVE);
        Club club = club(ClubStatus.ACTIVE);
        when(userRepository.findById(actor.id())).thenReturn(Optional.of(user));
        when(clubRepository.findById(club.getId())).thenReturn(Optional.of(club));
        when(membershipRepository.findFirstByUser_IdAndClub_IdAndStatusNot(actor.id(), club.getId(),
                com.vju.club.entity.MembershipStatus.LEFT)).thenReturn(Optional.empty());
        when(applicationRepository.findByApplicant_IdAndClub_IdAndStatus(actor.id(), club.getId(),
                ClubApplicationStatus.PENDING)).thenReturn(Optional.empty());
        when(applicationRepository.saveAndFlush(any(ClubApplication.class))).thenAnswer(invocation -> {
            ClubApplication saved = invocation.getArgument(0);
            saved.setId(UUID.randomUUID());
            return saved;
        });

        var response = service.create(actor, club.getId(), new CreateClubApplicationRequest("  message  "));

        assertThat(response.status()).isEqualTo(ClubApplicationStatus.PENDING.name());
        assertThat(response.message()).isEqualTo("message");
        verify(auditService).record(eq(actor.id()), eq(AuditAction.CLUB_APPLICATION_CREATED),
                eq(response.id()), eq(club.getId()), eq(null), any());
    }

    @Test
    void ownerCannotSeeAnotherUsersApplication() {
        UUID applicationId = UUID.randomUUID();
        when(applicationRepository.findByIdAndApplicant_Id(applicationId, actor.id())).thenReturn(Optional.empty());

        assertApiError(() -> service.getMine(actor, applicationId), HttpStatus.NOT_FOUND, "CLUB_APPLICATION_NOT_FOUND");
    }

    @Test
    void pendingOwnerCanCancelAndCancellationIsAudited() {
        ClubApplication application = new ClubApplication();
        application.setId(UUID.randomUUID());
        application.setApplicant(user(UserStatus.ACTIVE));
        application.setClub(club(ClubStatus.ACTIVE));
        application.setStatus(ClubApplicationStatus.PENDING);
        when(applicationRepository.findByIdAndApplicant_Id(application.getId(), actor.id()))
                .thenReturn(Optional.of(application));
        when(applicationRepository.saveAndFlush(application)).thenReturn(application);

        var response = service.cancel(actor, application.getId());

        assertThat(response.status()).isEqualTo(ClubApplicationStatus.CANCELLED.name());
        assertThat(application.getCancelledAt()).isEqualTo(java.time.OffsetDateTime.now(clock));
        verify(auditService).record(eq(actor.id()), eq(AuditAction.CLUB_APPLICATION_CANCELLED),
                eq(application.getId()), eq(application.getClub().getId()), any(), any());
    }

    @Test
    void terminalOwnerApplicationCannotBeCancelled() {
        ClubApplication application = new ClubApplication();
        application.setId(UUID.randomUUID());
        application.setApplicant(user(UserStatus.ACTIVE));
        application.setClub(club(ClubStatus.ACTIVE));
        application.setStatus(ClubApplicationStatus.APPROVED);
        when(applicationRepository.findByIdAndApplicant_Id(application.getId(), actor.id()))
                .thenReturn(Optional.of(application));

        assertApiError(() -> service.cancel(actor, application.getId()), HttpStatus.CONFLICT,
                "APPLICATION_CANNOT_BE_CANCELLED");
        verify(applicationRepository, never()).saveAndFlush(any());
    }

    private ClubApplication pendingApplication(UUID clubId) {
        ClubApplication application = new ClubApplication();
        application.setId(UUID.randomUUID());
        application.setApplicant(user(UserStatus.ACTIVE));
        Club club = club(ClubStatus.ACTIVE);
        club.setId(clubId);
        application.setClub(club);
        application.setMessage("message");
        application.setStatus(ClubApplicationStatus.PENDING);
        return application;
    }

    @Test
    void reviewerWithoutClubPermissionCannotApprove() {
        UUID clubId = UUID.randomUUID();
        when(authorization.hasPermission(actor, "application.approve", clubId, null)).thenReturn(false);
        when(authorization.hasPermission(actor, "application.review", clubId, null)).thenReturn(false);

        assertApiError(() -> service.approve(actor, clubId, UUID.randomUUID(), new ReviewClubApplicationRequest("ok")),
                HttpStatus.FORBIDDEN, "PERMISSION_DENIED");
        verify(applicationRepository, never()).findForReview(any(), any());
    }

    @Test
    void approveCreatesMembershipAndAuditsBothResources() {
        UUID clubId = UUID.randomUUID();
        ClubApplication application = pendingApplication(clubId);
        when(authorization.hasPermission(actor, "application.approve", clubId, null)).thenReturn(true);
        when(applicationRepository.findForReview(application.getId(), clubId)).thenReturn(Optional.of(application));
        when(membershipRepository.findFirstByUser_IdAndClub_IdAndStatusNot(
                actor.id(), clubId, com.vju.club.entity.MembershipStatus.LEFT)).thenReturn(Optional.empty());
        when(userRepository.findById(actor.id())).thenReturn(Optional.of(user(UserStatus.ACTIVE)));
        when(membershipRepository.saveAndFlush(any(Membership.class))).thenAnswer(invocation -> {
            Membership membership = invocation.getArgument(0);
            membership.setId(UUID.randomUUID());
            return membership;
        });
        when(applicationRepository.saveAndFlush(application)).thenReturn(application);

        var response = service.approve(actor, clubId, application.getId(), new ReviewClubApplicationRequest(" Approved "));

        assertThat(response.status()).isEqualTo(ClubApplicationStatus.APPROVED.name());
        assertThat(application.getReviewedBy().getId()).isEqualTo(actor.id());
        assertThat(application.getReviewNote()).isEqualTo("Approved");
        verify(auditService).record(eq(actor.id()), eq(AuditAction.MEMBERSHIP_CREATED), any(), eq(clubId), eq(null), any());
        verify(auditService).record(eq(actor.id()), eq(AuditAction.CLUB_APPLICATION_APPROVED),
                eq(application.getId()), eq(clubId), any(), any());
    }

    @Test
    void rejectChangesStatusWithoutCreatingMembership() {
        UUID clubId = UUID.randomUUID();
        ClubApplication application = pendingApplication(clubId);
        when(authorization.hasPermission(actor, "application.reject", clubId, null)).thenReturn(true);
        when(applicationRepository.findForReview(application.getId(), clubId)).thenReturn(Optional.of(application));
        when(userRepository.findById(actor.id())).thenReturn(Optional.of(user(UserStatus.ACTIVE)));
        when(applicationRepository.saveAndFlush(application)).thenReturn(application);

        var response = service.reject(actor, clubId, application.getId(), new ReviewClubApplicationRequest("No"));

        assertThat(response.status()).isEqualTo(ClubApplicationStatus.REJECTED.name());
        verify(membershipRepository, never()).saveAndFlush(any());
        verify(auditService).record(eq(actor.id()), eq(AuditAction.CLUB_APPLICATION_REJECTED),
                eq(application.getId()), eq(clubId), any(), any());
    }

    @Test
    void reviewedApplicationCannotBeProcessedAgain() {
        UUID clubId = UUID.randomUUID();
        ClubApplication application = pendingApplication(clubId);
        application.setStatus(ClubApplicationStatus.APPROVED);
        when(authorization.hasPermission(actor, "application.reject", clubId, null)).thenReturn(true);
        when(applicationRepository.findForReview(application.getId(), clubId)).thenReturn(Optional.of(application));

        assertApiError(() -> service.reject(actor, clubId, application.getId(), new ReviewClubApplicationRequest(null)),
                HttpStatus.CONFLICT, "APPLICATION_ALREADY_REVIEWED");
        verify(membershipRepository, never()).saveAndFlush(any());
    }

    @Test
    void membershipFailureLeavesApplicationPendingBeforeTransactionCommit() {
        UUID clubId = UUID.randomUUID();
        ClubApplication application = pendingApplication(clubId);
        when(authorization.hasPermission(actor, "application.approve", clubId, null)).thenReturn(true);
        when(applicationRepository.findForReview(application.getId(), clubId)).thenReturn(Optional.of(application));
        when(membershipRepository.findFirstByUser_IdAndClub_IdAndStatusNot(
                actor.id(), clubId, com.vju.club.entity.MembershipStatus.LEFT)).thenReturn(Optional.empty());
        when(userRepository.findById(actor.id())).thenReturn(Optional.of(user(UserStatus.ACTIVE)));
        doThrow(new IllegalStateException("membership insert failed"))
                .when(membershipRepository).saveAndFlush(any(Membership.class));

        org.assertj.core.api.Assertions.assertThatThrownBy(() -> service.approve(
                        actor, clubId, application.getId(), new ReviewClubApplicationRequest(null)))
                .isInstanceOf(IllegalStateException.class);
        assertThat(application.getStatus()).isEqualTo(ClubApplicationStatus.PENDING);
        verify(applicationRepository, never()).saveAndFlush(any());
    }
}
