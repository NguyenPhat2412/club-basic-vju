package com.vju.club.modules.clubapplication.service.impl;

import com.vju.club.modules.membership.entity.Membership;
import com.vju.club.modules.permission.entity.Permission;

import com.vju.club.modules.clubapplication.service.ClubApplicationService;

import com.vju.club.modules.clubapplication.dto.response.ClubApplicationResponse;
import com.vju.club.modules.clubapplication.dto.response.ClubApplicationSummaryResponse;
import com.vju.club.modules.clubapplication.dto.request.CreateClubApplicationRequest;
import com.vju.club.modules.audit.enums.AuditAction;
import com.vju.club.modules.audit.service.AuditService;
import com.vju.club.common.OffsetLimitRequest;
import com.vju.club.common.dto.PageResponse;
import com.vju.club.modules.club.entity.Club;
import com.vju.club.modules.clubapplication.entity.ClubApplication;
import com.vju.club.modules.clubapplication.enums.ClubApplicationStatus;
import com.vju.club.modules.club.enums.ClubStatus;
import com.vju.club.modules.membership.enums.MembershipStatus;
import com.vju.club.modules.user.entity.User;
import com.vju.club.modules.user.enums.UserStatus;
import com.vju.club.error.ApiException;
import com.vju.club.modules.clubapplication.repository.ClubApplicationRepository;
import com.vju.club.modules.club.repository.ClubRepository;
import com.vju.club.modules.membership.repository.MembershipRepository;
import com.vju.club.modules.user.repository.UserRepository;
import com.vju.club.security.Actor;
import com.vju.club.security.PermissionAuthorizationService;
import com.vju.club.modules.notification.service.NotificationService;
import com.vju.club.modules.clubapplication.specification.ClubApplicationSpecifications;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
public class ClubApplicationServiceImpl implements ClubApplicationService {

    private static final OffsetDateTime MIN_CREATED_AT = OffsetDateTime.parse("0001-01-01T00:00:00Z");
    private static final OffsetDateTime MAX_CREATED_AT = OffsetDateTime.parse("9999-12-31T23:59:59.999999Z");

    private final ClubApplicationRepository applicationRepository;
    private final ClubRepository clubRepository;
    private final UserRepository userRepository;
    private final MembershipRepository membershipRepository;
    private final PermissionAuthorizationService authorizationService;
    private final AuditService auditService;
    private final Clock clock;
    private final NotificationService notificationService;

    public ClubApplicationServiceImpl(ClubApplicationRepository applicationRepository,
                                  ClubRepository clubRepository,
                                  UserRepository userRepository,
                                  MembershipRepository membershipRepository,
                                  PermissionAuthorizationService authorizationService,
                                  AuditService auditService,
                                  Clock clock) {
        this(applicationRepository, clubRepository, userRepository, membershipRepository, authorizationService, auditService, clock, null);
    }

    @Autowired
    public ClubApplicationServiceImpl(ClubApplicationRepository applicationRepository,
                                  ClubRepository clubRepository,
                                  UserRepository userRepository,
                                  MembershipRepository membershipRepository,
                                  PermissionAuthorizationService authorizationService,
                                  AuditService auditService,
                                  Clock clock,
                                  NotificationService notificationService) {
        this.applicationRepository = applicationRepository;
        this.clubRepository = clubRepository;
        this.userRepository = userRepository;
        this.membershipRepository = membershipRepository;
        this.authorizationService = authorizationService;
        this.auditService = auditService;
        this.clock = clock;
        this.notificationService = notificationService;
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
            Actor actor, ClubApplicationStatus status, UUID clubId, String sort, int offset, int limit) {
        OffsetLimitRequest page = new OffsetLimitRequest(offset, limit, applicationSort(sort));
        Specification<ClubApplication> spec = Specification.where(ClubApplicationSpecifications.forApplicant(actor.id()))
                .and(ClubApplicationSpecifications.hasStatus(status))
                .and(ClubApplicationSpecifications.forClub(clubId));
        Page<ClubApplication> applicationPage = applicationRepository.findAll(spec, page);
        List<ClubApplicationSummaryResponse> items = applicationPage.getContent().stream()
                .map(ClubApplicationSummaryResponse::from).toList();
        return new PageResponse<>(items, applicationPage.getTotalElements(), offset, limit);
    }

    @Transactional(readOnly = true)
    public ClubApplicationResponse getMine(Actor actor, UUID applicationId) {
        return ClubApplicationResponse.from(applicationRepository.findByIdAndApplicant_Id(applicationId, actor.id())
                .orElseThrow(() -> notFound("CLUB_APPLICATION_NOT_FOUND", "Club application not found")));
    }

