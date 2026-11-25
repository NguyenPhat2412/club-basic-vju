package com.vju.club.service;

import com.vju.club.config.GoogleSignInProperties;
import com.vju.club.dto.request.UpdateProfileRequest;
import com.vju.club.dto.response.NotificationRealtimeEvent;
import com.vju.club.dto.response.NotificationResponse;
import com.vju.club.dto.response.UserResponse;
import com.vju.club.entity.User;
import com.vju.club.enums.AuditAction;
import com.vju.club.enums.UserStatus;
import com.vju.club.error.ApiException;
import com.vju.club.mapper.UserMapperImpl;
import com.vju.club.repository.UserRepository;
import com.vju.club.repository.UserRoleRepository;
import com.vju.club.security.Actor;
import com.vju.club.security.GrantGuard;
import com.vju.club.security.PermissionAuthorizationService;
import com.vju.club.service.impl.NotificationEmailListener;
import com.vju.club.service.impl.OtpMailTemplateBuilder;
import com.vju.club.service.impl.UserServiceImpl;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.junit.jupiter.params.provider.ValueSource;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.OffsetDateTime;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.Executor;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class NotificationEmailListenerTest {
    private static final Pattern HEX_COLOR = Pattern.compile("#[0-9A-Fa-f]{6}\\b");
    private static final Set<String> ALLOWED_THREE_TONE_HEX = Set.of(
            "#FFFFFF", "#F8FAFC", "#F1F5F9",
            "#0F172A", "#334155", "#475569", "#64748B", "#E2E8F0",
            "#8E1F32", "#FFF1F2", "#FECDD3"
    );

    @Mock
    private OtpMailService otpMailService;
    @Mock
    private UserRepository userRepository;
    @Mock
    private UserRoleRepository userRoleRepository;
    @Mock
    private PermissionAuthorizationService authorizationService;
    @Mock
    private AuditService auditService;
    @Mock
    private PasswordEncoder passwordEncoder;
    @Mock
    private UserSessionService userSessionService;
    @Mock
    private RoleService roleService;
    @Mock
    private GrantGuard grantGuard;

    private NotificationEmailListener listener;
    private UUID userId;

    @BeforeEach
    void setUp() {
        listener = new NotificationEmailListener(otpMailService, userRepository);
        ReflectionTestUtils.setField(listener, "mailTaskExecutor", (Executor) Runnable::run);
        userId = UUID.randomUUID();
        lenient().when(otpMailService.isMailConfigured()).thenReturn(true);
    }

    @Test
    void sendsClubBroadcastEmailWhenOptInEnabled() {
        User recipient = user(userId, "member@st.vju.ac.vn", "Nguyễn Văn A", true);
        when(userRepository.findById(userId)).thenReturn(Optional.of(recipient));

        listener.onNotificationCreated(event("NOTIFICATION_CREATED", userId, "CLUB",
                "Thông báo họp toàn CLB", "Họp định kỳ lúc 18:00 thứ Sáu."));

        verify(otpMailService).sendNotificationAlertEmail(
                "member@st.vju.ac.vn",
                "Nguyễn Văn A",
                "Thông báo họp toàn CLB",
                "Họp định kỳ lúc 18:00 thứ Sáu.",
                "CLUB");
    }

    @ParameterizedTest
    @ValueSource(strings = {"CLUB_APPLICATION", "DEPARTMENT", "TASK", "EVENT", "CLUB"})
    void sendsEmailForAllEmailWorthyTypesWhenEnabled(String referenceType) {
        User recipient = user(userId, "sv@st.vju.ac.vn", "Trần Thị B", true);
        when(userRepository.findById(userId)).thenReturn(Optional.of(recipient));

        listener.onNotificationCreated(event("NOTIFICATION_CREATED", userId, referenceType,
                "Tiêu đề " + referenceType, "Nội dung thông báo"));

        verify(otpMailService).sendNotificationAlertEmail(
                "sv@st.vju.ac.vn",
                "Trần Thị B",
                "Tiêu đề " + referenceType,
                "Nội dung thông báo",
                referenceType);
    }

    @ParameterizedTest
    @ValueSource(strings = {"CLUB", "EVENT"})
    void skipsEmailWhenUserOptedOut(String referenceType) {
        User recipient = user(userId, "member@st.vju.ac.vn", "Lê Văn C", false);
        when(userRepository.findById(userId)).thenReturn(Optional.of(recipient));

        listener.onNotificationCreated(event("NOTIFICATION_CREATED", userId, referenceType,
                "Thông báo mới", "Chi tiết"));

        verify(otpMailService, never()).sendNotificationAlertEmail(any(), any(), any(), any(), any());
    }

    @Test
    void skipsNonWorthyOrNullNotificationTypesWithoutQueryingUser() {
        listener.onNotificationCreated(event("NOTIFICATION_CREATED", userId, "CHAT", "Tin nhắn mới", "Hi"));
        listener.onNotificationCreated(event("NOTIFICATION_CREATED", userId, null, "Khác", "Hi"));
        listener.onNotificationCreated(event("OTHER_EVENT", userId, "CLUB", "Broadcast", "Hi"));
        listener.onNotificationCreated(null);

        verifyNoInteractions(userRepository);
        verify(otpMailService, never()).sendNotificationAlertEmail(any(), any(), any(), any(), any());
    }

    @ParameterizedTest
    @ValueSource(strings = {"student@vju.local", "test@example.test", "   "})
    void skipsInvalidOrInternalRecipientEmails(String email) {
        User recipient = user(userId, email, "Internal User", true);
        when(userRepository.findById(userId)).thenReturn(Optional.of(recipient));

        listener.onNotificationCreated(event("NOTIFICATION_CREATED", userId, "CLUB", "Broadcast", "Body"));

        verify(otpMailService, never()).sendNotificationAlertEmail(any(), any(), any(), any(), any());
    }

    @Test
    void skipsWhenMailNotConfiguredOrRecipientMissing() {
        when(otpMailService.isMailConfigured()).thenReturn(false);
        listener.onNotificationCreated(event("NOTIFICATION_CREATED", userId, "CLUB", "Broadcast", "Body"));
        verifyNoInteractions(userRepository);

        when(otpMailService.isMailConfigured()).thenReturn(true);
        when(userRepository.findById(userId)).thenReturn(Optional.empty());
        listener.onNotificationCreated(event("NOTIFICATION_CREATED", userId, "CLUB", "Broadcast", "Body"));
        verify(otpMailService, never()).sendNotificationAlertEmail(any(), any(), any(), any(), any());
    }

    @ParameterizedTest
    @CsvSource(value = {
            "CLUB_APPLICATION, Tuyển thành viên & Phỏng vấn",
            "DEPARTMENT, Phân ban CLB",
            "TASK, Công việc",
            "EVENT, Sự kiện",
            "CLUB, Thông báo CLB",
            "UNKNOWN, Thông báo"
    })
    void templateRendersCategoryBadgesEscapesXssAndUsesStrictVjuPalette(String referenceType, String expectedBadge) {
        String maliciousName = "Nguyễn <Admin> & 'CLB'";
        String maliciousTitle = "Thông báo <img src=x onerror=\"alert(1)\">";
        String maliciousMessage = "Dòng 1 <script>alert('xss')</script>\nDòng 2 & \"an toàn\"";

        var rendered = OtpMailTemplateBuilder.buildNotificationAlert(
                maliciousName, "admin@st.vju.ac.vn", maliciousTitle, maliciousMessage, referenceType);
        String html = OtpMailTemplateBuilder.buildNotificationAlertHtml(
                maliciousName, "admin@st.vju.ac.vn", maliciousTitle, maliciousMessage, referenceType);

        assertThat(rendered.html()).isEqualTo(html);
        assertThat(rendered.plainText()).contains(expectedBadge);
        assertThat(html)
                .contains(expectedBadge.replace("&", "&amp;"))
                .contains("Nguyễn &lt;Admin&gt; &amp; &#39;CLB&#39;")
                .contains("&lt;img src=x onerror=&quot;alert(1)&quot;&gt;")
                .contains("Dòng 1 &lt;script&gt;alert(&#39;xss&#39;)&lt;/script&gt;<br />Dòng 2 &amp; &quot;an toàn&quot;")
                .doesNotContain("<script")
                .doesNotContain("<img ");

        Matcher matcher = HEX_COLOR.matcher(html);
        while (matcher.find()) {
            assertThat(ALLOWED_THREE_TONE_HEX)
                    .as("Color %s must belong to strict VJU 60/30/10 palette", matcher.group())
                    .contains(matcher.group().toUpperCase());
        }
    }

    @Test
    void templateNullReferenceTypeDefaultsToGeneralBadge() {
        String html = OtpMailTemplateBuilder.buildNotificationAlertHtml(
                null, "sv@st.vju.ac.vn", null, null, null);
        assertThat(html)
                .contains("Thông báo")
                .contains("sv@st.vju.ac.vn")
                .contains("Thông báo mới từ CLB");
    }

    @Test
    @SuppressWarnings("unchecked")
    void updateProfileSupportsBackwardCompatibleConstructorAndAuditsPreferences() {
        UpdateProfileRequest legacyRequest = new UpdateProfileRequest("Nguyễn Văn A", "0901234567", null);
        assertThat(legacyRequest.emailNotificationsEnabled()).isNull();
        assertThat(legacyRequest.twoFactorEnabled()).isNull();

        User user = user(userId, "leader@st.vju.ac.vn", "Nguyễn Văn A", true);
        user.setTwoFactorEnabled(false);
        when(userRepository.findById(userId)).thenReturn(Optional.of(user));
        when(userRepository.saveAndFlush(any(User.class))).thenAnswer(inv -> inv.getArgument(0));

        UserServiceImpl userService = new UserServiceImpl(
                userRepository, authorizationService, auditService, new UserMapperImpl(),
                passwordEncoder, userSessionService, roleService, grantGuard, new GoogleSignInProperties());
        ReflectionTestUtils.setField(userService, "userRoleRepository", userRoleRepository);
        lenient().when(userRoleRepository.holdsTier1To3AdminRole(userId)).thenReturn(true);

        UserResponse unchangedPrefs = userService.updateProfile(new Actor(userId), legacyRequest);
        assertThat(unchangedPrefs.emailNotificationsEnabled()).isTrue();
        assertThat(unchangedPrefs.twoFactorEnabled()).isFalse();

        UpdateProfileRequest prefRequest = new UpdateProfileRequest(null, null, null, false, true);
        UserResponse updated = userService.updateProfile(new Actor(userId), prefRequest);
        assertThat(updated.emailNotificationsEnabled()).isFalse();
        assertThat(updated.twoFactorEnabled()).isTrue();

        ArgumentCaptor<Map<String, Object>> beforeCaptor = ArgumentCaptor.forClass(Map.class);
        ArgumentCaptor<Map<String, Object>> afterCaptor = ArgumentCaptor.forClass(Map.class);
        verify(auditService, org.mockito.Mockito.times(2)).recordChange(
                eq(userId), eq(AuditAction.USER_PROFILE_UPDATED), eq(userId), eq(null),
                beforeCaptor.capture(), afterCaptor.capture());

        assertThat(beforeCaptor.getAllValues().get(1))
                .containsEntry("emailNotificationsEnabled", true)
                .containsEntry("twoFactorEnabled", false);
        assertThat(afterCaptor.getAllValues().get(1))
                .containsEntry("emailNotificationsEnabled", false)
                .containsEntry("twoFactorEnabled", true);
    }

    @ParameterizedTest
    @ValueSource(strings = {"SYSTEM_ADMIN", "CLUB_PRESIDENT", "CLUB_VICE_PRESIDENT"})
    void updateProfileAllowsTier1To3AdminToEnableTwoFactor(String roleCode) {
        User user = user(userId, "admin@st.vju.ac.vn", "Tier Admin", true);
        user.setTwoFactorEnabled(false);
        when(userRepository.findById(userId)).thenReturn(Optional.of(user));
        when(userRepository.saveAndFlush(any(User.class))).thenAnswer(inv -> inv.getArgument(0));
        lenient().when(userRoleRepository.holdsTier1To3AdminRole(userId)).thenReturn(true);

        UserServiceImpl userService = new UserServiceImpl(
                userRepository, authorizationService, auditService, new UserMapperImpl(),
                passwordEncoder, userSessionService, roleService, grantGuard, new GoogleSignInProperties());
        ReflectionTestUtils.setField(userService, "userRoleRepository", userRoleRepository);

        UserResponse updated = userService.updateProfile(
                new Actor(userId), new UpdateProfileRequest(null, null, null, null, true));
        assertThat(updated.twoFactorEnabled()).isTrue();
    }

    @ParameterizedTest
    @ValueSource(strings = {"DEPARTMENT_HEAD", "CLUB_MEMBER"})
    void updateProfileRejectsNonTier1To3UserEnablingTwoFactor(String roleCode) {
        User user = user(userId, "member@st.vju.ac.vn", "Thành viên", true);
        user.setTwoFactorEnabled(false);
        when(userRepository.findById(userId)).thenReturn(Optional.of(user));
        lenient().when(userRoleRepository.holdsTier1To3AdminRole(userId)).thenReturn(false);

        UserServiceImpl userService = new UserServiceImpl(
                userRepository, authorizationService, auditService, new UserMapperImpl(),
                passwordEncoder, userSessionService, roleService, grantGuard, new GoogleSignInProperties());
        ReflectionTestUtils.setField(userService, "userRoleRepository", userRoleRepository);

        assertThatThrownBy(() -> userService.updateProfile(
                new Actor(userId), new UpdateProfileRequest(null, null, null, null, true)))
                .isInstanceOfSatisfying(ApiException.class, ex -> {
                    assertThat(ex.getStatus()).isEqualTo(HttpStatus.FORBIDDEN);
                    assertThat(ex.getCode()).isEqualTo("TWO_FACTOR_ADMIN_ROLE_REQUIRED");
                });
        verify(userRepository, never()).saveAndFlush(any());

        when(userRepository.saveAndFlush(any(User.class))).thenAnswer(inv -> inv.getArgument(0));
        UserResponse optOutOnly = userService.updateProfile(
                new Actor(userId), new UpdateProfileRequest(null, null, null, false, null));
        assertThat(optOutOnly.emailNotificationsEnabled()).isFalse();
        assertThat(optOutOnly.twoFactorEnabled()).isFalse();
    }

    @Test
    void updateProfileFailsClosedWhenUserRoleRepositoryAbsent() {
        User user = user(userId, "member@st.vju.ac.vn", "Thành viên", true);
        when(userRepository.findById(userId)).thenReturn(Optional.of(user));

        UserServiceImpl userService = new UserServiceImpl(
                userRepository, authorizationService, auditService, new UserMapperImpl(),
                passwordEncoder, userSessionService, roleService, grantGuard, new GoogleSignInProperties());

        assertThatThrownBy(() -> userService.updateProfile(
                new Actor(userId), new UpdateProfileRequest(null, null, null, null, true)))
                .isInstanceOfSatisfying(ApiException.class, ex -> {
                    assertThat(ex.getStatus()).isEqualTo(HttpStatus.FORBIDDEN);
                    assertThat(ex.getCode()).isEqualTo("TWO_FACTOR_ADMIN_ROLE_REQUIRED");
                });
        verify(userRepository, never()).saveAndFlush(any());
    }

    private static User user(UUID id, String email, String fullName, boolean emailNotificationsEnabled) {
        User user = new User();
        user.setId(id);
        user.setEmail(email);
        user.setFullName(fullName);
        user.setStatus(UserStatus.ACTIVE);
        user.setEmailNotificationsEnabled(emailNotificationsEnabled);
        return user;
    }

    private static NotificationRealtimeEvent event(
            String eventType, UUID userId, String referenceType, String title, String message) {
        NotificationResponse notif = new NotificationResponse(
                UUID.randomUUID(), title, message, false, referenceType, UUID.randomUUID(), null, OffsetDateTime.now());
        return new NotificationRealtimeEvent(eventType, userId, notif, 1L, OffsetDateTime.now());
    }
}
