package com.vju.club.modules.user.dto.request;

import com.vju.club.modules.user.enums.UserStatus;
import jakarta.validation.constraints.NotNull;

public record UpdateUserStatusRequest(@NotNull UserStatus status) { }
