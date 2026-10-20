package com.vju.club.modules.user.service;

import com.vju.club.common.dto.PageResponse;
import com.vju.club.modules.user.dto.request.AdminUpdateUserRequest;
import com.vju.club.modules.user.dto.request.CreateUserRequest;
import com.vju.club.modules.user.dto.request.ResetPasswordRequest;
import com.vju.club.modules.user.dto.request.UpdateProfileRequest;
import com.vju.club.modules.user.dto.request.UpdateUserStatusRequest;
import com.vju.club.modules.user.dto.response.UserResponse;
import com.vju.club.security.Actor;

import java.util.UUID;

public interface UserService {
    UserResponse create(Actor actor, CreateUserRequest request);

    void resetPassword(Actor actor, UUID userId, ResetPasswordRequest request);

    UserResponse getCurrent(Actor actor);

    UserResponse updateProfile(Actor actor, UpdateProfileRequest request);

    UserResponse updateUser(Actor actor, UUID userId, AdminUpdateUserRequest request);

    UserResponse getById(Actor actor, UUID userId);

    PageResponse<UserResponse> search(Actor actor, String query, int offset, int limit, String orderBy, String orderType);

    UserResponse updateStatus(Actor actor, UUID userId, UpdateUserStatusRequest request);
}
