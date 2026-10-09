package com.vju.club.modules.user.controller;

import com.vju.club.modules.user.service.UserService;

import com.vju.club.security.Actor;
import com.vju.club.modules.user.dto.response.UserResponse;
import com.vju.club.common.dto.PageResponse;
import com.vju.club.modules.user.dto.request.UpdateProfileRequest;
import com.vju.club.modules.user.dto.request.UpdateUserStatusRequest;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
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
    public UserResponse me(Actor actor) {
        return userService.getCurrent(actor);
    }

    @PatchMapping("/me")
    public UserResponse updateMe(
            Actor actor,
            @Valid @RequestBody UpdateProfileRequest request) {
        return userService.updateProfile(actor, request);
    }

    @GetMapping
    public PageResponse<UserResponse> search(
            Actor actor,
            @RequestParam(defaultValue = "") String query,
            @RequestParam(defaultValue = "0") @Min(0) int offset,
            @RequestParam(defaultValue = "20") @Min(1) @Max(100) int limit,
            @RequestParam(defaultValue = "createdAt") String orderBy,
            @RequestParam(defaultValue = "desc") String orderType) {
        return userService.search(actor, query, offset, limit, orderBy, orderType);
    }

    @GetMapping("/{userId}")
    public UserResponse getById(Actor actor, @PathVariable UUID userId) {
        return userService.getById(actor, userId);
    }

    @PatchMapping("/{userId}/status")
    public UserResponse updateStatus(
            Actor actor,
            @PathVariable UUID userId,
            @Valid @RequestBody UpdateUserStatusRequest request) {
        return userService.updateStatus(actor, userId, request);
    }
}
