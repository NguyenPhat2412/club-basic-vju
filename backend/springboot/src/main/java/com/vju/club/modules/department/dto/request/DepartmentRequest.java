package com.vju.club.modules.department.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record DepartmentRequest(@NotBlank @Size(max = 200) String name, String description) { }
