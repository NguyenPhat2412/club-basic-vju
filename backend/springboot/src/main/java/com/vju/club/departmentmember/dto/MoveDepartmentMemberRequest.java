package com.vju.club.departmentmember.dto;

import jakarta.validation.constraints.NotNull;

import java.util.UUID;

public record MoveDepartmentMemberRequest(@NotNull UUID targetDepartmentId) { }
