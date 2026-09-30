package com.vju.club.security;

import com.vju.club.entity.PermissionScope;
import com.vju.club.error.ApiException;
import com.vju.club.repository.UserPermissionRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.security.authentication.TestingAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;

import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class PermissionAuthorizationServiceTest {

    @Mock UserPermissionRepository repository;
    @InjectMocks PermissionAuthorizationService service;

    private final UUID userId = UUID.randomUUID();
    private final UUID clubId = UUID.randomUUID();
    private final UUID departmentId = UUID.randomUUID();

    private Authentication jwtFor(String subject) {
        Jwt jwt = Jwt.withTokenValue("token").header("alg", "HS256").subject(subject).build();
        return new JwtAuthenticationToken(jwt, List.of());
    }

    @Test
    void departmentGrantIsCheckedFirst() {
        when(repository.existsForDepartment(userId, "k", PermissionScope.DEPARTMENT, departmentId)).thenReturn(true);
        assertThat(service.hasPermission(jwtFor(userId.toString()), "k", clubId, departmentId)).isTrue();
        verify(repository, never()).existsForClub(any(), any(), any(), any());
    }

    @Test
    void clubGrantCoversDepartmentsOfThatClub() {
        when(repository.existsForClub(userId, "k", PermissionScope.CLUB, clubId)).thenReturn(true);
        assertThat(service.hasPermission(jwtFor(userId.toString()), "k", clubId, departmentId)).isTrue();
    }

    @Test
    void globalGrantIsTheFallback() {
        when(repository.existsGlobal(userId, "k", PermissionScope.GLOBAL)).thenReturn(true);
        assertThat(service.hasPermission(jwtFor(userId.toString()), "k", clubId, departmentId)).isTrue();
    }

    @Test
    void noGrantMeansDenied() {
        assertThat(service.hasPermission(jwtFor(userId.toString()), "k", clubId, departmentId)).isFalse();
        assertThatThrownBy(() -> service.require(jwtFor(userId.toString()), "k", clubId, null))
                .isInstanceOfSatisfying(ApiException.class, e -> assertThat(e.getStatus()).isEqualTo(HttpStatus.FORBIDDEN));
    }

    @Test
    void nullNonJwtOrMalformedSubjectAreDeniedWithoutQueries() {
        assertThat(service.hasPermission(null, "k", null, null)).isFalse();
        assertThat(service.hasPermission(new TestingAuthenticationToken("u", "p", "ROLE_X"), "k", null, null)).isFalse();
        assertThat(service.hasPermission(jwtFor("not-a-uuid"), "k", null, null)).isFalse();
        assertThat(service.hasGlobalPermission(jwtFor("not-a-uuid"), "k")).isFalse();
        assertThat(service.hasAnyPermission(null, "k")).isFalse();
        verify(repository, never()).existsGlobal(any(), any(), any());
    }

    @Test
    void missingResourceIs404OnlyForGlobalHolders() {
        ApiException notFound = new ApiException(HttpStatus.NOT_FOUND, "X_NOT_FOUND", "missing");
        when(repository.existsGlobal(userId, "k", PermissionScope.GLOBAL)).thenReturn(true);
        assertThat(service.missingResource(jwtFor(userId.toString()), "k", notFound)).isSameAs(notFound);

        UUID other = UUID.randomUUID();
        assertThat(service.missingResource(jwtFor(other.toString()), "k", notFound).getStatus())
                .isEqualTo(HttpStatus.FORBIDDEN);
    }
}
