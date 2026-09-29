package com.vju.club.user.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.validation.constraints.Size;

@JsonIgnoreProperties(ignoreUnknown = false)
public record UpdateProfileRequest(
        @Size(max = 200) String fullName,
        @Size(max = 32) String phone,
        @Size(max = 500) String avatarUrl
) { }
