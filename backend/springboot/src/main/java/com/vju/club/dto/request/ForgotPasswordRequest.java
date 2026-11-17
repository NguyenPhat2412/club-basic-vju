package com.vju.club.dto.request;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record ForgotPasswordRequest(
        @NotBlank @Email @Size(max = 320) String email,
        @Size(max = 50) String studentCode,
        @Size(max = 500) String note
) {
}
