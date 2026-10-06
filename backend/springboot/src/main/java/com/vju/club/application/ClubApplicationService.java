package com.vju.club.application;

import com.vju.club.application.dto.ClubApplicationResponse;
import com.vju.club.application.dto.ClubApplicationSummaryResponse;
import com.vju.club.application.dto.CreateClubApplicationRequest;
import com.vju.club.audit.AuditAction;
import com.vju.club.audit.AuditService;
import com.vju.club.common.OffsetLimitRequest;
import com.vju.club.common.dto.PageResponse;
import com.vju.club.entity.Club;
import com.vju.club.entity.ClubApplication;
import com.vju.club.entity.ClubApplicationStatus;
import com.vju.club.entity.ClubStatus;
import com.vju.club.entity.MembershipStatus;
import com.vju.club.entity.User;
import com.vju.club.entity.UserStatus;
import com.vju.club.error.ApiException;
import com.vju.club.repository.ClubApplicationRepository;
import com.vju.club.repository.ClubRepository;
import com.vju.club.repository.MembershipRepository;
import com.vju.club.repository.UserRepository;
import com.vju.club.security.Actor;
import com.vju.club.security.PermissionAuthorizationService;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
public class ClubApplicationService {

    private final ClubApplicationRepository applicationRepository;
    private final ClubRepository clubRepository;
    private final UserRepository userRepository;
    private final MembershipRepository membershipRepository;
    private final PermissionAuthorizationService authorizationService;
    private final AuditService auditService;
    private final Clock clock;

    public ClubApplicationService(ClubApplicationRepository applicationRepository,
                                  ClubRepository clubRepository,
                                  UserRepository userRepository,
                                  MembershipRepository membershipRepository,
                                  PermissionAuthorizationService authorizationService,
                                  AuditService auditService,
                                  Clock clock) {
        this.applicationRepository = applicationRepository;
        this.clubRepository = clubRepository;
        this.userRepository = userRepository;
        this.membershipRepository = membershipRepository;
        this.authorizationService = authorizationService;
        this.auditService = auditService;
        this.clock = clock;
    }

    @Transactional
    public ClubApplicationResponse create(Actor actor, UUID clubId, CreateClubApplicationRequest request) {
        User applicant = findUser(actor.id());
        if (applicant.getStatus() != UserStatus.ACTIVE) {
            throw conflict("USER_INACTIVE", "User account is inactive");
        }
        Club club = clubRepository.findById(clubId)
                .orElseThrow(() -> notFound("CLUB_NOT_FOUND", "Club not found"));
        if (club.getStatus() != ClubStatus.ACTIVE) {
            throw conflict("CLUB_INACTIVE", "Club is inactive");
        }
        if (membershipRepository.findFirstByUser_IdAndClub_IdAndStatusNot(
                actor.id(), clubId, MembershipStatus.LEFT).isPresent()) {
            throw conflict("ALREADY_CLUB_MEMBER", "User already has a membership in this club");
        }
        if (applicationRepository.findByApplicant_IdAndClub_IdAndStatus(
                actor.id(), clubId, ClubApplicationStatus.PENDING).isPresent()) {
            throw conflict("APPLICATION_ALREADY_PENDING", "An application is already pending");
        }

        ClubApplication application = new ClubApplication();
        application.setApplicant(applicant);
        application.setClub(club);
        application.setMessage(request.message().trim());
        application.setStatus(ClubApplicationStatus.PENDING);
        ClubApplication saved = applicationRepository.saveAndFlush(application);
        auditService.record(actor.id(), AuditAction.CLUB_APPLICATION_CREATED, saved.getId(), clubId, null,
                Map.of("applicantId", actor.id(), "clubId", clubId, "status", saved.getStatus()));
        return ClubApplicationResponse.from(saved);
    }

