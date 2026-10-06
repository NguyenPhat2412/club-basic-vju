package com.vju.club.club;

import com.vju.club.audit.AuditAction;
import com.vju.club.audit.AuditService;
import com.vju.club.club.dto.ClubPatchRequest;
import com.vju.club.club.dto.ClubRequest;
import com.vju.club.club.dto.ClubStatusRequest;
import com.vju.club.entity.Club;
import com.vju.club.entity.ClubStatus;
import com.vju.club.repository.ClubRepository;
import com.vju.club.security.Actor;
import com.vju.club.security.PermissionAuthorizationService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;

import java.util.Map;
import java.util.Optional;
import java.util.UUID;

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
class ClubServiceTest {

    @Mock ClubRepository clubRepository;
    @Mock PermissionAuthorizationService authorization;
    @Mock AuditService audit;

    private ClubService service;
    private final Actor actor = new Actor(UUID.randomUUID());

    @BeforeEach
    void setUp() {
        service = new ClubService(clubRepository, authorization, audit);
        when(clubRepository.saveAndFlush(any(Club.class))).thenAnswer(invocation -> {
            Club club = invocation.getArgument(0);
            if (club.getId() == null) club.setId(UUID.randomUUID());
            return club;
        });
    }

    private static Club club(String code) {
        Club club = new Club();
        club.setId(UUID.randomUUID());
        club.setCode(code);
        club.setName("Club " + code);
        return club;
    }

    private static ClubPatchRequest patch(String code, String name, String description) {
        return new ClubPatchRequest(code, name, null, null, description, null, null);
    }

    @Test
    void createTrimsInputRequiresPermissionAndIsAudited() {
        var response = service.create(actor, new ClubRequest("  VJUA ", " VJU Academic ", null, null, "d", "Học thuật", null));

        assertThat(response.code()).isEqualTo("VJUA");
        assertThat(response.name()).isEqualTo("VJU Academic");
        verify(authorization).require(actor, "club.create", null, null);
        verify(audit).record(eq(actor.id()), eq(AuditAction.CLUB_CREATED), eq(response.id()), eq(response.id()),
                isNull(), any());
    }

    @Test
    void createRejectsDuplicateCode() {
        when(clubRepository.existsByCodeIgnoreCase("VJUA")).thenReturn(true);
        assertApiError(() -> service.create(actor, new ClubRequest("VJUA", "n", null, null, null, null, null)),
                HttpStatus.CONFLICT, "CLUB_CODE_ALREADY_EXISTS");
        verify(clubRepository, never()).saveAndFlush(any());
    }

    @Test
    void createWithoutPermissionTouchesNothing() {
        doThrow(FORBIDDEN).when(authorization).require(actor, "club.create", null, null);
        assertApiError(() -> service.create(actor, new ClubRequest("X", "n", null, null, null, null, null)),
                HttpStatus.FORBIDDEN, "PERMISSION_DENIED");
        verify(clubRepository, never()).saveAndFlush(any());
        verify(audit, never()).record(any(), any(), any(), any(), any(), any());
    }

    @Test
    void updateChecksPermissionInThatClubAndAuditsTheChange() {
        Club club = club("A");
        when(clubRepository.findById(club.getId())).thenReturn(Optional.of(club));

        service.update(actor, club.getId(), patch(null, " Renamed ", null));

        verify(authorization).require(actor, "club.update", club.getId(), null);
        assertThat(club.getName()).isEqualTo("Renamed");
        @SuppressWarnings("unchecked")
        ArgumentCaptor<Map<String, ?>> before = ArgumentCaptor.forClass(Map.class);
        @SuppressWarnings("unchecked")
        ArgumentCaptor<Map<String, ?>> after = ArgumentCaptor.forClass(Map.class);
        verify(audit).recordChange(eq(actor.id()), eq(AuditAction.CLUB_UPDATED), eq(club.getId()), eq(club.getId()),
                before.capture(), after.capture());
        assertThat(before.getValue().get("name")).isEqualTo("Club A");
        assertThat(after.getValue().get("name")).isEqualTo("Renamed");
    }

