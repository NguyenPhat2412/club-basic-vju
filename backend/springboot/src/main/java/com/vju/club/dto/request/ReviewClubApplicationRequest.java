package com.vju.club.dto.request;

import jakarta.validation.constraints.Size;

import java.util.UUID;

public record ReviewClubApplicationRequest(
        @Size(max = 1000) String reviewNote,
        @Size(max = 1000) String internalNote,
        UUID departmentId,
        Boolean skipDepartmentAssignment
) {
    public ReviewClubApplicationRequest(String reviewNote) {
        this(reviewNote, null, null, null);
    }

    public ReviewClubApplicationRequest(String reviewNote, UUID departmentId) {
        this(reviewNote, null, departmentId, null);
    }
}
