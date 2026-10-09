package com.vju.club.permission;

import com.vju.club.modules.permission.mapper.PermissionMapperImpl;
import com.vju.club.modules.permission.service.PermissionService;

import com.vju.club.modules.permission.service.impl.PermissionServiceImpl;

import com.vju.club.modules.audit.enums.AuditAction;
import com.vju.club.modules.audit.service.AuditService;
import com.vju.club.modules.club.entity.Club;
import com.vju.club.modules.permission.entity.Permission;
import com.vju.club.modules.permission.enums.PermissionScope;
import com.vju.club.modules.user.entity.User;
import com.vju.club.modules.permission.entity.UserPermission;
import com.vju.club.modules.permission.dto.request.GrantPermissionRequest;
import com.vju.club.modules.permission.dto.request.ReplacePermissionsRequest;
import com.vju.club.modules.club.repository.ClubRepository;
import com.vju.club.modules.department.repository.DepartmentRepository;
import com.vju.club.modules.audit.repository.PermissionAuditLogRepository;
import com.vju.club.modules.permission.repository.PermissionRepository;
import com.vju.club.modules.permission.repository.UserPermissionRepository;
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
import org.springframework.http.HttpStatus;

import java.time.Clock;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

import static com.vju.club.support.PermissionChecks.withPermissionChecks;
import static com.vju.club.support.ApiErrors.FORBIDDEN;
import static com.vju.club.support.ApiErrors.assertApiError;
import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyCollection;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class PermissionServiceTest {

    @Mock PermissionRepository permissionRepository;
    @Mock UserPermissionRepository userPermissionRepository;
    @Mock PermissionAuditLogRepository permissionAuditLogRepository;
    @Mock UserRepository userRepository;
    @Mock ClubRepository clubRepository;
    @Mock DepartmentRepository departmentRepository;
    @Mock PermissionAuthorizationService authorization;
    @Mock AuditService audit;

    private PermissionService service;
    private final User admin = user();
    private final User target = user();
    private final Actor actor = new Actor(admin.getId());
    private final Club club = new Club();
    private final Permission clubView = permission("club.view", PermissionScope.CLUB);
    private final Permission clubUpdate = permission("club.update", PermissionScope.CLUB);
    private final Permission userView = permission("user.view", PermissionScope.GLOBAL);
    private final List<UserPermission> activeGrants = new ArrayList<>();

    private static User user() {
        User user = new User();
        user.setId(UUID.randomUUID());
        return user;
    }

    private static Permission permission(String key, PermissionScope scope) {
        Permission permission = new Permission();
        permission.setId(UUID.randomUUID());
        permission.setPermissionKey(key);
        permission.setScope(scope);
        permission.setActive(true);
        return permission;
    }

    @BeforeEach
    void setUp() {
        service = withPermissionChecks(new PermissionServiceImpl(permissionRepository, userPermissionRepository, permissionAuditLogRepository,
                userRepository, clubRepository, departmentRepository, authorization, Clock.systemUTC(), audit, new PermissionMapperImpl()), authorization);
        club.setId(UUID.randomUUID());
        when(userRepository.findById(admin.getId())).thenReturn(Optional.of(admin));
        when(userRepository.findById(target.getId())).thenReturn(Optional.of(target));
        when(clubRepository.findById(club.getId())).thenReturn(Optional.of(club));
        for (Permission permission : List.of(clubView, clubUpdate, userView)) {
            when(permissionRepository.findById(permission.getId())).thenReturn(Optional.of(permission));
        }
        when(permissionRepository.findByPermissionKeyIn(anyCollection())).thenAnswer(invocation -> {
            var keys = invocation.<java.util.Collection<String>>getArgument(0);
            return List.of(clubView, clubUpdate, userView).stream().filter(p -> keys.contains(p.getPermissionKey())).toList();
        });
        when(userPermissionRepository.findByUser_IdAndRevokedAtIsNullOrderByGrantedAtDesc(target.getId()))
                .thenAnswer(invocation -> List.copyOf(activeGrants));
        when(userPermissionRepository.saveAndFlush(any(UserPermission.class))).thenAnswer(invocation -> {
            UserPermission grant = invocation.getArgument(0);
            if (grant.getId() == null) grant.setId(UUID.randomUUID());
            return grant;
        });
    }

    private UserPermission held(Permission permission) {
        UserPermission grant = new UserPermission();
        grant.setId(UUID.randomUUID());
        grant.setUser(target);
        grant.setPermission(permission);
        grant.setScope(PermissionScope.CLUB);
        grant.setClub(club);
        activeGrants.add(grant);
        return grant;
    }

    private ReplacePermissionsRequest replaceWith(String... keys) {
        return new ReplacePermissionsRequest(PermissionScope.CLUB, club.getId(), null, Set.of(keys), null);
    }

    // ---- grant / revoke ----------------------------------------------------------------------------

    @Test
    void grantWritesBothTheGrantAndTheAuditTrail() {
        var response = service.grant(actor, target.getId(),
                new GrantPermissionRequest(clubUpdate.getId(), PermissionScope.CLUB, club.getId(), null, "elected"));
        assertThat(response.permissionKey()).isEqualTo("club.update");
        verify(authorization).require(actor, "permission.assign", null, null);
        verify(permissionAuditLogRepository).saveAndFlush(any());
        verify(audit).record(eq(admin.getId()), eq(AuditAction.PERMISSION_GRANTED), eq(response.id()), eq(club.getId()),
                any(), any());
    }

    @Test
    void grantValidatesScopeTargetAndDuplicates() {
        assertApiError(() -> service.grant(actor, target.getId(),
                new GrantPermissionRequest(userView.getId(), PermissionScope.CLUB, club.getId(), null, null)),
                HttpStatus.BAD_REQUEST, "PERMISSION_SCOPE_MISMATCH");
        assertApiError(() -> service.grant(actor, target.getId(),
                new GrantPermissionRequest(clubView.getId(), PermissionScope.CLUB, null, null, null)),
                HttpStatus.BAD_REQUEST, "INVALID_PERMISSION_SCOPE");
        assertApiError(() -> service.grant(actor, target.getId(),
                new GrantPermissionRequest(UUID.randomUUID(), PermissionScope.GLOBAL, null, null, null)),
                HttpStatus.NOT_FOUND, "PERMISSION_NOT_FOUND");
        clubView.setActive(false);
        assertApiError(() -> service.grant(actor, target.getId(),
                new GrantPermissionRequest(clubView.getId(), PermissionScope.GLOBAL, null, null, null)),
                HttpStatus.BAD_REQUEST, "PERMISSION_INACTIVE");

        UserPermission existing = held(clubUpdate);
        when(userPermissionRepository.findByUser_IdAndPermission_IdAndRevokedAtIsNullOrderByGrantedAtDesc(
                target.getId(), clubUpdate.getId())).thenReturn(List.of(existing));
        assertApiError(() -> service.grant(actor, target.getId(),
                new GrantPermissionRequest(clubUpdate.getId(), PermissionScope.CLUB, club.getId(), null, null)),
                HttpStatus.CONFLICT, "PERMISSION_ALREADY_GRANTED");
    }

    @Test
    void grantWithoutPermissionAssignTouchesNothing() {
        doThrow(FORBIDDEN).when(authorization).require(actor, "permission.assign", null, null);
        assertApiError(() -> service.grant(actor, target.getId(),
                new GrantPermissionRequest(clubView.getId(), PermissionScope.GLOBAL, null, null, null)),
                HttpStatus.FORBIDDEN, "PERMISSION_DENIED");
        verify(userPermissionRepository, never()).saveAndFlush(any());
    }

    @Test
    void revokeMarksTheGrantAndAuditsIt() {
        UserPermission grant = held(clubUpdate);
        when(userPermissionRepository.findByUser_IdAndPermission_IdAndRevokedAtIsNullOrderByGrantedAtDesc(
                target.getId(), clubUpdate.getId())).thenReturn(List.of(grant));

        service.revoke(actor, target.getId(), clubUpdate.getId(), null, null, null);

        assertThat(grant.getRevokedAt()).isNotNull();
        assertThat(grant.getRevokedBy()).isSameAs(admin);
        verify(audit).record(eq(admin.getId()), eq(AuditAction.PERMISSION_REVOKED), eq(grant.getId()), eq(club.getId()),
                any(), any());
    }

    @Test
    void revokeOfTwoMatchingGrantsNeedsAScope() {
        UserPermission clubGrant = held(clubUpdate);
        UserPermission globalGrant = held(clubUpdate);
        globalGrant.setScope(PermissionScope.GLOBAL);
        globalGrant.setClub(null);
        when(userPermissionRepository.findByUser_IdAndPermission_IdAndRevokedAtIsNullOrderByGrantedAtDesc(
                target.getId(), clubUpdate.getId())).thenReturn(List.of(clubGrant, globalGrant));
        assertApiError(() -> service.revoke(actor, target.getId(), clubUpdate.getId(), null, null, null),
                HttpStatus.BAD_REQUEST, "AMBIGUOUS_PERMISSION_GRANT");
        service.revoke(actor, target.getId(), clubUpdate.getId(), PermissionScope.GLOBAL, null, null);
        assertThat(globalGrant.getRevokedAt()).isNotNull();
        assertThat(clubGrant.getRevokedAt()).isNull();
    }

    // ---- replace (PUT) ------------------------------------------------------------------------------

    @Test
    void replaceGrantsMissingAndRevokesExtraPermissions() {
        UserPermission keep = held(clubView);
        UserPermission drop = held(clubUpdate);
        drop.setPermission(permission("member.view", PermissionScope.CLUB));

        var result = service.replace(actor, target.getId(), replaceWith("club.view", "club.update"));

        assertThat(result).extracting(r -> r.permissionKey()).containsExactly("club.update", "club.view");
        assertThat(keep.getRevokedAt()).isNull();
        assertThat(drop.getRevokedAt()).isNotNull();
        verify(authorization).require(actor, "permission.revoke", null, null);
        verify(audit).record(eq(admin.getId()), eq(AuditAction.PERMISSION_REVOKED), eq(drop.getId()), any(), any(), any());
        verify(audit).record(eq(admin.getId()), eq(AuditAction.PERMISSION_GRANTED), any(), eq(club.getId()), any(), any());
    }

    @Test
    void replaceThatOnlyAddsDoesNotNeedRevokePermission() {
        held(clubView);
        doThrow(FORBIDDEN).when(authorization).require(actor, "permission.revoke", null, null);
        var result = service.replace(actor, target.getId(), replaceWith("club.view", "club.update"));
        assertThat(result).hasSize(2);
    }

    @Test
    void replaceWithTheCurrentSetChangesNothing() {
        held(clubView);
        service.replace(actor, target.getId(), replaceWith("club.view"));
        verify(userPermissionRepository, never()).saveAndFlush(any());
        verify(audit, never()).record(any(), any(), any(), any(), any(), any());
    }

    @Test
    void replaceWithAnEmptySetRevokesEverythingAtThatTarget() {
        held(clubView);
        held(clubUpdate);
        assertThat(service.replace(actor, target.getId(), replaceWith())).isEmpty();
        verify(audit, times(2)).record(eq(admin.getId()), eq(AuditAction.PERMISSION_REVOKED), any(), any(), any(), any());
    }

    @Test
    void replaceIgnoresGrantsAtOtherTargets() {
        UserPermission elsewhere = held(clubUpdate);
        Club otherClub = new Club();
        otherClub.setId(UUID.randomUUID());
        elsewhere.setClub(otherClub);
        service.replace(actor, target.getId(), replaceWith("club.view"));
        assertThat(elsewhere.getRevokedAt()).isNull();
    }

    @Test
    void replaceValidatesEveryKeyBeforeChangingAnything() {
        UserPermission existing = held(clubUpdate);
        assertApiError(() -> service.replace(actor, target.getId(), replaceWith("club.view", "does.not.exist")),
                HttpStatus.NOT_FOUND, "PERMISSION_NOT_FOUND");
        assertApiError(() -> service.replace(actor, target.getId(), replaceWith("user.view")),
                HttpStatus.BAD_REQUEST, "PERMISSION_SCOPE_MISMATCH");
        assertApiError(() -> service.replace(actor, target.getId(),
                new ReplacePermissionsRequest(PermissionScope.CLUB, null, null, Set.of("club.view"), null)),
                HttpStatus.BAD_REQUEST, "INVALID_PERMISSION_SCOPE");
        assertThat(existing.getRevokedAt()).isNull();
        verify(userPermissionRepository, never()).saveAndFlush(any());
    }
}