    @Transactional(readOnly = true)
    public PageResponse<ClubApplicationSummaryResponse> listMine(
            Actor actor, ClubApplicationStatus status, UUID clubId, int offset, int limit) {
        OffsetLimitRequest page = new OffsetLimitRequest(offset, limit);
        List<ClubApplicationSummaryResponse> items = applicationRepository
                .findPageByApplicant(actor.id(), status, clubId, page).stream()
                .map(ClubApplicationSummaryResponse::from).toList();
        return new PageResponse<>(items, applicationRepository.countByApplicant(actor.id(), status, clubId), offset, limit);
    }

    @Transactional(readOnly = true)
    public ClubApplicationResponse getMine(Actor actor, UUID applicationId) {
        return ClubApplicationResponse.from(applicationRepository.findByIdAndApplicant_Id(applicationId, actor.id())
                .orElseThrow(() -> notFound("CLUB_APPLICATION_NOT_FOUND", "Club application not found")));
    }

    @Transactional
    public ClubApplicationResponse cancel(Actor actor, UUID applicationId) {
        ClubApplication application = applicationRepository.findByIdAndApplicant_Id(applicationId, actor.id())
                .orElseThrow(() -> notFound("CLUB_APPLICATION_NOT_FOUND", "Club application not found"));
        if (application.getStatus() != ClubApplicationStatus.PENDING) {
            throw conflict("APPLICATION_CANNOT_BE_CANCELLED", "Only pending applications can be cancelled");
        }
        application.setStatus(ClubApplicationStatus.CANCELLED);
        application.setCancelledAt(now());
        ClubApplication saved = applicationRepository.saveAndFlush(application);
        auditService.record(actor.id(), AuditAction.CLUB_APPLICATION_CANCELLED, saved.getId(), saved.getClub().getId(),
                Map.of("status", ClubApplicationStatus.PENDING), Map.of("status", saved.getStatus()));
        return ClubApplicationResponse.from(saved);
    }

    @Transactional(readOnly = true)
    public PageResponse<ClubApplicationResponse> listForClub(Actor actor, UUID clubId,
                                                              ClubApplicationStatus status, String search,
                                                              OffsetDateTime createdFrom, OffsetDateTime createdTo,
                                                              int offset, int limit) {
        requireAnyPermission(actor, clubId, "application.view", "application.view_detail");
        String normalizedSearch = search == null || search.isBlank()
                ? null : "%" + search.trim().toLowerCase(java.util.Locale.ROOT) + "%";
        OffsetLimitRequest page = new OffsetLimitRequest(offset, limit);
        List<ClubApplicationResponse> items = applicationRepository.findPageByClub(
                        clubId, status, normalizedSearch, createdFrom, createdTo, page).stream()
                .map(ClubApplicationResponse::from).toList();
        long total = applicationRepository.countByClub(clubId, status, normalizedSearch, createdFrom, createdTo);
        return new PageResponse<>(items, total, offset, limit);
    }

    @Transactional(readOnly = true)
    public ClubApplicationResponse getForClub(Actor actor, UUID clubId, UUID applicationId) {
        requireAnyPermission(actor, clubId, "application.view", "application.view_detail");
        return ClubApplicationResponse.from(applicationRepository.findByIdAndClub_Id(applicationId, clubId)
                .orElseThrow(() -> notFound("CLUB_APPLICATION_NOT_FOUND", "Club application not found")));
    }

