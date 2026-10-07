package com.vju.club.security;

import com.vju.club.error.ApiException;
import com.vju.club.modules.permission.repository.UserPermissionRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;

import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class PermissionAuthorizationServiceTest {

    @Mock UserPermissionRepository repository;
    @InjectMocks PermissionAuthorizationService service;

    private final UUID userId = UUID.randomUUID();
    private final Actor actor = new Actor(userId);
    private final UUID clubId = UUID.randomUUID();
    private final UUID departmentId = UUID.randomUUID();

    @Test
    void departmentGrantIsCheckedFirst() {
        when(repository.hasInDepartment(userId, "k", departmentId)).thenReturn(true);
        assertThat(service.hasPermission(actor, "k", clubId, departmentId)).isTrue();
        verify(repository, never()).hasInClub(any(), any(), any());
    }

    @Test
    void clubGrantCoversDepartmentsOfThatClub() {
        when(repository.hasInClub(userId, "k", clubId)).thenReturn(true);
        assertThat(service.hasPermission(actor, "k", clubId, departmentId)).isTrue();
    }

    @Test
    void globalGrantIsTheFallback() {
        when(repository.hasGlobal(userId, "k")).thenReturn(true);
        assertThat(service.hasPermission(actor, "k", clubId, departmentId)).isTrue();
    }

    @Test
    void noGrantMeansDenied() {
        assertThat(service.hasPermission(actor, "k", clubId, departmentId)).isFalse();
        assertThatThrownBy(() -> service.require(actor, "k", clubId, null))
                .isInstanceOfSatisfying(ApiException.class, e -> assertThat(e.getStatus()).isEqualTo(HttpStatus.FORBIDDEN));
    }

    @Test
    void missingActorIsDeniedWithoutQueries() {
        assertThat(service.hasPermission(null, "k", clubId, departmentId)).isFalse();
        assertThat(service.hasGlobalPermission(null, "k")).isFalse();
        assertThat(service.hasAnyPermission(null, "k")).isFalse();
        verifyNoInteractions(repository);
    }

    @Test
    void actorRequiresAnId() {
        assertThatThrownBy(() -> new Actor(null)).isInstanceOf(NullPointerException.class);
    }

    @Test
    void missingResourceIs404OnlyForGlobalHolders() {
        ApiException notFound = new ApiException(HttpStatus.NOT_FOUND, "X_NOT_FOUND", "missing");
        when(repository.hasGlobal(userId, "k")).thenReturn(true);
        assertThat(service.missingResource(actor, "k", notFound)).isSameAs(notFound);
        assertThat(service.missingResource(new Actor(UUID.randomUUID()), "k", notFound).getStatus())
                .isEqualTo(HttpStatus.FORBIDDEN);
    }
}
