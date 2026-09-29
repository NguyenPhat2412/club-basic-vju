package com.vju.club.user;

import com.vju.club.auth.dto.UserResponse;
import com.vju.club.user.dto.UpdateProfileRequest;
import com.vju.club.user.dto.UpdateUserStatusRequest;
import com.vju.club.user.dto.UserListResponse;

import java.util.UUID;

public interface UserService {
    UserResponse getById(UUID userId);
    UserResponse updateProfile(UUID userId, UpdateProfileRequest request);
    UserListResponse search(String query, int offset, int limit, String orderBy, String orderType);
    UserResponse updateStatus(UUID userId, UpdateUserStatusRequest request);
}
