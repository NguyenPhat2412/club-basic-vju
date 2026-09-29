package com.vju.club.user.dto;

import com.vju.club.entity.UserStatus;
import jakarta.validation.constraints.NotNull;

public record UpdateUserStatusRequest(@NotNull UserStatus status) { }
