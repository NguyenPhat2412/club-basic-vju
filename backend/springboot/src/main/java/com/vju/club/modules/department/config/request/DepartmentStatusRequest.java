package com.vju.club.modules.department.config.request;

import com.vju.club.modules.department.entity.DepartmentStatus;
import jakarta.validation.constraints.NotNull;

public record DepartmentStatusRequest(@NotNull DepartmentStatus status) { }
