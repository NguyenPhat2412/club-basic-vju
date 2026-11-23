package com.vju.club.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record ClubFacebookOAuthSelectRequest(
        @NotBlank(message = "Thiếu mã phiên chọn Fanpage")
        @Size(max = 200)
        String selectionToken,
        @NotBlank(message = "Thiếu mã Fanpage cần gắn")
        @Size(max = 100)
        String pageId
) {
}
