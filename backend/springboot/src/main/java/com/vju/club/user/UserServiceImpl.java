package com.vju.club.user;

import com.vju.club.auth.dto.UserResponse;
import com.vju.club.dao.UserDao;
import com.vju.club.entity.User;
import com.vju.club.error.ApiException;
import com.vju.club.repository.UserRepository;
import com.vju.club.security.PermissionAuthorizationService;
import com.vju.club.user.dto.UpdateProfileRequest;
import com.vju.club.user.dto.UpdateUserStatusRequest;
import com.vju.club.user.dto.UserListResponse;
import org.springframework.http.HttpStatus;
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
    public UserResponse getById(UUID userId) {
        return UserResponse.from(findUser(userId));
    }

    @Override
    @Transactional
    public UserResponse updateProfile(UUID userId, UpdateProfileRequest request) {
        User user = findUser(userId);
        if (request.fullName() != null) {
            if (request.fullName().isBlank()) {
                throw new ApiException(HttpStatus.BAD_REQUEST, "INVALID_FULL_NAME", "Full name cannot be blank");
            }
            user.setFullName(request.fullName().trim());
        }
        if (request.phone() != null) user.setPhone(blankToNull(request.phone()));
        if (request.avatarUrl() != null) user.setAvatarUrl(blankToNull(request.avatarUrl()));
        return UserResponse.from(userRepository.save(user));
    }

    @Override
    @Transactional(readOnly = true)
    public UserListResponse search(String query, int offset, int limit, String orderBy, String orderType) {
        var users = userDao.search(query, offset, limit, orderBy, orderType).stream()
                .map(UserResponse::from)
                .toList();
        return new UserListResponse(users, userDao.count(query), Math.max(0, offset), Math.max(1, Math.min(limit, 100)));
    }

    @Override
    @Transactional
    public UserResponse updateStatus(UUID userId, UpdateUserStatusRequest request) {
        User user = findUser(userId);
        user.setStatus(request.status());
        return UserResponse.from(userRepository.save(user));
    }

    private User findUser(UUID userId) {
        return userRepository.findById(userId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "USER_NOT_FOUND", "User not found"));
    }

    private String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }
}
