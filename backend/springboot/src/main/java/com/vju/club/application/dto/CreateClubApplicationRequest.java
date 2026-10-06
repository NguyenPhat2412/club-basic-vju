package com.vju.club.application.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record CreateClubApplicationRequest(
        @NotBlank @Size(max = 2000) String message
) { }
