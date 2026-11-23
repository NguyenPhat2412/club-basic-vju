package com.vju.club.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record ClubFacebookConnectTokenRequest(
        @NotBlank(message = "Page Access Token không được để trống")
        @Size(max = 2000, message = "Page Access Token quá dài")
        String accessToken
) {
}
