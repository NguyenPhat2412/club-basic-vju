package com.vju.club.membership;

import com.vju.club.security.Actor;
import com.vju.club.audit.AuditAction;
import com.vju.club.audit.AuditService;
import com.vju.club.common.OffsetLimitRequest;
import com.vju.club.common.dto.PageResponse;
import com.vju.club.entity.Club;
import com.vju.club.entity.ClubStatus;
import com.vju.club.entity.Membership;
import com.vju.club.entity.MembershipStatus;
import com.vju.club.entity.User;
import com.vju.club.entity.UserStatus;
import com.vju.club.error.ApiException;
import com.vju.club.membership.dto.CreateMembershipRequest;
import com.vju.club.membership.dto.MembershipResponse;
import com.vju.club.membership.dto.MyMembershipResponse;
import com.vju.club.membership.dto.UpdateMembershipRequest;
import com.vju.club.repository.ClubRepository;
import com.vju.club.repository.DepartmentMemberRepository;
import com.vju.club.repository.MembershipRepository;
import com.vju.club.repository.UserRepository;
import com.vju.club.security.PermissionAuthorizationService;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.time.OffsetDateTime;
import java.util.Map;
import java.util.UUID;

@Service
public class MembershipService {
    private final MembershipRepository membershipRepository;
    private final AuditService auditService;
    private final ClubRepository clubRepository;
    private final UserRepository userRepository;
    private final DepartmentMemberRepository departmentMemberRepository;
    private final PermissionAuthorizationService authorizationService;
    private final Clock clock;

    public MembershipService(MembershipRepository membershipRepository,
                                 ClubRepository clubRepository, UserRepository userRepository,
                                 DepartmentMemberRepository departmentMemberRepository,
                                 PermissionAuthorizationService authorizationService, Clock clock,
                                 AuditService auditService) {
        this.auditService = auditService;
        this.membershipRepository = membershipRepository;
        this.clubRepository = clubRepository;
        this.userRepository = userRepository;
        this.departmentMemberRepository = departmentMemberRepository;
        this.authorizationService = authorizationService;
        this.clock = clock;
    }

    @Transactional(readOnly = true)
    public PageResponse<MembershipResponse> list(Actor actor, UUID clubId, MembershipStatus status,
                                                 int offset, int limit) {
        return list(actor, clubId, status, null, null, offset, limit);
    }

    @Transactional(readOnly = true)
    public PageResponse<MembershipResponse> list(Actor actor, UUID clubId, MembershipStatus status,
                                                 UUID departmentId, String search, int offset, int limit) {
        authorizationService.require(actor, "member.view", clubId, null);
        if (!clubRepository.existsById(clubId)) throw notFound("CLUB_NOT_FOUND", "Club not found");
        String normalizedSearch = search == null || search.isBlank()
                ? null : "%" + search.trim().toLowerCase(java.util.Locale.ROOT) + "%";
        var items = membershipRepository.findPageByClubFiltered(clubId, status, departmentId, normalizedSearch,
                new OffsetLimitRequest(offset, limit)).stream()
                .map(MembershipResponse::from).toList();
        return new PageResponse<>(items, membershipRepository.countByClubFiltered(clubId, status, departmentId,
                normalizedSearch), offset, limit);
    }

    @Transactional(readOnly = true)
    public PageResponse<MyMembershipResponse> listMine(Actor actor, MembershipStatus status, int offset, int limit) {
        OffsetLimitRequest page = new OffsetLimitRequest(offset, limit);
        var items = membershipRepository.findPageByUser(actor.id(), status, page).stream()
                .map(MyMembershipResponse::from).toList();
        return new PageResponse<>(items, membershipRepository.countByUser(actor.id(), status), offset, limit);
    }

    @Transactional(readOnly = true)
    public MembershipResponse get(Actor actor, UUID membershipId) {
        Membership membership = find(actor, "member.view_detail", membershipId);
        authorizationService.require(actor, "member.view_detail", membership.getClub().getId(), null);
        return MembershipResponse.from(membership);
    }

    @Transactional
    public MembershipResponse create(Actor actor, UUID clubId, CreateMembershipRequest request) {
        authorizationService.require(actor, "member.add", clubId, null);
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
        return MembershipResponse.from(saved);
    }

    @Transactional
    public MembershipResponse update(Actor actor, UUID membershipId, UpdateMembershipRequest request) {
        Membership membership = find(actor, "member.update", membershipId);
        authorizationService.require(actor, "member.update", membership.getClub().getId(), null);
        changeStatus(actor, membership, request.status());
        return MembershipResponse.from(membershipRepository.saveAndFlush(membership));
    }

    @Transactional
    public void remove(Actor actor, UUID membershipId) {
        Membership membership = find(actor, "member.remove", membershipId);
        authorizationService.require(actor, "member.remove", membership.getClub().getId(), null);
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
