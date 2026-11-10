package com.vju.club.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.Size;

import java.util.List;

public record TranslateBatchRequest(
        @NotBlank(message = "Target locale is required")
        String locale,

        @NotEmpty(message = "Texts list must not be empty")
        @Size(max = 30, message = "At most 30 texts can be translated per batch")
        List<String> texts
) {
}
