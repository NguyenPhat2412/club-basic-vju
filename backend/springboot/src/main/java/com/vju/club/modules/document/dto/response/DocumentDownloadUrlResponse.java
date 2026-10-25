package com.vju.club.modules.document.dto.response;

import java.time.OffsetDateTime;

public record DocumentDownloadUrlResponse(String url, int version, OffsetDateTime expiresAt) { }
