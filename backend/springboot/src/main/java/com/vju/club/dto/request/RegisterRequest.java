package com.vju.club.dto.request;

import static com.vju.club.common.UserConstants.PHONE_PATTERN;
import com.vju.club.annotation.ValidPassword;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record RegisterRequest(
        @NotBlank @Email @Size(max = 320) String email,
        @NotBlank @ValidPassword String password,
        @NotBlank @Size(max = 200) String fullName,
        @Size(max = 50) String studentCode,
        @Size(max = 32) @Pattern(regexp = PHONE_PATTERN, message = "may only contain digits, spaces and + ( ) - .") String phone
) {
}
