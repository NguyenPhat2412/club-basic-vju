package com.vju.club.user;

import com.vju.club.auth.dto.UserResponse;
import com.vju.club.common.dto.PageResponse;
import com.vju.club.user.dto.UpdateProfileRequest;
import com.vju.club.user.dto.UpdateUserStatusRequest;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
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

    public UserController(UserService userService) {
        this.userService = userService;
    }

    @GetMapping("/me")
    public UserResponse me(Authentication authentication) {
        return userService.getCurrent(authentication);
    }

    @PatchMapping("/me")
    public UserResponse updateMe(
            Authentication authentication,
            @Valid @RequestBody UpdateProfileRequest request) {
        return userService.updateProfile(authentication, request);
    }

    @GetMapping
    public PageResponse<UserResponse> search(
            Authentication authentication,
            @RequestParam(defaultValue = "") String query,
            @RequestParam(defaultValue = "0") @Min(0) int offset,
            @RequestParam(defaultValue = "20") @Min(1) @Max(100) int limit,
            @RequestParam(defaultValue = "createdAt") String orderBy,
            @RequestParam(defaultValue = "desc") String orderType) {
        return userService.search(authentication, query, offset, limit, orderBy, orderType);
    }

    @GetMapping("/{userId}")
    public UserResponse getById(Authentication authentication, @PathVariable UUID userId) {
        return userService.getById(authentication, userId);
    }

    @PatchMapping("/{userId}/status")
    public UserResponse updateStatus(
            Authentication authentication,
            @PathVariable UUID userId,
            @Valid @RequestBody UpdateUserStatusRequest request) {
        return userService.updateStatus(authentication, userId, request);
    }
}
