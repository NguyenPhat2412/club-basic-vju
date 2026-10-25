package com.vju.club.modules.departmentmember.dto.request;

import jakarta.validation.constraints.NotNull;

import java.util.UUID;

public record MoveDepartmentMemberRequest(@NotNull UUID targetDepartmentId) { }
