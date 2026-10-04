package com.vju.club.club.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.Size;

public record ClubPatchRequest(
        @Size(max = 50) String code,
        @Size(max = 200) String name,
        @Size(max = 500) String logoUrl,
        @Size(max = 500) String coverUrl,
        String description,
        @Size(max = 200) String activityField,
        @Email @Size(max = 320) String contactEmail
) { }
