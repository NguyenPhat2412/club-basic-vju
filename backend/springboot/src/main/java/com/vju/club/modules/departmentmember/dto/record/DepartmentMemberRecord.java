package com.vju.club.modules.departmentmember.dto.record;

import java.time.OffsetDateTime;
import java.util.UUID;

public record DepartmentMemberRecord(
        UUID id,
        UUID clubId,
        UUID departmentId,
        UUID membershipId,
        UUID userId,
        OffsetDateTime joinedAt
) { }
