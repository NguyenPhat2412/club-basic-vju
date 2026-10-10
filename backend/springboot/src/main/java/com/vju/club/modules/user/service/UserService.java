package com.vju.club.modules.user.service;

import com.vju.club.security.Actor;
import com.vju.club.modules.user.dto.response.UserResponse;
import com.vju.club.modules.audit.enums.AuditAction;
import com.vju.club.modules.audit.service.AuditService;
import com.vju.club.common.OffsetLimitRequest;
import com.vju.club.common.dto.PageResponse;
import com.vju.club.modules.user.entity.User;
import com.vju.club.modules.user.enums.UserStatus;
import com.vju.club.error.ApiException;
import com.vju.club.modules.user.repository.UserRepository;
import com.vju.club.security.PermissionAuthorizationService;
import com.vju.club.modules.user.dto.request.UpdateProfileRequest;
import com.vju.club.modules.user.dto.request.UpdateUserStatusRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import java.util.LinkedHashMap;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

public interface UserService {
    UserResponse getCurrent(Actor actor);

    UserResponse updateProfile(Actor actor, UpdateProfileRequest request);

    UserResponse getById(Actor actor, UUID userId);

    PageResponse<UserResponse> search(Actor actor, String query, int offset, int limit, String orderBy, String orderType);

    UserResponse updateStatus(Actor actor, UUID userId, UpdateUserStatusRequest request);
}
