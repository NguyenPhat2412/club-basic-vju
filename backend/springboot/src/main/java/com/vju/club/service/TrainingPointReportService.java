package com.vju.club.service;

import com.vju.club.dto.response.TrainingPointReportResponse;
import com.vju.club.security.Actor;

import java.time.OffsetDateTime;
import java.util.UUID;

public interface TrainingPointReportService {
    TrainingPointReportResponse getReport(
            Actor actor,
            UUID clubId,
            String academicTerm,
            String search,
            OffsetDateTime from,
            OffsetDateTime to
    );
}
