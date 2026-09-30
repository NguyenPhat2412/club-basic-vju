package com.vju.club.user;

import com.vju.club.auth.dto.UserResponse;
import com.vju.club.common.dto.PageResponse;
import com.vju.club.user.dto.UpdateProfileRequest;
import com.vju.club.user.dto.UpdateUserStatusRequest;
import org.springframework.security.core.Authentication;

import java.util.UUID;

public interface UserService {
    UserResponse getCurrent(Authentication authentication);
    UserResponse updateProfile(Authentication authentication, UpdateProfileRequest request);
    UserResponse getById(Authentication authentication, UUID userId);
    PageResponse<UserResponse> search(Authentication authentication, String query, int offset, int limit,
                                      String orderBy, String orderType);
    UserResponse updateStatus(Authentication authentication, UUID userId, UpdateUserStatusRequest request);
}
