package com.vju.club.modules.user.service.impl;

import com.vju.club.common.OffsetLimitRequest;
import com.vju.club.common.dto.PageResponse;
import com.vju.club.config.GoogleSignInProperties;
import com.vju.club.error.ApiException;
import com.vju.club.modules.audit.enums.AuditAction;
import com.vju.club.modules.audit.service.AuditService;
import com.vju.club.modules.auth.service.UserSessionService;
import com.vju.club.modules.permission.annotation.RequirePermission;
import com.vju.club.modules.role.service.RoleService;
import com.vju.club.modules.user.common.UserConstants;
import com.vju.club.modules.user.dto.request.AdminUpdateUserRequest;
import com.vju.club.modules.user.dto.request.CreateUserRequest;
import com.vju.club.modules.user.dto.request.ResetPasswordRequest;
import com.vju.club.modules.user.dto.request.UpdateProfileRequest;
import com.vju.club.modules.user.dto.request.UpdateUserStatusRequest;
import com.vju.club.modules.user.dto.response.UserResponse;
import com.vju.club.modules.user.entity.User;
import com.vju.club.modules.user.enums.UserStatus;
import com.vju.club.modules.user.mapper.UserMapper;
import com.vju.club.modules.user.repository.UserRepository;
import com.vju.club.modules.user.service.UserService;
import com.vju.club.modules.user.specification.UserSpecifications;
import com.vju.club.security.Actor;
import com.vju.club.security.GrantGuard;
import com.vju.club.security.PermissionAuthorizationService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.util.Base64;
import java.util.LinkedHashMap;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class UserServiceImpl implements UserService {
    private static final SecureRandom RANDOM = new SecureRandom();
    private static final Set<String> SORTABLE = Set.of("email", "fullName", "createdAt", "status");

    private final UserRepository userRepository;
    private final PermissionAuthorizationService authorizationService;
    private final AuditService auditService;
    private final UserMapper userMapper;
    private final PasswordEncoder passwordEncoder;
    private final UserSessionService userSessionService;
    private final RoleService roleService;
    private final GrantGuard grantGuard;
    private final GoogleSignInProperties googleSignIn;

    @Override
    @Transactional
    @RequirePermission(UserConstants.PERMISSION_CREATE)
    public UserResponse create(Actor actor, CreateUserRequest request) {
        String email = request.email().trim().toLowerCase(Locale.ROOT);
        String studentCode = blankToNull(request.studentCode());
        if (userRepository.existsByEmailIgnoreCase(email)) {
            throw new ApiException(HttpStatus.CONFLICT, "EMAIL_ALREADY_EXISTS", "Email is already registered");
        }
        if (studentCode != null && userRepository.existsByStudentCodeIgnoreCase(studentCode)) {
            throw new ApiException(HttpStatus.CONFLICT, "STUDENT_CODE_ALREADY_EXISTS", "Student code is already registered");
        }
        boolean googleAccount = googleSignIn.isGoogleEmail(email);
        requireSchoolEmailForStudent(email, studentCode);
        if (!googleAccount && (request.password() == null || request.password().isBlank())) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "PASSWORD_REQUIRED", "A password is required for this account");
        }
        User user = new User();
        user.setEmail(email);
        user.setPasswordHash(passwordEncoder.encode(googleAccount ? unusablePassword() : request.password()));
        user.setFullName(request.fullName().trim());
        user.setStudentCode(studentCode);
        user.setPhone(blankToNull(request.phone()));
        user.setStatus(UserStatus.ACTIVE);
        user.setRequiresPasswordChange(!googleAccount && !Boolean.FALSE.equals(request.requiresPasswordChange()));
        User saved = userRepository.saveAndFlush(user);
        auditService.record(actor.id(), AuditAction.USER_CREATED, saved.getId(), null, null,
                Map.of("email", saved.getEmail()));
        if (request.roles() != null) {
            request.roles().forEach(role -> roleService.assign(actor, saved.getId(), role));
        }
        return userMapper.toResponse(saved);
    }

    @Override
    @Transactional
    @RequirePermission(UserConstants.PERMISSION_RESET_PASSWORD)
    public void resetPassword(Actor actor, UUID userId, ResetPasswordRequest request) {
        User user = findUser(userId);
        if (googleSignIn.isGoogleEmail(user.getEmail())) {
            throw new ApiException(HttpStatus.CONFLICT, "PASSWORD_NOT_USED", "This account signs in with Google");
        }
        user.setPasswordHash(passwordEncoder.encode(request.newPassword()));
        user.setRequiresPasswordChange(!Boolean.FALSE.equals(request.requiresPasswordChange()));
        userRepository.saveAndFlush(user);
        int revoked = userSessionService.endAllSessions(userId);
        auditService.record(actor.id(), AuditAction.USER_PASSWORD_RESET, userId, null, null,
                Map.of("revokedSessions", revoked));
    }

    @Override
    @Transactional(readOnly = true)
    public UserResponse getCurrent(Actor actor) {
        return userMapper.toResponse(findUser(actor.id()));
    }

    @Override
    @Transactional
    public UserResponse updateProfile(Actor actor, UpdateProfileRequest request) {
        User user = findUser(actor.id());
        Map<String, Object> before = profile(user);
        if (request.fullName() != null) {
            if (request.fullName().isBlank()) {
                throw new ApiException(HttpStatus.BAD_REQUEST, "INVALID_FULL_NAME", "Full name cannot be blank");
            }
            user.setFullName(request.fullName().trim());
        }
        if (request.phone() != null) user.setPhone(blankToNull(request.phone()));
        if (request.avatarUrl() != null) user.setAvatarUrl(blankToNull(request.avatarUrl()));
        User saved = userRepository.saveAndFlush(user);
        auditService.recordChange(actor.id(), AuditAction.USER_PROFILE_UPDATED, saved.getId(), null, before, profile(saved));
        return userMapper.toResponse(saved);
    }

    @Override
    @Transactional
    @RequirePermission(UserConstants.PERMISSION_UPDATE)
    public UserResponse updateUser(Actor actor, UUID userId, AdminUpdateUserRequest request) {
        User user = findUser(userId);
        Map<String, Object> before = profile(user);
        if (request.fullName() != null) {
            if (request.fullName().isBlank()) {
                throw new ApiException(HttpStatus.BAD_REQUEST, "INVALID_FULL_NAME", "Full name cannot be blank");
            }
            user.setFullName(request.fullName().trim());
        }
        if (request.studentCode() != null) {
            String code = blankToNull(request.studentCode());
            if (code != null && !code.equalsIgnoreCase(user.getStudentCode())
                    && userRepository.existsByStudentCodeIgnoreCase(code)) {
                throw new ApiException(HttpStatus.CONFLICT, "STUDENT_CODE_ALREADY_EXISTS", "Student code is already registered");
            }
            requireSchoolEmailForStudent(user.getEmail(), code);
            user.setStudentCode(code);
        }
        if (request.phone() != null) user.setPhone(blankToNull(request.phone()));
        if (request.avatarUrl() != null) user.setAvatarUrl(blankToNull(request.avatarUrl()));
        User saved = userRepository.saveAndFlush(user);
        auditService.recordChange(actor.id(), AuditAction.USER_PROFILE_UPDATED, saved.getId(), null, before, profile(saved));
        return userMapper.toResponse(saved);
    }

    @Override
    @Transactional(readOnly = true)
    @RequirePermission(UserConstants.PERMISSION_VIEW)
    public UserResponse getById(Actor actor, UUID userId) {
        return userMapper.toResponse(findUser(userId));
    }

    @Override
    @Transactional(readOnly = true)
    @RequirePermission(UserConstants.PERMISSION_VIEW)
    public PageResponse<UserResponse> search(Actor actor, String query, int offset, int limit,
                                             String orderBy, String orderType) {
        OffsetLimitRequest page = new OffsetLimitRequest(offset, limit, sort(orderBy, orderType));
        Specification<User> spec = UserSpecifications.hasKeyword(query);
        Page<User> userPage = userRepository.findAll(spec, page);
        var users = userPage.getContent().stream().map(userMapper::toResponse).toList();
        return new PageResponse<>(users, userPage.getTotalElements(), offset, limit);
    }

    private static Sort sort(String orderBy, String orderType) {
        boolean asc = "asc".equalsIgnoreCase(orderType);
        if (!SORTABLE.contains(orderBy) || !(asc || "desc".equalsIgnoreCase(orderType))) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "INVALID_SORT", "Unsupported sort field or direction");
        }
        return Sort.by(asc ? Sort.Direction.ASC : Sort.Direction.DESC, orderBy).and(Sort.by("id"));
    }

    @Override
    @Transactional
    public UserResponse updateStatus(Actor actor, UUID userId, UpdateUserStatusRequest request) {
        authorizationService.require(actor,
                request.status() == UserStatus.ACTIVE ? "user.active" : "user.inactive", null, null);
        User user = findUser(userId);
        if (request.status() != UserStatus.ACTIVE) {
            if (userId.equals(actor.id())) {
                throw new ApiException(HttpStatus.CONFLICT, "CANNOT_DEACTIVATE_SELF", "You cannot deactivate your own account");
            }
            grantGuard.requireNotLastSystemAdmin(userId);
        }
        Map<String, Object> before = Map.of("status", user.getStatus());
        user.setStatus(request.status());
        User saved = userRepository.saveAndFlush(user);
        if (saved.getStatus() != UserStatus.ACTIVE) {
            userSessionService.endAllSessions(userId);
        }
        auditService.recordChange(actor.id(), request.status() == UserStatus.ACTIVE
                ? AuditAction.USER_UNLOCKED : AuditAction.USER_LOCKED, userId, null, before,
                Map.of("status", saved.getStatus()));
        return userMapper.toResponse(saved);
    }

    private static Map<String, Object> profile(User user) {
        Map<String, Object> values = new LinkedHashMap<>();
        values.put("fullName", user.getFullName());
        values.put("studentCode", user.getStudentCode());
        values.put("phone", user.getPhone());
        values.put("avatarUrl", user.getAvatarUrl());
        return values;
    }

    private void requireSchoolEmailForStudent(String email, String studentCode) {
        if (studentCode != null && googleSignIn.isEnabled() && !googleSignIn.isGoogleEmail(email)) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "STUDENT_EMAIL_DOMAIN_REQUIRED",
                    "Student accounts must use a school email address");
        }
    }

    private static String unusablePassword() {
        byte[] bytes = new byte[32];
        RANDOM.nextBytes(bytes);
        return Base64.getEncoder().encodeToString(bytes);
    }

    private User findUser(UUID userId) {
        return userRepository.findById(userId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "USER_NOT_FOUND", "User not found"));
    }

    private String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }
}
