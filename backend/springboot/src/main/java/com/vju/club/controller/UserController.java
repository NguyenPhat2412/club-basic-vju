package com.vju.club.controller;

import lombok.RequiredArgsConstructor;
import com.vju.club.common.ApiPaths;
import com.vju.club.service.UserService;

import com.vju.club.security.Actor;
import com.vju.club.dto.response.UserResponse;
import com.vju.club.dto.response.PageResponse;
import com.vju.club.dto.request.AdminUpdateUserRequest;
import com.vju.club.dto.request.UpdateProfileRequest;
import com.vju.club.dto.request.UpdateUserStatusRequest;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import com.vju.club.dto.request.CreateUserRequest;
import com.vju.club.dto.request.ResetPasswordRequest;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

@RestController
@RequestMapping(ApiPaths.API_V1)
@RequiredArgsConstructor
public class UserController {
    private final UserService userService;

    @GetMapping(ApiPaths.USERS_ME)
    public UserResponse me(Actor actor) {
        return userService.getCurrent(actor);
    }

    @PatchMapping(ApiPaths.USERS_ME)
    public UserResponse updateMe(
            Actor actor,
            @Valid @RequestBody UpdateProfileRequest request) {
        return userService.updateProfile(actor, request);
    }

    @PostMapping(ApiPaths.USERS)
    public ResponseEntity<UserResponse> create(Actor actor, @Valid @RequestBody CreateUserRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(userService.create(actor, request));
    }

    @GetMapping(ApiPaths.USERS)
    public PageResponse<UserResponse> search(
            Actor actor,
            @RequestParam(defaultValue = "") String query,
            @RequestParam(defaultValue = "0") @Min(0) int offset,
            @RequestParam(defaultValue = "20") @Min(1) @Max(100) int limit,
            @RequestParam(defaultValue = "createdAt") String orderBy,
            @RequestParam(defaultValue = "desc") String orderType) {
        return userService.search(actor, query, offset, limit, orderBy, orderType);
    }

    @GetMapping(ApiPaths.USER_BY_ID)
    public UserResponse getById(Actor actor, @PathVariable UUID userId) {
        return userService.getById(actor, userId);
    }

    @PatchMapping(ApiPaths.USER_BY_ID)
    public UserResponse updateUser(
            Actor actor,
            @PathVariable UUID userId,
            @Valid @RequestBody AdminUpdateUserRequest request) {
        return userService.updateUser(actor, userId, request);
    }

    @PatchMapping(ApiPaths.USER_PASSWORD)
    public ResponseEntity<Void> resetPassword(Actor actor, @PathVariable UUID userId,
                                              @Valid @RequestBody ResetPasswordRequest request) {
        userService.resetPassword(actor, userId, request);
        return ResponseEntity.noContent().build();
    }

    @PatchMapping(ApiPaths.USER_STATUS)
    public UserResponse updateStatus(
            Actor actor,
            @PathVariable UUID userId,
            @Valid @RequestBody UpdateUserStatusRequest request) {
        return userService.updateStatus(actor, userId, request);
    }

    @DeleteMapping(ApiPaths.USER_BY_ID)
    public ResponseEntity<Void> deleteUser(
            Actor actor,
            @PathVariable UUID userId,
            @RequestParam(required = false) Boolean anonymize) {
        userService.deleteUser(actor, userId, anonymize);
        return ResponseEntity.noContent().build();
    }
}
