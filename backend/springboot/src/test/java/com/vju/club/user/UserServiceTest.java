package com.vju.club.user;

import com.vju.club.error.ApiException;
import com.vju.club.modules.audit.enums.AuditAction;
import com.vju.club.modules.audit.service.AuditService;
import com.vju.club.modules.user.common.UserConstants;
import com.vju.club.modules.user.dto.request.AdminUpdateUserRequest;
import com.vju.club.modules.user.dto.response.UserResponse;
import com.vju.club.modules.user.entity.User;
import com.vju.club.modules.user.enums.UserStatus;
import com.vju.club.modules.user.mapper.UserMapperImpl;
import com.vju.club.modules.user.repository.UserRepository;
import com.vju.club.modules.user.service.UserService;
import com.vju.club.modules.user.service.impl.UserServiceImpl;
import com.vju.club.security.Actor;
import com.vju.club.security.PermissionAuthorizationService;
import org.springframework.security.crypto.password.PasswordEncoder;
import com.vju.club.modules.auth.service.UserSessionService;
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

import static com.vju.club.support.ApiErrors.FORBIDDEN;
import static com.vju.club.support.ApiErrors.assertApiError;
import static com.vju.club.support.PermissionChecks.withPermissionChecks;
import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class UserServiceTest {

    @Mock UserRepository userRepository;
    @Mock PermissionAuthorizationService authorization;
    @Mock AuditService auditService;
    @Mock PasswordEncoder passwordEncoder;
    @Mock UserSessionService userSessionService;

    private UserService service;
    private final Actor actor = new Actor(UUID.randomUUID());
    private final UUID targetUserId = UUID.randomUUID();
    private User targetUser;

    @BeforeEach
    void setUp() {
        targetUser = new User();
        targetUser.setId(targetUserId);
        targetUser.setEmail("target@vju.edu.vn");
        targetUser.setFullName("Nguyen Van B");
        targetUser.setStudentCode("SV001");
        targetUser.setPhone("0987654321");
        targetUser.setStatus(UserStatus.ACTIVE);

        when(userRepository.findById(targetUserId)).thenReturn(Optional.of(targetUser));
        when(userRepository.saveAndFlush(any(User.class))).thenAnswer(invocation -> invocation.getArgument(0));

        UserService raw = new UserServiceImpl(userRepository, authorization, auditService,
                new UserMapperImpl(), passwordEncoder, userSessionService);
        service = withPermissionChecks(raw, authorization);
    }

    @Test
    void updateUserUpdatesFieldsAndRecordsAuditLog() {
        AdminUpdateUserRequest request = new AdminUpdateUserRequest("Nguyen Van C", "SV002", "0911223344", "https://img.local/c.png");

        UserResponse response = service.updateUser(actor, targetUserId, request);

        assertThat(response.fullName()).isEqualTo("Nguyen Van C");
        assertThat(response.studentCode()).isEqualTo("SV002");
        assertThat(response.phone()).isEqualTo("0911223344");
        assertThat(response.avatarUrl()).isEqualTo("https://img.local/c.png");

        verify(authorization).require(actor, UserConstants.PERMISSION_UPDATE, null, null);
        verify(auditService).recordChange(eq(actor.id()), eq(AuditAction.USER_PROFILE_UPDATED), eq(targetUserId), eq(null), any(), any());
    }

    @Test
    void updateUserRequiresUserUpdatePermission() {
        doThrow(FORBIDDEN).when(authorization).require(actor, UserConstants.PERMISSION_UPDATE, null, null);

        assertApiError(() -> service.updateUser(actor, targetUserId, new AdminUpdateUserRequest("Hacked", null, null, null)),
                HttpStatus.FORBIDDEN, "PERMISSION_DENIED");

        verify(userRepository, never()).saveAndFlush(any());
    }

    @Test
    void updateUserRejectsBlankName() {
        assertApiError(() -> service.updateUser(actor, targetUserId, new AdminUpdateUserRequest("   ", null, null, null)),
                HttpStatus.BAD_REQUEST, "INVALID_FULL_NAME");
    }

    @Test
    void updateUserRejectsDuplicateStudentCode() {
        when(userRepository.existsByStudentCodeIgnoreCase("SV999")).thenReturn(true);

        assertApiError(() -> service.updateUser(actor, targetUserId, new AdminUpdateUserRequest(null, "SV999", null, null)),
                HttpStatus.CONFLICT, "STUDENT_CODE_ALREADY_EXISTS");
    }
}
