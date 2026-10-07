package com.vju.club.modules.user.service.impl;

import com.vju.club.modules.user.service.UserService;
import com.vju.club.modules.user.common.UserConstants;

import com.vju.club.security.Actor;
import com.vju.club.modules.user.config.response.UserResponse;
import com.vju.club.modules.audit.entity.AuditAction;
import com.vju.club.modules.audit.service.AuditService;
import com.vju.club.common.OffsetLimitRequest;
import com.vju.club.common.dto.PageResponse;
import com.vju.club.modules.user.entity.User;
import com.vju.club.modules.user.entity.UserStatus;
import com.vju.club.error.ApiException;
import com.vju.club.modules.user.repository.UserRepository;
import com.vju.club.security.PermissionAuthorizationService;
import com.vju.club.modules.user.config.request.UpdateProfileRequest;
import com.vju.club.modules.user.config.request.UpdateUserStatusRequest;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import com.vju.club.modules.user.specification.UserSpecifications;

import java.util.LinkedHashMap;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

@Service
public class IUserService implements UserService {

    private static final Set<String> SORTABLE = Set.of("email", "fullName", "createdAt", "status");

    private final UserRepository userRepository;
    private final AuditService auditService;
    private final PermissionAuthorizationService authorizationService;

    public IUserService(
            UserRepository userRepository,
            PermissionAuthorizationService authorizationService,
            AuditService auditService) {
        this.userRepository = userRepository;
        this.auditService = auditService;
        this.authorizationService = authorizationService;
    }

    @Transactional(readOnly = true)
    public UserResponse getCurrent(Actor actor) {
        return UserResponse.from(findUser(actor.id()));
    }

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
        return UserResponse.from(saved);
    }

    @Transactional(readOnly = true)
    public UserResponse getById(Actor actor, UUID userId) {
        authorizationService.require(actor, UserConstants.PERMISSION_VIEW, null, null);
        return UserResponse.from(findUser(userId));
    }

    @Transactional(readOnly = true)
    public PageResponse<UserResponse> search(Actor actor, String query, int offset, int limit,
                                             String orderBy, String orderType) {
        authorizationService.require(actor, UserConstants.PERMISSION_VIEW, null, null);
        OffsetLimitRequest page = new OffsetLimitRequest(offset, limit, sort(orderBy, orderType));
        Specification<User> spec = UserSpecifications.hasKeyword(query);
        Page<User> userPage = userRepository.findAll(spec, page);
        var users = userPage.getContent().stream().map(UserResponse::from).toList();
        return new PageResponse<>(users, userPage.getTotalElements(), offset, limit);
    }

    /** Only whitelisted fields can be sorted on; id breaks ties so paging is stable. */
    private static Sort sort(String orderBy, String orderType) {
        boolean asc = "asc".equalsIgnoreCase(orderType);
        if (!SORTABLE.contains(orderBy) || !(asc || "desc".equalsIgnoreCase(orderType))) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "INVALID_SORT", "Unsupported sort field or direction");
        }
        return Sort.by(asc ? Sort.Direction.ASC : Sort.Direction.DESC, orderBy).and(Sort.by("id"));
    }


    @Transactional
    public UserResponse updateStatus(Actor actor, UUID userId, UpdateUserStatusRequest request) {
        authorizationService.require(actor,
                request.status() == UserStatus.ACTIVE ? "user.active" : "user.inactive", null, null);
        User user = findUser(userId);
        Map<String, Object> before = Map.of("status", user.getStatus());
        user.setStatus(request.status());
        User saved = userRepository.saveAndFlush(user);
        auditService.recordChange(actor.id(), request.status() == UserStatus.ACTIVE
                ? AuditAction.USER_UNLOCKED : AuditAction.USER_LOCKED, userId, null, before,
                Map.of("status", saved.getStatus()));
        return UserResponse.from(saved);
    }

    private static Map<String, Object> profile(User user) {
        Map<String, Object> values = new LinkedHashMap<>();
        values.put("fullName", user.getFullName());
        values.put("phone", user.getPhone());
        values.put("avatarUrl", user.getAvatarUrl());
        return values;
    }

    private User findUser(UUID userId) {
        return userRepository.findById(userId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "USER_NOT_FOUND", "User not found"));
    }

    private String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }
}
