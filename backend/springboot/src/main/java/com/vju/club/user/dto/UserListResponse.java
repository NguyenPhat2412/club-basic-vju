package com.vju.club.user.dto;

import com.vju.club.auth.dto.UserResponse;

import java.util.List;

public record UserListResponse(List<UserResponse> items, long total, int offset, int limit) { }
