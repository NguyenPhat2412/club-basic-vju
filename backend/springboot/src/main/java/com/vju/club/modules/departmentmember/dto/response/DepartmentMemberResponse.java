package com.vju.club.modules.departmentmember.dto.response;

import java.time.OffsetDateTime;
import java.util.UUID;

public record DepartmentMemberResponse(UUID id, UUID departmentId, UUID membershipId, UUID userId, OffsetDateTime joinedAt) { }
