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

    private User findUser(UUID id) {
        return userRepository.findById(id).orElseThrow(() -> notFound("USER_NOT_FOUND", "User not found"));
    }

    private OffsetDateTime now() {
        return OffsetDateTime.now(clock).withOffsetSameInstant(ZoneOffset.UTC);
    }

    private static ApiException notFound(String code, String message) {
        return new ApiException(HttpStatus.NOT_FOUND, code, message);
    }

    private static ApiException conflict(String code, String message) {
        return new ApiException(HttpStatus.CONFLICT, code, message);
    }
}
