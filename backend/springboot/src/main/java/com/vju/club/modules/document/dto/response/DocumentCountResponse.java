package com.vju.club.modules.document.dto.response;

import java.util.UUID;

public record DocumentCountResponse(UUID clubId, boolean deleted, long count) { }
