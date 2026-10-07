package com.vju.club.modules.user.config.request;

import com.vju.club.modules.user.entity.UserStatus;
import jakarta.validation.constraints.NotNull;

public record UpdateUserStatusRequest(@NotNull UserStatus status) { }
