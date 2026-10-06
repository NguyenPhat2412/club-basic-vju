package com.vju.club.modules.club.config.request;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record ClubRequest(
        @NotBlank @Size(max = 50) String code,
        @NotBlank @Size(max = 200) String name,
        @Size(max = 500) String logoUrl,
        @Size(max = 500) String coverUrl,
        String description,
        @Size(max = 200) String activityField,
        @Email @Size(max = 320) String contactEmail
) { }
