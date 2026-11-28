package com.vju.club.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record CreateClubPostRequest(
        @Size(max = 160) String title,
        @NotBlank @Size(max = 4000) String content,
        @Size(max = 500) String imageUrl,
        Boolean pinned) {
}
