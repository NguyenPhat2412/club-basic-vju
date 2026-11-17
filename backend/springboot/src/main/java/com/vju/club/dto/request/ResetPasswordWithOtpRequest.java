package com.vju.club.dto.request;

import com.vju.club.annotation.ValidPassword;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record ResetPasswordWithOtpRequest(
        @NotBlank @Email @Size(max = 320) String email,
        @NotBlank @Size(min = 6, max = 6) @Pattern(regexp = "\\d{6}") String otp,
        @NotBlank @ValidPassword String newPassword
) {
}
