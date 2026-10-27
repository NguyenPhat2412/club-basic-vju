package com.vju.club.modules.role.dto.request;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.util.UUID;

public record AssignClubPositionRequest(
        @NotNull UUID userId,
        @NotNull UUID roleId,
        UUID departmentId,
        Boolean replaceHolder,
        @Size(max = 1000) String reason
) { }
