package com.vju.club.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import java.util.List;

public record FormFieldDefinition(
        @NotBlank @Size(max = 100) String key,
        @NotBlank @Size(max = 200) String label,
        @Size(max = 40) String type,
        boolean required,
        @Size(max = 300) String placeholder,
        @Size(max = 50) List<@NotBlank @Size(max = 200) String> options
) { }
