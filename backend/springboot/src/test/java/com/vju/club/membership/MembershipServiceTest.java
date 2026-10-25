package com.vju.club.membership;

import com.vju.club.modules.membership.mapper.MembershipMapperImpl;
import com.vju.club.modules.membership.service.MembershipService;

import com.vju.club.modules.membership.service.impl.MembershipServiceImpl;

import com.vju.club.modules.audit.enums.AuditAction;
import com.vju.club.modules.audit.service.AuditService;
import com.vju.club.modules.club.entity.Club;
import com.vju.club.modules.club.enums.ClubStatus;
import com.vju.club.modules.membership.entity.Membership;
import com.vju.club.modules.membership.enums.MembershipStatus;
import com.vju.club.modules.user.entity.User;
import com.vju.club.modules.user.enums.UserStatus;
import com.vju.club.modules.membership.dto.request.CreateMembershipRequest;
import com.vju.club.modules.membership.dto.request.UpdateMembershipRequest;
import com.vju.club.modules.club.repository.ClubRepository;
import com.vju.club.modules.departmentmember.repository.DepartmentMemberRepository;
import com.vju.club.modules.membership.repository.MembershipRepository;
import com.vju.club.modules.user.repository.UserRepository;
import com.vju.club.security.Actor;
import com.vju.club.security.PermissionAuthorizationService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.http.HttpStatus;

import java.time.Clock;
import java.time.Instant;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.Optional;
import java.util.UUID;

