package com.vju.club.dto.record;

import java.io.InputStream;

public record ClubMediaContent(
        String fileName,
        String contentType,
        Long sizeBytes,
        InputStream content
) { }