    @Transactional
    public ClubApplicationResponse cancel(Actor actor, UUID applicationId) {
        ClubApplication application = applicationRepository.findForUpdateByIdAndApplicant_Id(applicationId, actor.id())
                .orElseThrow(() -> notFound("CLUB_APPLICATION_NOT_FOUND", "Club application not found"));
        if (application.getStatus() != ClubApplicationStatus.PENDING) {
            throw conflict("APPLICATION_CANNOT_BE_CANCELLED", "Only pending applications can be cancelled");
        }
        Map<String, Object> before = pendingAuditValues(application);
        application.setStatus(ClubApplicationStatus.CANCELLED);
        application.setCancelledAt(now());
        ClubApplication saved = applicationRepository.saveAndFlush(application);
        auditService.record(actor.id(), AuditAction.CLUB_APPLICATION_CANCELLED, saved.getId(), saved.getClub().getId(),
                before, applicationAuditValues(saved, saved.getStatus(), null));
        return ClubApplicationResponse.from(saved);
    }

    @Transactional(readOnly = true)
    public PageResponse<ClubApplicationResponse> listForClub(Actor actor, UUID clubId,
                                                              ClubApplicationStatus status, String search,
                                                              OffsetDateTime createdFrom, OffsetDateTime createdTo,
                                                              String sort, int offset, int limit) {
        if (!authorizationService.hasPermission(actor, "application.view", clubId, null)) {
            throw forbidden();
        }
        if (!clubRepository.existsById(clubId)) {
            throw notFound("CLUB_NOT_FOUND", "Club not found");
        }
        OffsetLimitRequest page = new OffsetLimitRequest(offset, limit, applicationSort(sort));
        Specification<ClubApplication> spec = Specification.where(ClubApplicationSpecifications.forClub(clubId))
                .and(ClubApplicationSpecifications.hasStatus(status))
                .and(ClubApplicationSpecifications.applicantKeyword(search))
                .and(ClubApplicationSpecifications.createdBetween(createdFrom, createdTo));
        Page<ClubApplication> applicationPage = applicationRepository.findAll(spec, page);
        List<ClubApplicationResponse> items = applicationPage.getContent().stream()
                .map(ClubApplicationResponse::from).toList();
        return new PageResponse<>(items, applicationPage.getTotalElements(), offset, limit);
    }

    @Transactional(readOnly = true)
    public ClubApplicationResponse getForClub(Actor actor, UUID clubId, UUID applicationId) {
        requireAnyPermission(actor, clubId, "application.view", "application.view_detail");
        return ClubApplicationResponse.from(applicationRepository.findByIdAndClub_Id(applicationId, clubId)
                .orElseThrow(() -> notFound("CLUB_APPLICATION_NOT_FOUND", "Club application not found")));
    }

    @Transactional
    public ClubApplicationResponse approve(Actor actor, UUID clubId, UUID applicationId,
                                           com.vju.club.modules.clubapplication.dto.request.ReviewClubApplicationRequest request) {
        requireAnyPermission(actor, clubId, "application.approve", "application.review");
        ClubApplication application = applicationRepository.findForReview(applicationId, clubId)
                .orElseThrow(() -> notFound("CLUB_APPLICATION_NOT_FOUND", "Club application not found"));
        ensurePending(application);
        if (membershipRepository.findFirstByUser_IdAndClub_IdAndStatusNot(
                application.getApplicant().getId(), clubId, MembershipStatus.LEFT).isPresent()) {
            throw conflict("DUPLICATE_MEMBERSHIP", "User already has a current membership in this club");
        }

        User reviewer = findUser(actor.id());
        com.vju.club.modules.membership.entity.Membership membership = new com.vju.club.modules.membership.entity.Membership();
        membership.setUser(application.getApplicant());
        membership.setClub(application.getClub());
        membership.setStatus(MembershipStatus.ACTIVE);
        membership.setJoinedAt(now());
        com.vju.club.modules.membership.entity.Membership savedMembership = membershipRepository.saveAndFlush(membership);

        Map<String, Object> approvalBefore = pendingAuditValues(application);
        application.setStatus(ClubApplicationStatus.APPROVED);
        application.setReviewedBy(reviewer);
        application.setReviewedAt(now());
        application.setReviewNote(normalizeNote(request));
        ClubApplication saved = applicationRepository.saveAndFlush(application);
        Map<String, Object> membershipAfter = new LinkedHashMap<>();
        membershipAfter.put("userId", application.getApplicant().getId());
        membershipAfter.put("clubId", clubId);
        membershipAfter.put("applicationId", saved.getId());
        membershipAfter.put("status", MembershipStatus.ACTIVE);
        auditService.record(actor.id(), AuditAction.MEMBERSHIP_CREATED, savedMembership.getId(), clubId, null,
                membershipAfter);
        Map<String, Object> approvalAfter = applicationAuditValues(application, saved.getStatus(), savedMembership.getId());
        auditService.record(actor.id(), AuditAction.CLUB_APPLICATION_APPROVED, saved.getId(), clubId,
                approvalBefore, approvalAfter);
        if (notificationService != null) notificationService.create(application.getApplicant().getId(), "Đơn đăng ký được duyệt", "Bạn đã được chấp nhận vào " + application.getClub().getName() + ".", saved.getId());
        return ClubApplicationResponse.from(saved, savedMembership);
    }

