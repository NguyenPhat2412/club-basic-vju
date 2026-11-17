package com.vju.club.service;

import com.vju.club.mapper.UserMapperImpl;

import com.vju.club.service.impl.AuthServiceImpl;

import com.vju.club.enums.AuditAction;
import com.vju.club.enums.PermissionScope;
import com.vju.club.dto.request.ChangePasswordRequest;
import com.vju.club.dto.request.ForgotPasswordRequest;
import com.vju.club.dto.request.LoginRequest;
import com.vju.club.entity.Role;
import com.vju.club.entity.User;
import com.vju.club.entity.UserRole;
import com.vju.club.enums.UserStatus;
import com.vju.club.error.ApiException;
import com.vju.club.repository.RoleRepository;
import com.vju.club.repository.UserRepository;
import com.vju.club.repository.UserRoleRepository;
import com.vju.club.security.ClubPrincipal;
import com.vju.club.security.GrantGuard;
import org.springframework.test.util.ReflectionTestUtils;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;
import org.springframework.http.HttpStatus;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.DisabledException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class AuthServiceTest {
    private static final PasswordEncoder ENCODER = new BCryptPasswordEncoder(4);

    @Mock UserRepository userRepository;
    @Mock AuthenticationManager authenticationManager;
    @Mock UserSessionService userSessionService;
    @Mock AuditService auditService;
    @Mock NotificationService notificationService;
    @Mock UserRoleRepository userRoleRepository;
    @Mock RoleRepository roleRepository;

    private AuthService service;

    @BeforeEach
    void setUp() {
        service = new AuthServiceImpl(userRepository, ENCODER, authenticationManager, userSessionService,
                auditService, new UserMapperImpl(), new com.vju.club.config.GoogleSignInProperties(), null);
        when(userRepository.saveAndFlush(any(User.class))).thenAnswer(invocation -> {
            User u = invocation.getArgument(0);
            if (u.getId() == null) {
                u.setId(UUID.randomUUID());
            }
            return u;
        });
    }

    private static User user(String email, String password, UserStatus status) {
        User user = new User();
        user.setId(UUID.randomUUID());
        user.setEmail(email);
        user.setFullName("Test User");
        user.setPasswordHash(ENCODER.encode(password));
        user.setStatus(status);
        return user;
    }

    private static Authentication authenticated(User user) {
        ClubPrincipal principal = new ClubPrincipal(user.getId(), user.getEmail(), user.getPasswordHash(), true);
        return UsernamePasswordAuthenticationToken.authenticated(principal, null, List.of());
    }

    private static void assertApiError(Runnable call, HttpStatus status, String code) {
        assertThatThrownBy(call::run)
                .isInstanceOfSatisfying(ApiException.class, error -> {
                    assertThat(error.getStatus()).isEqualTo(status);
                    assertThat(error.getCode()).isEqualTo(code);
                });
    }

    @Nested
    class Login {
        @Test
        void authenticatesNormalizedEmailAndReturnsPrincipalForTheSession() {
            User user = user("user@example.com", "password123", UserStatus.ACTIVE);
            when(authenticationManager.authenticate(any())).thenReturn(authenticated(user));
            when(userRepository.findById(user.getId())).thenReturn(Optional.of(user));

            var signedIn = service.login(new LoginRequest(" USER@example.com ", "password123"));

            ArgumentCaptor<Authentication> attempt = ArgumentCaptor.forClass(Authentication.class);
            verify(authenticationManager).authenticate(attempt.capture());
            assertThat(attempt.getValue().getName()).isEqualTo("user@example.com");
            assertThat(signedIn.principal().id()).isEqualTo(user.getId());
            assertThat(signedIn.response().user().email()).isEqualTo("user@example.com");
            verify(auditService).record(eq(user.getId()), eq(AuditAction.USER_LOGGED_IN), eq(user.getId()), eq(null), eq(null), any());
        }

        @Test
        void wrongPasswordIsInvalidCredentials() {
            when(authenticationManager.authenticate(any())).thenThrow(new BadCredentialsException("bad"));
            when(userRepository.findByEmailIgnoreCase("user@example.com"))
                    .thenReturn(Optional.of(user("user@example.com", "password123", UserStatus.ACTIVE)));
            assertApiError(() -> service.login(new LoginRequest("user@example.com", "wrong")),
                    HttpStatus.UNAUTHORIZED, "INVALID_CREDENTIALS");
        }

        @Test
        void unknownEmailIsInvalidCredentials() {
            when(authenticationManager.authenticate(any())).thenThrow(new BadCredentialsException("bad"));
            when(userRepository.findByEmailIgnoreCase(any())).thenReturn(Optional.empty());
            assertApiError(() -> service.login(new LoginRequest("ghost@example.com", "password123")),
                    HttpStatus.UNAUTHORIZED, "INVALID_CREDENTIALS");
        }

        @Test
        void inactiveAccountWithWrongPasswordDoesNotRevealItsStatus() {
            when(authenticationManager.authenticate(any())).thenThrow(new DisabledException("disabled"));
            when(userRepository.findByEmailIgnoreCase("user@example.com"))
                    .thenReturn(Optional.of(user("user@example.com", "password123", UserStatus.INACTIVE)));
            assertApiError(() -> service.login(new LoginRequest("user@example.com", "wrong-password")),
                    HttpStatus.UNAUTHORIZED, "INVALID_CREDENTIALS");
        }

        @Test
        void inactiveAccountWithCorrectPasswordIsToldItIsInactive() {
            when(authenticationManager.authenticate(any())).thenThrow(new DisabledException("disabled"));
            when(userRepository.findByEmailIgnoreCase("user@example.com"))
                    .thenReturn(Optional.of(user("user@example.com", "password123", UserStatus.INACTIVE)));
            assertApiError(() -> service.login(new LoginRequest("user@example.com", "password123")),
                    HttpStatus.FORBIDDEN, "ACCOUNT_INACTIVE");
        }
    }

    @Nested
    class ChangePassword {
        @Test
        void requiresCurrentPassword() {
            User user = user("user@example.com", "password123", UserStatus.ACTIVE);
            when(userRepository.findById(user.getId())).thenReturn(Optional.of(user));
            assertApiError(() -> service.changePassword(user.getId(),
                            new ChangePasswordRequest("wrong", "NewPassword1"), "current"),
                    HttpStatus.BAD_REQUEST, "CURRENT_PASSWORD_INVALID");
            verify(userSessionService, never()).endSessionsExcept(any(), anyString());
        }

        @Test
        void storesNewHashAndEndsEveryOtherSession() {
            User user = user("user@example.com", "password123", UserStatus.ACTIVE);
            when(userRepository.findById(user.getId())).thenReturn(Optional.of(user));

            service.changePassword(user.getId(), new ChangePasswordRequest("password123", "NewPassword1"), "current");

            assertThat(ENCODER.matches("NewPassword1", user.getPasswordHash())).isTrue();
            verify(userSessionService).endSessionsExcept(user.getId(), "current");
        }

        @Test
        void missingUserIsNotFound() {
            UUID id = UUID.randomUUID();
            when(userRepository.findById(id)).thenReturn(Optional.empty());
            assertApiError(() -> service.changePassword(id, new ChangePasswordRequest("a", "NewPassword1"), "current"),
                    HttpStatus.NOT_FOUND, "USER_NOT_FOUND");
        }
    }

    @Nested
    class ForgotPassword {
        @BeforeEach
        void wireOptionalCollaborators() {
            ReflectionTestUtils.setField(service, "notificationService", notificationService);
            ReflectionTestUtils.setField(service, "userRoleRepository", userRoleRepository);
            ReflectionTestUtils.setField(service, "roleRepository", roleRepository);
        }

        @Test
        void silentlyIgnoresUnknownOrInactiveAccountsToPreventEnumeration() {
            when(userRepository.findByEmailIgnoreCase("ghost@st.vju.ac.vn")).thenReturn(Optional.empty());
            User inactive = user("inactive@st.vju.ac.vn", "password123", UserStatus.INACTIVE);
            when(userRepository.findByEmailIgnoreCase("inactive@st.vju.ac.vn")).thenReturn(Optional.of(inactive));

            service.requestPasswordReset(new ForgotPasswordRequest(" ghost@st.vju.ac.vn ", "23110209", "Quên MK"));
            service.requestPasswordReset(new ForgotPasswordRequest("inactive@st.vju.ac.vn", null, null));

            verify(auditService, never()).record(any(), any(), any(), any(), any(), any());
            verify(notificationService, never()).create(any(), anyString(), anyString(), anyString(), any(), anyString());
        }

        @Test
        void recordsAuditAndNotifiesActiveSystemAdminsForActiveAccount() {
            User target = user("student@st.vju.ac.vn", "password123", UserStatus.ACTIVE);
            target.setStudentCode("23110209");
            when(userRepository.findByEmailIgnoreCase("student@st.vju.ac.vn")).thenReturn(Optional.of(target));

            Role sysAdminRole = new Role();
            sysAdminRole.setId(UUID.randomUUID());
            sysAdminRole.setCode(GrantGuard.SYSTEM_ADMIN);
            when(roleRepository.findByCode(GrantGuard.SYSTEM_ADMIN)).thenReturn(Optional.of(sysAdminRole));

            User activeAdmin = user("admin@vju.ac.vn", "password123", UserStatus.ACTIVE);
            User inactiveAdmin = user("retired-admin@vju.ac.vn", "password123", UserStatus.INACTIVE);
            UserRole holder1 = new UserRole();
            holder1.setUser(activeAdmin);
            holder1.setRole(sysAdminRole);
            UserRole holder2 = new UserRole();
            holder2.setUser(inactiveAdmin);
            holder2.setRole(sysAdminRole);
            when(userRoleRepository.findActiveHoldersForTarget(sysAdminRole.getId(), PermissionScope.GLOBAL, null, null))
                    .thenReturn(List.of(holder1, holder2));

            service.requestPasswordReset(new ForgotPasswordRequest(
                    " STUDENT@st.vju.ac.vn ", " 23110209 ", "Em quên mật khẩu cổng CLB"));

            verify(auditService).record(eq(null), eq(AuditAction.USER_PASSWORD_RESET), eq(target.getId()), eq(null), eq(null), any());
            ArgumentCaptor<String> msgCaptor = ArgumentCaptor.forClass(String.class);
            verify(notificationService).create(
                    eq(activeAdmin.getId()),
                    eq("Yêu cầu đặt lại mật khẩu: student@st.vju.ac.vn"),
                    msgCaptor.capture(),
                    eq("USER"),
                    eq(target.getId()),
                    anyString());
            assertThat(msgCaptor.getValue())
                    .contains("23110209")
                    .contains("khớp hồ sơ")
                    .contains("Em quên mật khẩu cổng CLB");
            verify(notificationService, never()).create(eq(inactiveAdmin.getId()), anyString(), anyString(), anyString(), any(), anyString());
        }
    }
}
