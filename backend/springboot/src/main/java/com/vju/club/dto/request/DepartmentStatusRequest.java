package com.vju.club.dto.request;

import com.vju.club.enums.DepartmentStatus;
import jakarta.validation.constraints.NotNull;

public record DepartmentStatusRequest(@NotNull DepartmentStatus status) { }
