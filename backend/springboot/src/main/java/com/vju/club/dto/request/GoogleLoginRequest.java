package com.vju.club.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record GoogleLoginRequest(
        @NotBlank @Size(max = 4096) String credential,
        Boolean register,
        @Size(max = 12) String otpCode
) {
    public GoogleLoginRequest(String credential, Boolean register) {
        this(credential, register, null);
    }
}
