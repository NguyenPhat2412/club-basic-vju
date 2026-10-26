package com.vju.club.modules.clubapplication.dto.request;

import jakarta.validation.constraints.Size;

import java.util.UUID;

public record ReviewClubApplicationRequest(
        @Size(max = 1000) String reviewNote,
        UUID departmentId
) {
    public ReviewClubApplicationRequest(String reviewNote) {
        this(reviewNote, null);
    }
}
