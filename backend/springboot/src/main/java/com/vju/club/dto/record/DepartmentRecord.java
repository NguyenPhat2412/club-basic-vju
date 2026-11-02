package com.vju.club.dto.record;

import com.vju.club.enums.DepartmentStatus;

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
