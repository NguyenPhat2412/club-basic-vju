package com.vju.club.dto.response;

import java.time.OffsetDateTime;

public record DocumentDownloadUrlResponse(String url, int version, OffsetDateTime expiresAt) { }
