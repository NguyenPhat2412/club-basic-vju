package com.vju.club.modules.department.dto.request;

import com.vju.club.modules.department.enums.DepartmentStatus;
import jakarta.validation.constraints.NotNull;

public record DepartmentStatusRequest(@NotNull DepartmentStatus status) { }
