package com.vju.club.modules.department.config.response;

import com.vju.club.modules.department.entity.Department;

import java.time.OffsetDateTime;
import java.util.UUID;

public record DepartmentResponse(
        UUID id, UUID clubId, String name, String description, String status,
        OffsetDateTime createdAt, OffsetDateTime updatedAt) {
    public static DepartmentResponse from(Department department) {
        return new DepartmentResponse(department.getId(), department.getClub().getId(), department.getName(),
                department.getDescription(), department.getStatus().name(), department.getCreatedAt(), department.getUpdatedAt());
    }
}
