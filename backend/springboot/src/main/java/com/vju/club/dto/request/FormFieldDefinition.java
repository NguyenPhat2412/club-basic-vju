package com.vju.club.dto.request;

import java.util.List;

public record FormFieldDefinition(
        String key,
        String label,
        String type,
        boolean required,
        String placeholder,
        List<String> options
) { }
