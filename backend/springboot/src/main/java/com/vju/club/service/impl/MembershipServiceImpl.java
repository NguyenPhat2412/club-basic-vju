package com.vju.club.service.impl;

import com.vju.club.common.OffsetLimitRequest;
import com.vju.club.dto.response.PageResponse;
import com.vju.club.error.ApiException;
import com.vju.club.enums.AuditAction;
import com.vju.club.enums.ClubApplicationStatus;
import com.vju.club.service.AuditService;
import com.vju.club.service.SystemSettingsService;
import com.vju.club.entity.Club;
import com.vju.club.entity.ClubApplication;
import com.vju.club.enums.ClubStatus;
import com.vju.club.repository.ClubApplicationRepository;
import com.vju.club.repository.ClubRepository;
import com.vju.club.repository.DepartmentMemberRepository;
import com.vju.club.common.MembershipConstants;
import com.vju.club.dto.request.CreateMembershipRequest;
import com.vju.club.dto.request.UpdateMembershipRequest;
import com.vju.club.dto.response.MembershipDepartmentResponse;
import com.vju.club.dto.response.MembershipResponse;
import com.vju.club.dto.response.MyMembershipResponse;
import com.vju.club.dto.response.SystemSettingsResponse;
import com.vju.club.entity.Membership;
import com.vju.club.enums.MembershipStatus;
import com.vju.club.mapper.MembershipMapper;
import com.vju.club.repository.MembershipRepository;
import com.vju.club.service.MembershipService;
import com.vju.club.specification.MembershipSpecifications;
import com.vju.club.annotation.RequirePermission;
import com.vju.club.entity.User;
import com.vju.club.enums.UserStatus;
import com.vju.club.repository.UserRepository;
import com.vju.club.security.Actor;
import com.vju.club.security.PermissionAuthorizationService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.vju.club.repository.UserPermissionRepository;
import com.vju.club.repository.UserRoleRepository;
import java.time.Clock;
import java.time.OffsetDateTime;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class MembershipServiceImpl implements MembershipService {
    private final MembershipRepository membershipRepository;
    private final ClubRepository clubRepository;
    private final UserRepository userRepository;
    private final DepartmentMemberRepository departmentMemberRepository;
    private final PermissionAuthorizationService authorizationService;
    private final Clock clock;
    private final AuditService auditService;
    private final MembershipMapper membershipMapper;
    private final UserRoleRepository userRoleRepository;
    private final UserPermissionRepository userPermissionRepository;
    private final SystemSettingsService settingsService;
    private final ClubApplicationRepository applicationRepository;

    @Override
    @Transactional(readOnly = true)
    public PageResponse<MembershipResponse> list(Actor actor, UUID clubId, MembershipStatus status,
                                                 int offset, int limit) {
        return list(actor, clubId, status, null, null, offset, limit);
    }

    @Override
    @Transactional(readOnly = true)
    public PageResponse<MembershipResponse> list(Actor actor, UUID clubId, MembershipStatus status,
                                                 UUID departmentId, String search, int offset, int limit) {
        authorizationService.require(actor, MembershipConstants.PERMISSION_VIEW, clubId, null);
        if (!clubRepository.existsById(clubId)) throw notFound("CLUB_NOT_FOUND", "Club not found");

        Specification<Membership> spec = Specification.where(MembershipSpecifications.hasClubId(clubId))
                .and(MembershipSpecifications.hasStatus(status))
                .and(MembershipSpecifications.inDepartment(departmentId))
                .and(MembershipSpecifications.userKeyword(search));

        Sort sort = Sort.by(Sort.Order.desc("joinedAt"), Sort.Order.asc("id"));
        OffsetLimitRequest page = new OffsetLimitRequest(offset, limit, sort);
        Page<Membership> membershipPage = membershipRepository.findAll(spec, page);
        var items = membershipPage.getContent().stream().map(membershipMapper::toResponse).toList();
        return new PageResponse<>(items, membershipPage.getTotalElements(), offset, limit);
    }

    @Override
    @Transactional(readOnly = true)
    public PageResponse<MyMembershipResponse> listMine(Actor actor, MembershipStatus status, int offset, int limit) {
        Specification<Membership> spec = Specification.where(MembershipSpecifications.hasUserId(actor.id()))
                .and(MembershipSpecifications.hasStatus(status));

        Sort sort = Sort.by(Sort.Order.desc("joinedAt"), Sort.Order.asc("id"));
        OffsetLimitRequest page = new OffsetLimitRequest(offset, limit, sort);
        Page<Membership> membershipPage = membershipRepository.findAll(spec, page);
        var memberships = membershipPage.getContent();
        Map<UUID, List<MembershipDepartmentResponse>> departments = memberships.isEmpty() ? Map.of()
                : departmentMemberRepository.findForMemberships(memberships.stream().map(Membership::getId).toList())
                    .stream().collect(Collectors.groupingBy(assignment -> assignment.getMembership().getId(),
                            Collectors.mapping(membershipMapper::toDepartmentResponse, Collectors.toList())));
        var items = memberships.stream().map(membership -> membershipMapper.toMyResponse(membership,
                departments.getOrDefault(membership.getId(), List.of()))).toList();
        return new PageResponse<>(items, membershipPage.getTotalElements(), offset, limit);
    }

    @Override
    @Transactional(readOnly = true)
    public MembershipResponse get(Actor actor, UUID membershipId) {
        Membership membership = find(actor, MembershipConstants.PERMISSION_VIEW_DETAIL, membershipId);
        authorizationService.require(actor, MembershipConstants.PERMISSION_VIEW_DETAIL, membership.getClub().getId(), null);
        return membershipMapper.toResponse(membership);
    }

    @Override
    @Transactional
    @RequirePermission(value = MembershipConstants.PERMISSION_ADD, clubId = "clubId")
    public MembershipResponse create(Actor actor, UUID clubId, CreateMembershipRequest request) {
        Club club = clubRepository.findById(clubId).orElseThrow(() -> notFound("CLUB_NOT_FOUND", "Club not found"));
        if (club.getStatus() != ClubStatus.ACTIVE) {
            throw new ApiException(HttpStatus.CONFLICT, "CLUB_INACTIVE", "Club is inactive");
        }
        User user = userRepository.findById(request.userId()).orElseThrow(() -> notFound("USER_NOT_FOUND", "User not found"));
        if (user.getStatus() != UserStatus.ACTIVE) {
            throw new ApiException(HttpStatus.CONFLICT, "USER_INACTIVE", "User account is inactive");
        }

        // Acquire row lock on any pending application first (same lock order as approve: club_applications -> memberships)
        Optional<ClubApplication> pendingApp = applicationRepository != null
                ? applicationRepository.findForUpdatePending(user.getId(), clubId)
                : Optional.empty();

        if (membershipRepository.findFirstByUser_IdAndClub_IdAndStatusNot(user.getId(), clubId, MembershipStatus.LEFT).isPresent()) {
            throw new ApiException(HttpStatus.CONFLICT, "MEMBERSHIP_ALREADY_EXISTS", "Membership already exists");
        }
        SystemSettingsResponse settings = settingsService != null ? settingsService.current() : null;
        if (settings != null) {
            int maxClubs = settings.maxActiveClubs();
            if (maxClubs > 0 && membershipRepository.countByUser_IdAndStatusNot(user.getId(), MembershipStatus.LEFT) >= maxClubs) {
                throw new ApiException(HttpStatus.CONFLICT, "MEMBERSHIP_LIMIT_REACHED",
                        "A student may belong to at most " + maxClubs + " clubs");
            }
        }

        OffsetDateTime joinedAt = now();
        Membership membership = new Membership();
        membership.setUser(user);
        membership.setClub(club);
        membership.setStatus(MembershipStatus.ACTIVE);
        membership.setJoinedAt(joinedAt);
        Membership saved = membershipRepository.saveAndFlush(membership);
        userRoleRepository.grantJoinRoles(user.getId(), clubId, actor.id());
        auditService.record(actor.id(), AuditAction.MEMBER_ADDED, saved.getId(), clubId, null,
                Map.of("userId", user.getId(), "status", saved.getStatus(), "joinRolesGranted", true));

        if (pendingApp.isPresent()) {
            ClubApplication app = pendingApp.get();
            Map<String, Object> beforeApp = Map.of(
                    "applicantId", user.getId(),
                    "clubId", clubId,
                    "status", app.getStatus()
            );
            app.setStatus(ClubApplicationStatus.CANCELLED);
            app.setCancelledAt(joinedAt);
            applicationRepository.saveAndFlush(app);
            Map<String, Object> afterApp = new LinkedHashMap<>();
            afterApp.put("applicantId", user.getId());
            afterApp.put("clubId", clubId);
            afterApp.put("status", app.getStatus());
            afterApp.put("cancelledAt", joinedAt);
            afterApp.put("supersededByMembershipId", saved.getId());
            auditService.record(actor.id(), AuditAction.CLUB_APPLICATION_CANCELLED, app.getId(), clubId, beforeApp, afterApp);
        }

        return membershipMapper.toResponse(saved);
    }

    @Override
    @Transactional
    public MembershipResponse update(Actor actor, UUID membershipId, UpdateMembershipRequest request) {
        Membership membership = find(actor, MembershipConstants.PERMISSION_UPDATE, membershipId);
        authorizationService.require(actor, MembershipConstants.PERMISSION_UPDATE, membership.getClub().getId(), null);
        if (request.status() == MembershipStatus.LEFT) {
            authorizationService.require(actor, MembershipConstants.PERMISSION_REMOVE, membership.getClub().getId(), null);
        }
        changeStatus(actor, membership, request.status());
        return membershipMapper.toResponse(membershipRepository.saveAndFlush(membership));
    }

    @Override
    @Transactional
    public void remove(Actor actor, UUID membershipId) {
        Membership membership = find(actor, MembershipConstants.PERMISSION_REMOVE, membershipId);
        authorizationService.require(actor, MembershipConstants.PERMISSION_REMOVE, membership.getClub().getId(), null);
        changeStatus(actor, membership, MembershipStatus.LEFT);
        membershipRepository.saveAndFlush(membership);
    }

    private void changeStatus(Actor actor, Membership membership, MembershipStatus status) {
        MembershipStatus previous = membership.getStatus();
        if (status == null || status == MembershipStatus.INACTIVE) {
            throw new ApiException(HttpStatus.CONFLICT, "INVALID_MEMBERSHIP_STATUS_TRANSITION",
                    "Unsupported membership status transition: " + previous + " -> " + status);
        }
        if (previous == MembershipStatus.LEFT) {
            if (status == MembershipStatus.LEFT) return;
            throw new ApiException(HttpStatus.CONFLICT, "MEMBERSHIP_ALREADY_LEFT",
                    "A membership that has ended cannot be reopened; add the user to the club again");
        }
        if (previous == status) return;
        if (!isValidTransition(previous, status)) {
            throw new ApiException(HttpStatus.CONFLICT, "INVALID_MEMBERSHIP_STATUS_TRANSITION",
                    "Unsupported membership status transition: " + previous + " -> " + status);
        }
        if (previous == MembershipStatus.SUSPENDED && status == MembershipStatus.ACTIVE) {
            if (membership.getClub().getStatus() != ClubStatus.ACTIVE) {
                throw new ApiException(HttpStatus.CONFLICT, "CLUB_INACTIVE", "Club is inactive");
            }
            if (membership.getUser().getStatus() != UserStatus.ACTIVE) {
                throw new ApiException(HttpStatus.CONFLICT, "USER_INACTIVE", "User account is inactive");
            }
        }

        membership.setStatus(status);
        Map<String, Object> after = new LinkedHashMap<>();
        after.put("status", status);
        if (status == MembershipStatus.LEFT) {
            membership.setLeftAt(now());
            departmentMemberRepository.deleteByMembershipId(membership.getId());
            UUID userId = membership.getUser().getId();
            UUID clubId = membership.getClub().getId();
            after.put("revokedRoles", userRoleRepository.revokeAllInClub(userId, clubId, actor.id(), now()));
            after.put("revokedPermissions", userPermissionRepository.revokeAllInClub(userId, clubId, actor.id(), now()));
        } else if (status == MembershipStatus.ACTIVE) {
            userRoleRepository.grantJoinRoles(membership.getUser().getId(), membership.getClub().getId(), actor.id());
        } else {
            userRoleRepository.revokeJoinRoles(membership.getUser().getId(), membership.getClub().getId(), actor.id(), now());
        }
        auditService.record(actor.id(), status == MembershipStatus.LEFT ? AuditAction.MEMBER_REMOVED
                        : AuditAction.MEMBER_STATUS_CHANGED, membership.getId(), membership.getClub().getId(),
                Map.of("status", previous), after);
    }

    private static boolean isValidTransition(MembershipStatus previous, MembershipStatus target) {
        return (previous == MembershipStatus.ACTIVE && (target == MembershipStatus.SUSPENDED || target == MembershipStatus.LEFT))
                || (previous == MembershipStatus.SUSPENDED && (target == MembershipStatus.ACTIVE || target == MembershipStatus.LEFT));
    }

    private Membership find(Actor actor, String permissionKey, UUID id) {
        return membershipRepository.findById(id).orElseThrow(() -> authorizationService.missingResource(
                actor, permissionKey, notFound("MEMBERSHIP_NOT_FOUND", "Membership not found")));
    }

    private OffsetDateTime now() {
        return OffsetDateTime.now(clock);
    }

    private ApiException notFound(String code, String message) { return new ApiException(HttpStatus.NOT_FOUND, code, message); }
}
