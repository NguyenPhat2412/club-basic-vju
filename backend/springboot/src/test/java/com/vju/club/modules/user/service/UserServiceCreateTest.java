package com.vju.club.modules.user.service;

import com.vju.club.error.ApiException;
import com.vju.club.modules.audit.enums.AuditAction;
import com.vju.club.modules.audit.service.AuditService;
import com.vju.club.modules.user.dto.request.CreateUserRequest;
import com.vju.club.modules.user.entity.User;
import com.vju.club.modules.user.enums.UserStatus;
import com.vju.club.modules.user.mapper.UserMapperImpl;
import com.vju.club.modules.user.repository.UserRepository;
import com.vju.club.modules.user.service.impl.UserServiceImpl;
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
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class UserServiceCreateTest {

    private static final PasswordEncoder ENCODER = new BCryptPasswordEncoder(4);
    private static final Actor ADMIN = new Actor(UUID.randomUUID());

    @Mock UserRepository userRepository;
    @Mock PermissionAuthorizationService authorizationService;
    @Mock AuditService auditService;
    @Mock com.vju.club.modules.auth.service.UserSessionService userSessionService;

    UserServiceImpl service;

    @BeforeEach
    void setUp() {
        service = new UserServiceImpl(userRepository, authorizationService, auditService, new UserMapperImpl(), ENCODER, userSessionService);
        when(userRepository.saveAndFlush(any(User.class))).thenAnswer(invocation -> {
            User user = invocation.getArgument(0);
            user.setId(UUID.randomUUID());
            return user;
        });
    }

    private static void assertApiError(Runnable call, HttpStatus status, String code) {
        assertThatThrownBy(call::run).isInstanceOfSatisfying(ApiException.class, error -> {
            assertThat(error.getStatus()).isEqualTo(status);
            assertThat(error.getCode()).isEqualTo(code);
        });
    }

    @Test
    void hashesPasswordNormalizesInputAndAuditsTheAdmin() {
        service.create(ADMIN, new CreateUserRequest("  USER@Example.com ", "password123", "  Test User ", " SV001 ", "  "));

        ArgumentCaptor<User> captor = ArgumentCaptor.forClass(User.class);
        verify(userRepository).saveAndFlush(captor.capture());
        User saved = captor.getValue();
        assertThat(saved.getEmail()).isEqualTo("user@example.com");
        assertThat(saved.getFullName()).isEqualTo("Test User");
        assertThat(saved.getStudentCode()).isEqualTo("SV001");
        assertThat(saved.getPhone()).isNull();
        assertThat(saved.getStatus()).isEqualTo(UserStatus.ACTIVE);
        assertThat(ENCODER.matches("password123", saved.getPasswordHash())).isTrue();
        verify(auditService).record(eq(ADMIN.id()), eq(AuditAction.USER_CREATED), eq(saved.getId()), isNull(), isNull(), any());
    }

    @Test
    void rejectsDuplicateEmail() {
        when(userRepository.existsByEmailIgnoreCase("user@example.com")).thenReturn(true);
        assertApiError(() -> service.create(ADMIN, new CreateUserRequest("user@example.com", "password123", "Test", null, null)),
                HttpStatus.CONFLICT, "EMAIL_ALREADY_EXISTS");
        verify(userRepository, never()).saveAndFlush(any());
    }

    @Test
    void rejectsDuplicateStudentCode() {
        when(userRepository.existsByStudentCodeIgnoreCase("SV001")).thenReturn(true);
        assertApiError(() -> service.create(ADMIN, new CreateUserRequest("new@example.com", "password123", "Test", "SV001", null)),
                HttpStatus.CONFLICT, "STUDENT_CODE_ALREADY_EXISTS");
        verify(userRepository, never()).saveAndFlush(any());
    }

    @Test
    void blankStudentCodeIsStoredAsNullAndNotCheckedForDuplicates() {
        service.create(ADMIN, new CreateUserRequest("a@example.com", "password123", "Test", "   ", null));
        verify(userRepository, never()).existsByStudentCodeIgnoreCase(any());
    }
}
