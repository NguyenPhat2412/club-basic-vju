package com.vju.club.department.dto;

import com.vju.club.entity.DepartmentStatus;
import jakarta.validation.constraints.NotNull;

public record DepartmentStatusRequest(@NotNull DepartmentStatus status) { }
