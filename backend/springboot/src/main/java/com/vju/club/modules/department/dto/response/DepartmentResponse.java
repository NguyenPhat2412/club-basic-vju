package com.vju.club.modules.department.dto.response;

import java.time.OffsetDateTime;
import java.util.UUID;

public record DepartmentResponse(
        UUID id, UUID clubId, String name, String description, String status,
        OffsetDateTime createdAt, OffsetDateTime updatedAt) { }
