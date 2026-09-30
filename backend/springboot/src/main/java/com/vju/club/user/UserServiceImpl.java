package com.vju.club.user;

import com.vju.club.auth.dto.UserResponse;
import com.vju.club.common.dto.PageResponse;
import com.vju.club.dao.UserDao;
import com.vju.club.entity.User;
import com.vju.club.entity.UserStatus;
import com.vju.club.error.ApiException;
import com.vju.club.repository.UserRepository;
import com.vju.club.security.PermissionAuthorizationService;
import com.vju.club.security.SecurityIdentity;
import com.vju.club.user.dto.UpdateProfileRequest;
import com.vju.club.user.dto.UpdateUserStatusRequest;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Service
public class UserServiceImpl implements UserService {

    private final UserRepository userRepository;
    private final UserDao userDao;
    private final PermissionAuthorizationService authorizationService;

    public UserServiceImpl(
            UserRepository userRepository,
            UserDao userDao,
            PermissionAuthorizationService authorizationService) {
        this.userRepository = userRepository;
        this.userDao = userDao;
        this.authorizationService = authorizationService;
    }

    @Override
    @Transactional(readOnly = true)
    public UserResponse getCurrent(Authentication authentication) {
        return UserResponse.from(findUser(SecurityIdentity.userId(authentication)));
    }

    @Override
    @Transactional
    public UserResponse updateProfile(Authentication authentication, UpdateProfileRequest request) {
        User user = findUser(SecurityIdentity.userId(authentication));
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

    @Override
    @Transactional(readOnly = true)
    public UserResponse getById(Authentication authentication, UUID userId) {
        authorizationService.require(authentication, "user.view", null, null);
        return UserResponse.from(findUser(userId));
    }

    @Override
    @Transactional(readOnly = true)
    public PageResponse<UserResponse> search(Authentication authentication, String query, int offset, int limit,
                                             String orderBy, String orderType) {
        authorizationService.require(authentication, "user.view", null, null);
        var users = userDao.search(query, offset, limit, orderBy, orderType).stream()
                .map(UserResponse::from)
                .toList();
        return new PageResponse<>(users, userDao.count(query), offset, limit);
    }

    @Override
    @Transactional
    public UserResponse updateStatus(Authentication authentication, UUID userId, UpdateUserStatusRequest request) {
        authorizationService.require(authentication,
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
