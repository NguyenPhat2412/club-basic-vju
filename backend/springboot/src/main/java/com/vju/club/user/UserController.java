package com.vju.club.user;

import com.vju.club.auth.dto.UserResponse;
import com.vju.club.security.PermissionAuthorizationService;
import com.vju.club.security.SecurityIdentity;
import com.vju.club.user.dto.UpdateProfileRequest;
import com.vju.club.user.dto.UpdateUserStatusRequest;
import com.vju.club.user.dto.UserListResponse;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

@RestController
@RequestMapping("/api/v1/users")
public class UserController {

    private final UserService userService;
    private final PermissionAuthorizationService authorizationService;

    public UserController(UserService userService, PermissionAuthorizationService authorizationService) {
        this.userService = userService;
        this.authorizationService = authorizationService;
    }

    @GetMapping("/me")
    public UserResponse me(Authentication authentication) {
        return userService.getById(SecurityIdentity.userId(authentication));
    }

    @PatchMapping("/me")
    public UserResponse updateMe(
            Authentication authentication,
            @Valid @RequestBody UpdateProfileRequest request) {
        return userService.updateProfile(SecurityIdentity.userId(authentication), request);
    }

    @GetMapping
    public UserListResponse search(
            Authentication authentication,
            @RequestParam(defaultValue = "") String query,
            @RequestParam(defaultValue = "0") int offset,
            @RequestParam(defaultValue = "20") int limit,
            @RequestParam(defaultValue = "createdAt") String orderBy,
            @RequestParam(defaultValue = "desc") String orderType) {
        authorizationService.require(authentication, "user.view", null, null);
        return userService.search(query, offset, limit, orderBy, orderType);
    }

    @GetMapping("/{userId}")
    public UserResponse getById(Authentication authentication, @PathVariable UUID userId) {
        authorizationService.require(authentication, "user.view", null, null);
        return userService.getById(userId);
    }

    @PatchMapping("/{userId}/status")
    public UserResponse updateStatus(
            Authentication authentication,
            @PathVariable UUID userId,
            @Valid @RequestBody UpdateUserStatusRequest request) {
        authorizationService.require(authentication,
                request.status() == com.vju.club.entity.UserStatus.ACTIVE ? "user.active" : "user.inactive",
                null, null);
        return userService.updateStatus(userId, request);
    }
}