import static com.vju.club.support.PermissionChecks.withPermissionChecks;
import static com.vju.club.support.ApiErrors.FORBIDDEN;
import static com.vju.club.support.ApiErrors.assertApiError;
import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class MembershipServiceTest {
    private static final Instant NOW = Instant.parse("2026-09-30T00:00:00Z");

    @Mock MembershipRepository membershipRepository;
    @Mock ClubRepository clubRepository;
    @Mock UserRepository userRepository;
    @Mock DepartmentMemberRepository departmentMemberRepository;
    @Mock PermissionAuthorizationService authorization;
    @Mock AuditService audit;

    private MembershipService service;
    private final Actor actor = new Actor(UUID.randomUUID());
    private final Club club = new Club();
    private final User user = new User();

    @BeforeEach
    void setUp() {
        service = withPermissionChecks(new MembershipServiceImpl(membershipRepository, clubRepository, userRepository, departmentMemberRepository,
                authorization, Clock.fixed(NOW, ZoneOffset.UTC), audit, new MembershipMapperImpl()), authorization);
        club.setId(UUID.randomUUID());
        club.setStatus(ClubStatus.ACTIVE);
        user.setId(UUID.randomUUID());
        user.setStatus(UserStatus.ACTIVE);
        when(clubRepository.findById(club.getId())).thenReturn(Optional.of(club));
        when(userRepository.findById(user.getId())).thenReturn(Optional.of(user));
        when(membershipRepository.saveAndFlush(any(Membership.class))).thenAnswer(invocation -> {
            Membership saved = invocation.getArgument(0);
            if (saved.getId() == null) saved.setId(UUID.randomUUID());
            return saved;
        });
    }

    private Membership membership(MembershipStatus status) {
        Membership membership = new Membership();
        membership.setId(UUID.randomUUID());
        membership.setUser(user);
        membership.setClub(club);
        membership.setStatus(status);
        membership.setJoinedAt(OffsetDateTime.ofInstant(NOW, ZoneOffset.UTC).minusDays(10));
        if (status == MembershipStatus.LEFT) membership.setLeftAt(OffsetDateTime.ofInstant(NOW, ZoneOffset.UTC).minusDays(1));
        when(membershipRepository.findById(membership.getId())).thenReturn(Optional.of(membership));
        return membership;
    }

    @Test
    void joiningCreatesAnActiveMembershipAndIsAudited() {
        var created = service.create(actor, club.getId(), new CreateMembershipRequest(user.getId()));
        assertThat(created.status()).isEqualTo("ACTIVE");
        assertThat(created.joinedAt()).isEqualTo(OffsetDateTime.ofInstant(NOW, ZoneOffset.UTC));
        verify(authorization).require(actor, "member.add", club.getId(), null);
        verify(audit).record(eq(actor.id()), eq(AuditAction.MEMBER_ADDED), eq(created.id()), eq(club.getId()), any(), any());
    }

    @Test
    void cannotJoinTwiceInactiveClubOrAsInactiveUser() {
        when(membershipRepository.findFirstByUser_IdAndClub_IdAndStatusNot(user.getId(), club.getId(), MembershipStatus.LEFT))
                .thenReturn(Optional.of(new Membership()));
        assertApiError(() -> service.create(actor, club.getId(), new CreateMembershipRequest(user.getId())),
                HttpStatus.CONFLICT, "MEMBERSHIP_ALREADY_EXISTS");

        user.setStatus(UserStatus.INACTIVE);
        assertApiError(() -> service.create(actor, club.getId(), new CreateMembershipRequest(user.getId())),
                HttpStatus.CONFLICT, "USER_INACTIVE");

        club.setStatus(ClubStatus.INACTIVE);
        assertApiError(() -> service.create(actor, club.getId(), new CreateMembershipRequest(user.getId())),
                HttpStatus.CONFLICT, "CLUB_INACTIVE");
        verify(membershipRepository, never()).saveAndFlush(any());
    }

    @Test
    void leavingSetsLeftAtDropsDepartmentsAndIsAuditedOnce() {
        Membership membership = membership(MembershipStatus.ACTIVE);

        service.remove(actor, membership.getId());
        service.remove(actor, membership.getId());

        assertThat(membership.getStatus()).isEqualTo(MembershipStatus.LEFT);
        assertThat(membership.getLeftAt()).isEqualTo(OffsetDateTime.ofInstant(NOW, ZoneOffset.UTC));
        verify(departmentMemberRepository).deleteByMembershipId(membership.getId());
        verify(audit).record(eq(actor.id()), eq(AuditAction.MEMBER_REMOVED), eq(membership.getId()), eq(club.getId()),
                any(), any());
    }

    @Test
    void leftMembershipCannotBeReopened() {
        Membership membership = membership(MembershipStatus.LEFT);
        assertApiError(() -> service.update(actor, membership.getId(), new UpdateMembershipRequest(MembershipStatus.ACTIVE)),
                HttpStatus.CONFLICT, "MEMBERSHIP_ALREADY_LEFT");
        assertThat(membership.getStatus()).isEqualTo(MembershipStatus.LEFT);
    }

    @Test
    void suspendingIsAuditedAndKeepsDepartments() {
        Membership membership = membership(MembershipStatus.ACTIVE);
        service.update(actor, membership.getId(), new UpdateMembershipRequest(MembershipStatus.SUSPENDED));
        assertThat(membership.getLeftAt()).isNull();
        verify(departmentMemberRepository, never()).deleteByMembershipId(any());
        verify(audit).record(eq(actor.id()), eq(AuditAction.MEMBER_STATUS_CHANGED), eq(membership.getId()),
                eq(club.getId()), any(), any());
    }

    @Test
    void updateIsCheckedAgainstTheMembershipsClub() {
        Membership membership = membership(MembershipStatus.ACTIVE);
        doThrow(FORBIDDEN).when(authorization).require(actor, "member.update", club.getId(), null);
        assertApiError(() -> service.update(actor, membership.getId(), new UpdateMembershipRequest(MembershipStatus.SUSPENDED)),
                HttpStatus.FORBIDDEN, "PERMISSION_DENIED");
        assertThat(membership.getStatus()).isEqualTo(MembershipStatus.ACTIVE);
    }

    @Test
    void listOfMissingClubIsNotFound() {
        UUID missing = UUID.randomUUID();
        when(clubRepository.existsById(missing)).thenReturn(false);
        assertApiError(() -> service.list(actor, missing, null, 0, 20), HttpStatus.NOT_FOUND, "CLUB_NOT_FOUND");
    }

    @Test
    void listSupportsSearchAndDepartmentFilters() {
        UUID departmentId = UUID.randomUUID();
        when(clubRepository.existsById(club.getId())).thenReturn(true);
        when(membershipRepository.findAll(any(Specification.class), any(Pageable.class)))
                .thenReturn(new PageImpl<>(java.util.List.of(), PageRequest.of(0, 20), 0));

        service.list(actor, club.getId(), MembershipStatus.ACTIVE, departmentId, "student", 0, 20);

        verify(membershipRepository).findAll(any(Specification.class), any(Pageable.class));
    }

    @Test
    void userCanReadOwnMembershipHistoryWithoutGlobalPermission() {
        Membership own = membership(MembershipStatus.ACTIVE);
        own.setUser(user);
        when(membershipRepository.findAll(any(Specification.class), any(Pageable.class)))
                .thenReturn(new PageImpl<>(java.util.List.of(own), PageRequest.of(0, 20), 1));

        var page = service.listMine(actor, null, 0, 20);

        assertThat(page.total()).isEqualTo(1L);
        assertThat(page.items()).hasSize(1);
        assertThat(page.items().getFirst().clubId()).isEqualTo(club.getId());
        verify(authorization, never()).require(any(), eq("member.view"), any(), any());
    }
}
