package com.vju.club.department;

import com.vju.club.modules.department.mapper.DepartmentMapperImpl;
import com.vju.club.modules.department.service.DepartmentService;

import com.vju.club.modules.department.service.impl.DepartmentServiceImpl;

import com.vju.club.modules.audit.enums.AuditAction;
import com.vju.club.modules.audit.service.AuditService;
import com.vju.club.modules.department.dto.request.DepartmentPatchRequest;
import com.vju.club.modules.department.dto.request.DepartmentRequest;
import com.vju.club.modules.department.dto.request.DepartmentStatusRequest;
import com.vju.club.modules.club.entity.Club;
import com.vju.club.modules.club.enums.ClubStatus;
import com.vju.club.modules.department.entity.Department;
import com.vju.club.modules.department.enums.DepartmentStatus;
import com.vju.club.error.ApiException;
import com.vju.club.modules.club.repository.ClubRepository;
import com.vju.club.modules.department.repository.DepartmentRepository;
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

import java.util.Optional;
import java.util.UUID;

import static com.vju.club.support.PermissionChecks.withPermissionChecks;
import static com.vju.club.support.ApiErrors.FORBIDDEN;
import static com.vju.club.support.ApiErrors.assertApiError;
import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class DepartmentServiceTest {
    @Mock DepartmentRepository departmentRepository;
    @Mock ClubRepository clubRepository;
    @Mock AuditService audit;
    @Mock PermissionAuthorizationService authorization;

    private DepartmentService service;
    private final Actor actor = new Actor(UUID.randomUUID());
    private final Club club = new Club();
    private final Department department = new Department();

    @BeforeEach
    void setUp() {
        service = withPermissionChecks(new DepartmentServiceImpl(departmentRepository, clubRepository, audit, authorization, new DepartmentMapperImpl()), authorization);
        club.setId(UUID.randomUUID());
        club.setStatus(ClubStatus.ACTIVE);
        department.setId(UUID.randomUUID());
        department.setClub(club);
        department.setName("Media");
        when(clubRepository.findById(club.getId())).thenReturn(Optional.of(club));
        when(departmentRepository.findById(department.getId())).thenReturn(Optional.of(department));
        when(departmentRepository.saveAndFlush(any(Department.class))).thenAnswer(invocation -> {
            Department saved = invocation.getArgument(0);
            if (saved.getId() == null) saved.setId(UUID.randomUUID());
            return saved;
        });
    }

    @Test
    void createInActiveClubTrimsNameAndIsAudited() {
        var created = service.create(actor, club.getId(), new DepartmentRequest("  Events ", null));
        assertThat(created.name()).isEqualTo("Events");
        verify(authorization).require(actor, "department.create", club.getId(), null);
        verify(audit).record(eq(actor.id()), eq(AuditAction.DEPARTMENT_CREATED), eq(created.id()), eq(club.getId()),
                isNull(), any());
    }

    @Test
    void createRejectsMissingOrInactiveClubAndDuplicateName() {
        UUID missing = UUID.randomUUID();
        when(clubRepository.findById(missing)).thenReturn(Optional.empty());
        assertApiError(() -> service.create(actor, missing, new DepartmentRequest("X", null)), HttpStatus.NOT_FOUND, "CLUB_NOT_FOUND");

        when(departmentRepository.existsByClub_IdAndNameIgnoreCase(club.getId(), "Media")).thenReturn(true);
        assertApiError(() -> service.create(actor, club.getId(), new DepartmentRequest("Media", null)),
                HttpStatus.CONFLICT, "DEPARTMENT_NAME_ALREADY_EXISTS");

        club.setStatus(ClubStatus.INACTIVE);
        assertApiError(() -> service.create(actor, club.getId(), new DepartmentRequest("Other", null)),
                HttpStatus.CONFLICT, "CLUB_INACTIVE");
        verify(departmentRepository, never()).saveAndFlush(any());
    }

    @Test
    void updateChecksPermissionAtDepartmentAndItsClub() {
        service.update(actor, department.getId(), new DepartmentPatchRequest(null, "New description"));
        verify(authorization).require(actor, "department.update", club.getId(), department.getId());
        assertThat(department.getDescription()).isEqualTo("New description");
        verify(audit).recordChange(eq(actor.id()), eq(AuditAction.DEPARTMENT_UPDATED), eq(department.getId()),
                eq(club.getId()), any(), any());
    }

    @Test
    void renameAllowsCaseChangeButNotAnotherDepartmentsName() {
        service.update(actor, department.getId(), new DepartmentPatchRequest("MEDIA", null));
        assertThat(department.getName()).isEqualTo("MEDIA");

        when(departmentRepository.existsByClub_IdAndNameIgnoreCase(club.getId(), "Events")).thenReturn(true);
        assertApiError(() -> service.update(actor, department.getId(), new DepartmentPatchRequest("Events", null)),
                HttpStatus.CONFLICT, "DEPARTMENT_NAME_ALREADY_EXISTS");
        assertApiError(() -> service.update(actor, department.getId(), new DepartmentPatchRequest(" ", null)),
                HttpStatus.BAD_REQUEST, "INVALID_DEPARTMENT_NAME");
    }

    @Test
    void missingDepartmentIsNotFoundOnlyForGlobalHolders() {
        UUID ghost = UUID.randomUUID();
        when(departmentRepository.findById(ghost)).thenReturn(Optional.empty());
        ApiException notFoundOrForbidden = FORBIDDEN;
        when(authorization.missingResource(eq(actor), anyString(), any())).thenReturn(notFoundOrForbidden);
        assertApiError(() -> service.get(actor, ghost), HttpStatus.FORBIDDEN, "PERMISSION_DENIED");
        verify(authorization).missingResource(eq(actor), eq("department.view"), any());
    }

    @Test
    void deniedUpdateChangesNothing() {
        doThrow(FORBIDDEN).when(authorization).require(actor, "department.update", club.getId(), department.getId());
        assertApiError(() -> service.update(actor, department.getId(), new DepartmentPatchRequest("Hacked", null)),
                HttpStatus.FORBIDDEN, "PERMISSION_DENIED");
        assertThat(department.getName()).isEqualTo("Media");
        verify(departmentRepository, never()).saveAndFlush(any());
    }

    @Test
    void statusChangeUsesDirectionSpecificPermission() {
        service.updateStatus(actor, department.getId(), new DepartmentStatusRequest(DepartmentStatus.INACTIVE));
        verify(authorization).require(actor, "department.inactive", club.getId(), department.getId());
        verify(audit).recordChange(eq(actor.id()), eq(AuditAction.DEPARTMENT_DEACTIVATED), any(), any(), any(), any());
        service.updateStatus(actor, department.getId(), new DepartmentStatusRequest(DepartmentStatus.ACTIVE));
        verify(authorization).require(actor, "department.activate", club.getId(), department.getId());
    }
}
