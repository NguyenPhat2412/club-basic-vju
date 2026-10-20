package com.vju.club.modules.department.dto.record;

import com.vju.club.modules.department.enums.DepartmentStatus;

import java.time.OffsetDateTime;
import java.util.UUID;

public record DepartmentRecord(
        UUID id,
        UUID clubId,
        String name,
        String description,
        DepartmentStatus status,
        OffsetDateTime createdAt,
        OffsetDateTime updatedAt
) { }
