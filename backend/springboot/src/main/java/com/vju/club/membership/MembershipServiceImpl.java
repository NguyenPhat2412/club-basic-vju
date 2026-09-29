package com.vju.club.membership;

import com.vju.club.common.dto.PageResponse;
import com.vju.club.entity.Club;
import com.vju.club.entity.Membership;
import com.vju.club.entity.MembershipStatus;
import com.vju.club.entity.User;
import com.vju.club.error.ApiException;
import com.vju.club.membership.dto.CreateMembershipRequest;
import com.vju.club.membership.dto.MembershipResponse;
import com.vju.club.membership.dto.UpdateMembershipRequest;
import com.vju.club.repository.ClubRepository;
import com.vju.club.repository.MembershipRepository;
import com.vju.club.repository.UserRepository;
import com.vju.club.security.PermissionAuthorizationService;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.UUID;

@Service
public class MembershipServiceImpl implements MembershipService {
    private final MembershipRepository membershipRepository;
    private final MembershipDao membershipDao;
    private final ClubRepository clubRepository;
    private final UserRepository userRepository;
    private final PermissionAuthorizationService authorizationService;

    public MembershipServiceImpl(MembershipRepository membershipRepository, MembershipDao membershipDao,
                                 ClubRepository clubRepository, UserRepository userRepository,
                                 PermissionAuthorizationService authorizationService) {
        this.membershipRepository = membershipRepository;
        this.membershipDao = membershipDao;
        this.clubRepository = clubRepository;
        this.userRepository = userRepository;
        this.authorizationService = authorizationService;
    }

    @Override
    @Transactional(readOnly = true)
    public PageResponse<MembershipResponse> list(Authentication authentication, UUID clubId, int offset, int limit) {
        authorizationService.require(authentication, "member.view", clubId, null);
        var items = membershipDao.findByClub(clubId, offset, limit).stream().map(MembershipResponse::from).toList();
        return new PageResponse<>(items, membershipRepository.countByClub_Id(clubId), Math.max(0, offset), Math.max(1, Math.min(limit, 100)));
    }

    @Override
    @Transactional(readOnly = true)
    public MembershipResponse get(Authentication authentication, UUID membershipId) {
        Membership membership = find(membershipId);
        authorizationService.require(authentication, "member.view_detail", membership.getClub().getId(), null);
        return MembershipResponse.from(membership);
    }

    @Override
    @Transactional
    public MembershipResponse create(Authentication authentication, UUID clubId, CreateMembershipRequest request) {
        authorizationService.require(authentication, "member.add", clubId, null);
        Club club = clubRepository.findById(clubId).orElseThrow(() -> notFound("CLUB_NOT_FOUND", "Club not found"));
        User user = userRepository.findById(request.userId()).orElseThrow(() -> notFound("USER_NOT_FOUND", "User not found"));
        if (membershipRepository.existsByUser_IdAndClub_Id(request.userId(), clubId)) {
            throw new ApiException(HttpStatus.CONFLICT, "MEMBERSHIP_ALREADY_EXISTS", "Membership already exists");
        }
        Membership membership = new Membership();
        membership.setUser(user); membership.setClub(club); membership.setStatus(MembershipStatus.ACTIVE);
        membership.setJoinedAt(OffsetDateTime.now(ZoneOffset.UTC));
        membershipRepository.save(membership);
        membershipRepository.flush();
        return MembershipResponse.from(membership);
    }

    @Override
    @Transactional
    public MembershipResponse update(Authentication authentication, UUID membershipId, UpdateMembershipRequest request) {
        Membership membership = find(membershipId);
        authorizationService.require(authentication, "member.update", membership.getClub().getId(), null);
        membership.setStatus(request.status());
        membership.setLeftAt(request.status() == MembershipStatus.LEFT ? OffsetDateTime.now(ZoneOffset.UTC) : null);
        membershipRepository.save(membership);
        membershipRepository.flush();
        return MembershipResponse.from(membership);
    }

    @Override
    @Transactional
    public void remove(Authentication authentication, UUID membershipId) {
        Membership membership = find(membershipId);
        authorizationService.require(authentication, "member.remove", membership.getClub().getId(), null);
        membership.setStatus(MembershipStatus.LEFT);
        membership.setLeftAt(OffsetDateTime.now(ZoneOffset.UTC));
        membershipRepository.save(membership);
        membershipRepository.flush();
    }

    private Membership find(UUID id) {
        return membershipRepository.findById(id).orElseThrow(() -> notFound("MEMBERSHIP_NOT_FOUND", "Membership not found"));
    }
    private ApiException notFound(String code, String message) { return new ApiException(HttpStatus.NOT_FOUND, code, message); }
}
