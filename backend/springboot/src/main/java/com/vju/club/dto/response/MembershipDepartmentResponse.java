package com.vju.club.dto.response;

import java.time.OffsetDateTime;
import java.util.UUID;

public record MembershipDepartmentResponse(UUID id, String name, OffsetDateTime joinedAt) { }
