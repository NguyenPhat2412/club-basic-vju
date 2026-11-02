package com.vju.club.dto.request;

import com.vju.club.enums.UserStatus;
import jakarta.validation.constraints.NotNull;

public record UpdateUserStatusRequest(@NotNull UserStatus status) { }
