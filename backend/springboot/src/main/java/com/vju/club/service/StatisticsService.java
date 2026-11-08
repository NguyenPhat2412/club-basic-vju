package com.vju.club.service;

import com.vju.club.dto.response.ClubStatisticsResponse;
import com.vju.club.dto.response.SystemStatisticsResponse;
import com.vju.club.security.Actor;

import java.time.OffsetDateTime;
import java.util.UUID;

public interface StatisticsService {
    SystemStatisticsResponse getSystemStatistics(Actor actor);

    ClubStatisticsResponse getClubStatistics(Actor actor, UUID clubId, OffsetDateTime from, OffsetDateTime to);
}
