package com.vju.club.dto.response;

import java.util.Map;

public record TranslateBatchResponse(
        String locale,
        Map<String, String> translations,
        String provider
) {
}
