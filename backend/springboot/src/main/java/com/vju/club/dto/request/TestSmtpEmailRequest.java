package com.vju.club.dto.request;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record TestSmtpEmailRequest(
        @NotBlank @Email @Size(max = 320) String recipientEmail
) {
}
