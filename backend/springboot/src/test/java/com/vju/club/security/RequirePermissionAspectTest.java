package com.vju.club.security;

import com.vju.club.error.ApiException;
import com.vju.club.modules.permission.annotation.RequirePermission;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.aop.aspectj.annotation.AspectJProxyFactory;
import org.springframework.http.HttpStatus;

import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;

class RequirePermissionAspectTest {
    public static class SampleService {
        @RequirePermission("audit.view")
        public String global(Actor actor) { return "ran"; }

        @RequirePermission(value = "club.update", clubId = "clubId")
        public String inClub(Actor actor, UUID clubId) { return "ran"; }

        @RequirePermission(value = "department.update", clubId = "clubId", departmentId = "departmentId")
        public String inDepartment(Actor actor, UUID clubId, UUID departmentId) { return "ran"; }

        @RequirePermission("audit.view")
        public String withoutActor(UUID something) { return "ran"; }

        @RequirePermission(value = "club.update", clubId = "clubIdd")
        public String typo(Actor actor, UUID clubId) { return "ran"; }

        public String unannotated(Actor actor) { return "ran"; }
    }

    private final PermissionAuthorizationService authorization = mock(PermissionAuthorizationService.class);
    private final Actor actor = new Actor(UUID.randomUUID());
    private SampleService service;

    @BeforeEach
    void setUp() {
        AspectJProxyFactory factory = new AspectJProxyFactory(new SampleService());
        factory.addAspect(new RequirePermissionAspect(authorization));
        service = factory.getProxy();
    }

    @Test
    void checksGlobalPermissionBeforeRunning() {
        assertThat(service.global(actor)).isEqualTo("ran");
        verify(authorization).require(actor, "audit.view", null, null);
    }

    @Test
    void passesTheNamedClubAndDepartmentIds() {
        UUID club = UUID.randomUUID();
        UUID department = UUID.randomUUID();
        service.inClub(actor, club);
        verify(authorization).require(actor, "club.update", club, null);
        service.inDepartment(actor, club, department);
        verify(authorization).require(actor, "department.update", club, department);
    }

    @Test
    void deniedPermissionStopsTheMethod() {
        doThrow(new ApiException(HttpStatus.FORBIDDEN, "PERMISSION_DENIED", "denied"))
                .when(authorization).require(actor, "audit.view", null, null);
        assertThatThrownBy(() -> service.global(actor)).isInstanceOf(ApiException.class);
    }

    @Test
    void misconfiguredAnnotationsFailLoudly() {
        assertThatThrownBy(() -> service.withoutActor(UUID.randomUUID()))
                .isInstanceOf(IllegalStateException.class).hasMessageContaining("Actor");
        assertThatThrownBy(() -> service.typo(actor, UUID.randomUUID()))
                .isInstanceOf(IllegalStateException.class).hasMessageContaining("clubIdd");
    }

    @Test
    void unannotatedMethodsAreNotChecked() {
        service.unannotated(actor);
        verify(authorization, never()).require(any(), any(), any(), any());
    }
}
