package com.vju.club.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.util.List;

public record TranslateBatchRequest(
        @NotBlank(message = "Target locale is required")
        @Size(max = 16, message = "Target locale must be at most 16 characters")
        String locale,

        @NotEmpty(message = "Texts list must not be empty")
        @Size(max = 30, message = "At most 30 texts can be translated per batch")
        List<@NotNull @Size(max = 2000, message = "Each text must be at most 2000 characters") String> texts
) {
}