    @Transactional
    public ClubApplicationResponse reject(Actor actor, UUID clubId, UUID applicationId,
                                          com.vju.club.modules.clubapplication.dto.request.ReviewClubApplicationRequest request) {
        requireAnyPermission(actor, clubId, "application.reject", "application.review");
        ClubApplication application = applicationRepository.findForReview(applicationId, clubId)
                .orElseThrow(() -> notFound("CLUB_APPLICATION_NOT_FOUND", "Club application not found"));
        ensurePending(application);
        User reviewer = findUser(actor.id());
        Map<String, Object> rejectionBefore = pendingAuditValues(application);
        application.setStatus(ClubApplicationStatus.REJECTED);
        application.setReviewedBy(reviewer);
        application.setReviewedAt(now());
        application.setReviewNote(normalizeNote(request));
        ClubApplication saved = applicationRepository.saveAndFlush(application);
        auditService.record(actor.id(), AuditAction.CLUB_APPLICATION_REJECTED, saved.getId(), clubId,
                rejectionBefore,
                applicationAuditValues(saved, saved.getStatus(), null));
        if (notificationService != null) notificationService.create(application.getApplicant().getId(), "Đơn đăng ký bị từ chối", "Đơn đăng ký vào " + application.getClub().getName() + " đã bị từ chối.", saved.getId());
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

    private static String normalizeNote(com.vju.club.modules.clubapplication.dto.request.ReviewClubApplicationRequest request) {
        return request == null || request.reviewNote() == null || request.reviewNote().isBlank()
                ? null : request.reviewNote().trim();
    }

    private static Sort applicationSort(String raw) {
        if (raw == null || raw.isBlank()) {
            return Sort.by(Sort.Order.desc("createdAt"), Sort.Order.desc("id"));
        }
        String[] parts = raw.trim().split(",", -1);
        if (parts.length != 2 || !parts[0].equals("createdAt")) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "INVALID_SORT",
                    "Sort must be createdAt,asc or createdAt,desc");
        }
        Sort.Direction direction;
        try {
            direction = Sort.Direction.fromString(parts[1]);
        } catch (IllegalArgumentException exception) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "INVALID_SORT",
                    "Sort must be createdAt,asc or createdAt,desc");
        }
        return Sort.by(new Sort.Order(direction, "createdAt"), new Sort.Order(direction, "id"));
    }

    private static Map<String, Object> applicationAuditValues(ClubApplication application,
                                                                ClubApplicationStatus status,
                                                                UUID membershipId) {
        Map<String, Object> values = new LinkedHashMap<>();
        values.put("status", status);
        values.put("applicantId", application.getApplicant().getId());
        values.put("clubId", application.getClub().getId());
        if (application.getReviewedBy() != null) values.put("reviewerId", application.getReviewedBy().getId());
        if (application.getReviewNote() != null) values.put("reviewNote", application.getReviewNote());
        if (membershipId != null) values.put("membershipId", membershipId);
        return values;
    }

    private static Map<String, Object> pendingAuditValues(ClubApplication application) {
        Map<String, Object> values = new LinkedHashMap<>();
        values.put("status", ClubApplicationStatus.PENDING);
        values.put("applicantId", application.getApplicant().getId());
        values.put("clubId", application.getClub().getId());
        return values;
    }

    private static ApiException notFound(String code, String message) {
        return new ApiException(HttpStatus.NOT_FOUND, code, message);
    }

    private static ApiException conflict(String code, String message) {
        return new ApiException(HttpStatus.CONFLICT, code, message);
    }

    private static ApiException forbidden() {
        return new ApiException(HttpStatus.FORBIDDEN, "PERMISSION_DENIED", "Permission denied");
    }
}
