package com.vju.club.department.dto;

import jakarta.validation.constraints.Size;

public record DepartmentPatchRequest(@Size(max = 200) String name, String description) { }
