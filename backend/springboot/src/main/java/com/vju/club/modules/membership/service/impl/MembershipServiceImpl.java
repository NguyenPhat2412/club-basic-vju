package com.vju.club.modules.membership.service.impl;

import com.vju.club.modules.permission.annotation.RequirePermission;
import lombok.RequiredArgsConstructor;
import com.vju.club.modules.membership.mapper.MembershipMapper;
import com.vju.club.modules.membership.service.MembershipService;
import com.vju.club.modules.membership.common.MembershipConstants;

import com.vju.club.security.Actor;
import com.vju.club.modules.audit.enums.AuditAction;
import com.vju.club.modules.audit.service.AuditService;
import com.vju.club.common.OffsetLimitRequest;
import com.vju.club.common.dto.PageResponse;
import com.vju.club.modules.club.entity.Club;
import com.vju.club.modules.club.enums.ClubStatus;
import com.vju.club.modules.membership.entity.Membership;
import com.vju.club.modules.membership.enums.MembershipStatus;
import com.vju.club.modules.user.entity.User;
import com.vju.club.modules.user.enums.UserStatus;
import com.vju.club.error.ApiException;
import com.vju.club.modules.membership.dto.request.CreateMembershipRequest;
import com.vju.club.modules.membership.dto.response.MembershipResponse;
import com.vju.club.modules.membership.dto.response.MyMembershipResponse;
import com.vju.club.modules.membership.dto.response.MembershipDepartmentResponse;
import com.vju.club.modules.membership.dto.request.UpdateMembershipRequest;
import com.vju.club.modules.club.repository.ClubRepository;
import com.vju.club.modules.departmentmember.repository.DepartmentMemberRepository;
import com.vju.club.modules.membership.repository.MembershipRepository;
import com.vju.club.modules.user.repository.UserRepository;
import com.vju.club.security.PermissionAuthorizationService;
import com.vju.club.modules.membership.specification.MembershipSpecifications;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.List;
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

    @Transactional(readOnly = true)
    public PageResponse<MembershipResponse> list(Actor actor, UUID clubId, MembershipStatus status,
                                                 int offset, int limit) {
        return list(actor, clubId, status, null, null, offset, limit);
    }

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

    @Transactional(readOnly = true)
    public MembershipResponse get(Actor actor, UUID membershipId) {
        Membership membership = find(actor, MembershipConstants.PERMISSION_VIEW_DETAIL, membershipId);
        authorizationService.require(actor, MembershipConstants.PERMISSION_VIEW_DETAIL, membership.getClub().getId(), null);
        return membershipMapper.toResponse(membership);
    }

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
        if (membershipRepository.findFirstByUser_IdAndClub_IdAndStatusNot(user.getId(), clubId, MembershipStatus.LEFT).isPresent()) {
            throw new ApiException(HttpStatus.CONFLICT, "MEMBERSHIP_ALREADY_EXISTS", "Membership already exists");
        }
        // Every (re)join is a new row, so earlier stints stay in the history untouched.
        Membership membership = new Membership();
        membership.setUser(user);
        membership.setClub(club);
        membership.setStatus(MembershipStatus.ACTIVE);
        membership.setJoinedAt(now());
        Membership saved = membershipRepository.saveAndFlush(membership);
        auditService.record(actor.id(), AuditAction.MEMBER_ADDED, saved.getId(), clubId, null,
                Map.of("userId", user.getId(), "status", saved.getStatus()));
        return membershipMapper.toResponse(saved);
    }

    @Transactional
    public MembershipResponse update(Actor actor, UUID membershipId, UpdateMembershipRequest request) {
        Membership membership = find(actor, MembershipConstants.PERMISSION_UPDATE, membershipId);
        authorizationService.require(actor, MembershipConstants.PERMISSION_UPDATE, membership.getClub().getId(), null);
        changeStatus(actor, membership, request.status());
        return membershipMapper.toResponse(membershipRepository.saveAndFlush(membership));
    }

    @Transactional
    public void remove(Actor actor, UUID membershipId) {
        Membership membership = find(actor, MembershipConstants.PERMISSION_REMOVE, membershipId);
        authorizationService.require(actor, MembershipConstants.PERMISSION_REMOVE, membership.getClub().getId(), null);
        changeStatus(actor, membership, MembershipStatus.LEFT);
        membershipRepository.saveAndFlush(membership);
    }

    /**
     * LEFT is final: a left membership is history and cannot be reopened (rejoining creates a new
     * membership). Leaving drops the member from every department of the club.
     */
    private void changeStatus(Actor actor, Membership membership, MembershipStatus status) {
        MembershipStatus previous = membership.getStatus();
        if (previous == MembershipStatus.LEFT) {
            if (status == MembershipStatus.LEFT) return;
            throw new ApiException(HttpStatus.CONFLICT, "MEMBERSHIP_ALREADY_LEFT",
                    "A membership that has ended cannot be reopened; add the user to the club again");
        }
        if (previous == status) return;
        membership.setStatus(status);
        if (status == MembershipStatus.LEFT) {
            membership.setLeftAt(now());
            departmentMemberRepository.deleteByMembershipId(membership.getId());
        }
        auditService.record(actor.id(), status == MembershipStatus.LEFT ? AuditAction.MEMBER_REMOVED
                        : AuditAction.MEMBER_STATUS_CHANGED, membership.getId(), membership.getClub().getId(),
                Map.of("status", previous), Map.of("status", status));
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
