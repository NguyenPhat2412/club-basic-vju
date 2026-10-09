package com.vju.club.modules.department.dto.request;

import jakarta.validation.constraints.Size;

public record DepartmentPatchRequest(@Size(max = 200) String name, @Size(max = 2000) String description) { }