    @Test
    void updateRejectsBlankValuesAndCodeTakenByAnotherClub() {
        Club club = club("A");
        when(clubRepository.findById(club.getId())).thenReturn(Optional.of(club));
        assertApiError(() -> service.update(actor, club.getId(), patch(null, "  ", null)), HttpStatus.BAD_REQUEST, "INVALID_CLUB_NAME");
        assertApiError(() -> service.update(actor, club.getId(), patch(" ", null, null)), HttpStatus.BAD_REQUEST, "INVALID_CLUB_CODE");
        when(clubRepository.existsByCodeIgnoreCase("B")).thenReturn(true);
        assertApiError(() -> service.update(actor, club.getId(), patch("B", null, null)), HttpStatus.CONFLICT, "CLUB_CODE_ALREADY_EXISTS");
    }

    @Test
    void updateOfMissingClubIsNotFound() {
        UUID id = UUID.randomUUID();
        when(clubRepository.findById(id)).thenReturn(Optional.empty());
        assertApiError(() -> service.update(actor, id, patch(null, "x", null)), HttpStatus.NOT_FOUND, "CLUB_NOT_FOUND");
    }

    @Test
    void statusChangeUsesDirectionSpecificPermissionAndAuditAction() {
        Club club = club("A");
        when(clubRepository.findById(club.getId())).thenReturn(Optional.of(club));

        service.updateStatus(actor, club.getId(), new ClubStatusRequest(ClubStatus.INACTIVE));
        verify(authorization).require(actor, "club.inactive", club.getId(), null);
        verify(audit).recordChange(eq(actor.id()), eq(AuditAction.CLUB_DEACTIVATED), eq(club.getId()), eq(club.getId()),
                any(), any());

        service.updateStatus(actor, club.getId(), new ClubStatusRequest(ClubStatus.ACTIVE));
        verify(authorization).require(actor, "club.active", club.getId(), null);
        assertThat(club.getStatus()).isEqualTo(ClubStatus.ACTIVE);
    }

    @Test
    void activeUserWithoutClubViewCanDiscoverActiveClubs() {
        Club active = club("ACTIVE");
        active.setStatus(ClubStatus.ACTIVE);
        when(authorization.hasGlobalPermission(actor, "club.view")).thenReturn(false);
        when(authorization.hasAnyPermission(actor, "club.view")).thenReturn(false);
        when(clubRepository.searchDiscoverable(anyString(), eq(""), any(Pageable.class)))
                .thenReturn(java.util.List.of(active));
        when(clubRepository.countDiscoverable(anyString(), eq(""))).thenReturn(1L);

        var page = service.list(actor, "", null, null, 0, 20);

        assertThat(page.items()).extracting(response -> response.code()).containsExactly("ACTIVE");
        verify(authorization, never()).require(actor, "club.view", null, null);
    }

    @Test
    void globalViewerCanFilterByCategoryAndStatus() {
        when(authorization.hasGlobalPermission(actor, "club.view")).thenReturn(true);
        when(clubRepository.search(anyString(), eq("Arts"), eq(ClubStatus.INACTIVE), any(Pageable.class)))
                .thenReturn(java.util.List.of());
        when(clubRepository.countSearch(anyString(), eq("Arts"), eq(ClubStatus.INACTIVE))).thenReturn(0L);

        service.list(actor, "music", "Arts", ClubStatus.INACTIVE, 0, 20);

        verify(clubRepository).search(eq("%music%"), eq("Arts"), eq(ClubStatus.INACTIVE), any(Pageable.class));
        verify(clubRepository).countSearch(eq("%music%"), eq("Arts"), eq(ClubStatus.INACTIVE));
    }

    @Test
    void activeUserWithoutClubViewCanGetAnActiveClub() {
        UUID id = UUID.randomUUID();
        Club active = club("ACTIVE");
        when(authorization.hasAnyPermission(actor, "club.view")).thenReturn(false);
        when(clubRepository.findByIdAndStatus(id, ClubStatus.ACTIVE)).thenReturn(Optional.of(active));

        assertThat(service.get(actor, id).id()).isEqualTo(active.getId());
        verify(authorization, never()).require(actor, "club.view", id, null);
    }

    @Test
    void permissionedGetStillRequiresClubViewBeforeLookingTheClubUp() {
        UUID id = UUID.randomUUID();
        when(authorization.hasAnyPermission(actor, "club.view")).thenReturn(true);
        doThrow(FORBIDDEN).when(authorization).require(actor, "club.view", id, null);
        assertApiError(() -> service.get(actor, id), HttpStatus.FORBIDDEN, "PERMISSION_DENIED");
        verify(clubRepository, never()).findById(any());
    }
}
