package com.vju.club.modules.clubapplication.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record CreateClubApplicationRequest(
        @NotBlank @Size(max = 2000) String message
) { }
