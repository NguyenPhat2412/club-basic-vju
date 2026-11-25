package com.vju.club.controller;

import com.vju.club.common.ApiPaths;
import com.vju.club.dto.response.TrainingPointReportResponse;
import com.vju.club.security.Actor;
import com.vju.club.service.TrainingPointReportService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.constraints.Size;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.OffsetDateTime;
import java.util.UUID;

@RestController
@RequestMapping(ApiPaths.API_V1)
@RequiredArgsConstructor
@Validated
@Tag(name = "Reports", description = "Báo cáo tổng hợp điểm rèn luyện theo sinh viên, CLB và học kỳ")
public class TrainingPointReportController {
    private final TrainingPointReportService trainingPointReportService;

    @GetMapping(ApiPaths.REPORTS_TRAINING_POINTS)
    @Operation(summary = "Xuất dữ liệu báo cáo điểm rèn luyện")
    public TrainingPointReportResponse getTrainingPointsReport(
            Actor actor,
            @RequestParam(required = false) UUID clubId,
            @RequestParam(required = false) @Size(max = 16) String academicTerm,
            @RequestParam(required = false) @Size(max = 120) String search,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) OffsetDateTime from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) OffsetDateTime to
    ) {
        return trainingPointReportService.getReport(actor, clubId, academicTerm, search, from, to);
    }
}
