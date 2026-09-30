package com.vju.club.user;

import com.vju.club.security.Actor;
import com.vju.club.user.dto.UserResponse;
import com.vju.club.common.OffsetLimitRequest;
import com.vju.club.common.dto.PageResponse;
import com.vju.club.entity.User;
import com.vju.club.entity.UserStatus;
import com.vju.club.error.ApiException;
import com.vju.club.repository.UserRepository;
import com.vju.club.security.PermissionAuthorizationService;
import com.vju.club.user.dto.UpdateProfileRequest;
import com.vju.club.user.dto.UpdateUserStatusRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Locale;
import java.util.Set;
import java.util.UUID;

@Service
public class UserService {

    private static final Set<String> SORTABLE = Set.of("email", "fullName", "createdAt", "status");

    private final UserRepository userRepository;
    private final PermissionAuthorizationService authorizationService;

    public UserService(
            UserRepository userRepository,
            PermissionAuthorizationService authorizationService) {
        this.userRepository = userRepository;
        this.authorizationService = authorizationService;
    }

    @Transactional(readOnly = true)
    public UserResponse getCurrent(Actor actor) {
        return UserResponse.from(findUser(actor.id()));
    }

    @Transactional
    public UserResponse updateProfile(Actor actor, UpdateProfileRequest request) {
        User user = findUser(actor.id());
        if (request.fullName() != null) {
            if (request.fullName().isBlank()) {
                throw new ApiException(HttpStatus.BAD_REQUEST, "INVALID_FULL_NAME", "Full name cannot be blank");
            }
            user.setFullName(request.fullName().trim());
        }
        if (request.phone() != null) user.setPhone(blankToNull(request.phone()));
        if (request.avatarUrl() != null) user.setAvatarUrl(blankToNull(request.avatarUrl()));
        return UserResponse.from(userRepository.saveAndFlush(user));
    }

    @Transactional(readOnly = true)
    public UserResponse getById(Actor actor, UUID userId) {
        authorizationService.require(actor, "user.view", null, null);
        return UserResponse.from(findUser(userId));
    }

    @Transactional(readOnly = true)
    public PageResponse<UserResponse> search(Actor actor, String query, int offset, int limit,
                                             String orderBy, String orderType) {
        authorizationService.require(actor, "user.view", null, null);
        String pattern = "%" + (query == null ? "" : query.trim().toLowerCase(Locale.ROOT)) + "%";
        OffsetLimitRequest page = new OffsetLimitRequest(offset, limit, sort(orderBy, orderType));
        var users = userRepository.search(pattern, page).stream().map(UserResponse::from).toList();
        return new PageResponse<>(users, userRepository.countSearch(pattern), offset, limit);
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
        user.setStatus(request.status());
        return UserResponse.from(userRepository.saveAndFlush(user));
    }

    private User findUser(UUID userId) {
        return userRepository.findById(userId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "USER_NOT_FOUND", "User not found"));
    }

    private String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }
}