    @Transactional
    public ClubApplicationResponse approve(Actor actor, UUID clubId, UUID applicationId,
                                           com.vju.club.application.dto.ReviewClubApplicationRequest request) {
        requireAnyPermission(actor, clubId, "application.approve", "application.review");
        ClubApplication application = applicationRepository.findForReview(applicationId, clubId)
                .orElseThrow(() -> notFound("CLUB_APPLICATION_NOT_FOUND", "Club application not found"));
        ensurePending(application);
        if (membershipRepository.findFirstByUser_IdAndClub_IdAndStatusNot(
                application.getApplicant().getId(), clubId, MembershipStatus.LEFT).isPresent()) {
            throw conflict("DUPLICATE_MEMBERSHIP", "User already has a current membership in this club");
        }

        User reviewer = findUser(actor.id());
        com.vju.club.entity.Membership membership = new com.vju.club.entity.Membership();
        membership.setUser(application.getApplicant());
        membership.setClub(application.getClub());
        membership.setStatus(MembershipStatus.ACTIVE);
        membership.setJoinedAt(now());
        com.vju.club.entity.Membership savedMembership = membershipRepository.saveAndFlush(membership);

        application.setStatus(ClubApplicationStatus.APPROVED);
        application.setReviewedBy(reviewer);
        application.setReviewedAt(now());
        application.setReviewNote(normalizeNote(request));
        ClubApplication saved = applicationRepository.saveAndFlush(application);
        auditService.record(actor.id(), AuditAction.MEMBERSHIP_CREATED, savedMembership.getId(), clubId, null,
                Map.of("userId", application.getApplicant().getId(), "status", MembershipStatus.ACTIVE));
        auditService.record(actor.id(), AuditAction.CLUB_APPLICATION_APPROVED, saved.getId(), clubId,
                Map.of("status", ClubApplicationStatus.PENDING), Map.of("status", saved.getStatus(),
                        "membershipId", savedMembership.getId()));
        return ClubApplicationResponse.from(saved);
    }

    @Transactional
    public ClubApplicationResponse reject(Actor actor, UUID clubId, UUID applicationId,
                                          com.vju.club.application.dto.ReviewClubApplicationRequest request) {
        requireAnyPermission(actor, clubId, "application.reject", "application.review");
        ClubApplication application = applicationRepository.findForReview(applicationId, clubId)
                .orElseThrow(() -> notFound("CLUB_APPLICATION_NOT_FOUND", "Club application not found"));
        ensurePending(application);
        User reviewer = findUser(actor.id());
        application.setStatus(ClubApplicationStatus.REJECTED);
        application.setReviewedBy(reviewer);
        application.setReviewedAt(now());
        application.setReviewNote(normalizeNote(request));
        ClubApplication saved = applicationRepository.saveAndFlush(application);
        auditService.record(actor.id(), AuditAction.CLUB_APPLICATION_REJECTED, saved.getId(), clubId,
                Map.of("status", ClubApplicationStatus.PENDING), Map.of("status", saved.getStatus()));
        return ClubApplicationResponse.from(saved);
    }

    private User findUser(UUID id) {
        return userRepository.findById(id).orElseThrow(() -> notFound("USER_NOT_FOUND", "User not found"));
    }

    private OffsetDateTime now() {
        return OffsetDateTime.now(clock).withOffsetSameInstant(ZoneOffset.UTC);
    }

    private void requireAnyPermission(Actor actor, UUID clubId, String first, String second) {
        if (!authorizationService.hasPermission(actor, first, clubId, null)
                && !authorizationService.hasPermission(actor, second, clubId, null)) {
            throw new ApiException(HttpStatus.FORBIDDEN, "PERMISSION_DENIED", "Permission denied");
        }
    }

    private static void ensurePending(ClubApplication application) {
        if (application.getStatus() != ClubApplicationStatus.PENDING) {
            throw conflict("APPLICATION_ALREADY_REVIEWED", "Application has already been reviewed");
        }
    }

    private static String normalizeNote(com.vju.club.application.dto.ReviewClubApplicationRequest request) {
        return request == null || request.reviewNote() == null || request.reviewNote().isBlank()
                ? null : request.reviewNote().trim();
    }

    private static ApiException notFound(String code, String message) {
        return new ApiException(HttpStatus.NOT_FOUND, code, message);
    }

    private static ApiException conflict(String code, String message) {
        return new ApiException(HttpStatus.CONFLICT, code, message);
    }
}
