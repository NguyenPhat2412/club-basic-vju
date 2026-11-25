package com.vju.club.dto.response;

import java.io.Serializable;
import java.util.UUID;

public record ClubUsageResponse(
        UUID clubId,
        long storageUsedBytes,
        long documentBytes,
        long chatMediaBytes,
        long storageQuotaBytes,
        int storageQuotaMb,
        long channelCount,
        int maxChannelsPerClub,
        long departmentCount,
        int maxDepartmentsPerClub,
        long activeEventCount,
        int maxActiveEventsPerClub,
        long openTaskCount,
        int maxOpenTasksPerClub
) implements Serializable {
}
