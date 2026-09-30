package com.vju.club.membership;

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
import com.vju.club.membership.dto.UpdateMembershipRequest;
import com.vju.club.repository.ClubRepository;
import com.vju.club.repository.DepartmentMemberRepository;
import com.vju.club.repository.MembershipRepository;
import com.vju.club.repository.UserRepository;
import com.vju.club.security.PermissionAuthorizationService;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.time.OffsetDateTime;
import java.util.UUID;

@Service
public class MembershipServiceImpl implements MembershipService {
    private final MembershipRepository membershipRepository;
    private final MembershipDao membershipDao;
    private final ClubRepository clubRepository;
    private final UserRepository userRepository;
    private final DepartmentMemberRepository departmentMemberRepository;
    private final PermissionAuthorizationService authorizationService;
    private final Clock clock;

    public MembershipServiceImpl(MembershipRepository membershipRepository, MembershipDao membershipDao,
                                 ClubRepository clubRepository, UserRepository userRepository,
                                 DepartmentMemberRepository departmentMemberRepository,
                                 PermissionAuthorizationService authorizationService, Clock clock) {
        this.membershipRepository = membershipRepository;
        this.membershipDao = membershipDao;
        this.clubRepository = clubRepository;
        this.userRepository = userRepository;
        this.departmentMemberRepository = departmentMemberRepository;
        this.authorizationService = authorizationService;
        this.clock = clock;
    }

    @Override
    @Transactional(readOnly = true)
    public PageResponse<MembershipResponse> list(Authentication authentication, UUID clubId, int offset, int limit) {
        authorizationService.require(authentication, "member.view", clubId, null);
        if (!clubRepository.existsById(clubId)) throw notFound("CLUB_NOT_FOUND", "Club not found");
        var items = membershipDao.findByClub(clubId, offset, limit).stream().map(MembershipResponse::from).toList();
        return new PageResponse<>(items, membershipRepository.countByClub_Id(clubId), offset, limit);
    }

    @Override
    @Transactional(readOnly = true)
    public MembershipResponse get(Authentication authentication, UUID membershipId) {
        Membership membership = find(authentication, "member.view_detail", membershipId);
        authorizationService.require(authentication, "member.view_detail", membership.getClub().getId(), null);
        return MembershipResponse.from(membership);
    }

    @Override
    @Transactional
    public MembershipResponse create(Authentication authentication, UUID clubId, CreateMembershipRequest request) {
        authorizationService.require(authentication, "member.add", clubId, null);
        Club club = clubRepository.findById(clubId).orElseThrow(() -> notFound("CLUB_NOT_FOUND", "Club not found"));
        if (club.getStatus() != ClubStatus.ACTIVE) {
            throw new ApiException(HttpStatus.CONFLICT, "CLUB_INACTIVE", "Club is inactive");
        }
        User user = userRepository.findById(request.userId()).orElseThrow(() -> notFound("USER_NOT_FOUND", "User not found"));
        if (user.getStatus() != UserStatus.ACTIVE) {
            throw new ApiException(HttpStatus.CONFLICT, "USER_INACTIVE", "User account is inactive");
        }
        Membership membership = membershipRepository.findByUser_IdAndClub_Id(user.getId(), clubId).orElse(null);
        if (membership != null && membership.getStatus() != MembershipStatus.LEFT) {
            throw new ApiException(HttpStatus.CONFLICT, "MEMBERSHIP_ALREADY_EXISTS", "Membership already exists");
        }
        if (membership == null) {
            // A user who left can rejoin; the unique (user, club) row is then reactivated below.
            membership = new Membership();
            membership.setUser(user);
            membership.setClub(club);
        }
        membership.setStatus(MembershipStatus.ACTIVE);
        membership.setJoinedAt(now());
        membership.setLeftAt(null);
        return MembershipResponse.from(membershipRepository.saveAndFlush(membership));
    }

    @Override
    @Transactional
    public MembershipResponse update(Authentication authentication, UUID membershipId, UpdateMembershipRequest request) {
        Membership membership = find(authentication, "member.update", membershipId);
        authorizationService.require(authentication, "member.update", membership.getClub().getId(), null);
        changeStatus(membership, request.status());
        return MembershipResponse.from(membershipRepository.saveAndFlush(membership));
    }

    @Override
    @Transactional
    public void remove(Authentication authentication, UUID membershipId) {
        Membership membership = find(authentication, "member.remove", membershipId);
        authorizationService.require(authentication, "member.remove", membership.getClub().getId(), null);
        changeStatus(membership, MembershipStatus.LEFT);
        membershipRepository.saveAndFlush(membership);
    }

    /** Leaving a club keeps the original leave date and drops the member from all its departments. */
    private void changeStatus(Membership membership, MembershipStatus status) {
        boolean alreadyLeft = membership.getStatus() == MembershipStatus.LEFT;
        membership.setStatus(status);
        if (status != MembershipStatus.LEFT) {
            membership.setLeftAt(null);
        } else if (!alreadyLeft) {
            membership.setLeftAt(now());
            departmentMemberRepository.deleteByMembershipId(membership.getId());
        }
    }

    private Membership find(Authentication authentication, String permissionKey, UUID id) {
        return membershipRepository.findById(id).orElseThrow(() -> authorizationService.missingResource(
                authentication, permissionKey, notFound("MEMBERSHIP_NOT_FOUND", "Membership not found")));
    }

    private OffsetDateTime now() {
        return OffsetDateTime.now(clock);
    }

    private ApiException notFound(String code, String message) { return new ApiException(HttpStatus.NOT_FOUND, code, message); }
}
