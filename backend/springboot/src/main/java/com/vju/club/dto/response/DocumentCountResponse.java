package com.vju.club.dto.response;

import java.util.UUID;

public record DocumentCountResponse(UUID clubId, boolean deleted, long count) { }
