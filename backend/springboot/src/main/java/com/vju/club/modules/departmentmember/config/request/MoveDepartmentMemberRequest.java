package com.vju.club.modules.departmentmember.config.request;

import jakarta.validation.constraints.NotNull;

import java.util.UUID;

public record MoveDepartmentMemberRequest(@NotNull UUID targetDepartmentId) { }
