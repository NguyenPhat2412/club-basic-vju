package com.vju.club.controller;

import com.vju.club.common.ApiPaths;
import com.vju.club.dto.response.ClubStatisticsResponse;
import com.vju.club.dto.response.SystemStatisticsResponse;
import com.vju.club.security.Actor;
import com.vju.club.service.StatisticsService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.OffsetDateTime;
import java.util.UUID;

@RestController
@RequestMapping(ApiPaths.API_V1)
@RequiredArgsConstructor
@Tag(name = "Statistics", description = "Thống kê tổng quan quản trị hệ thống và thống kê hoạt động CLB (PB-36.1, PB-36.2)")
public class StatisticsController {
    private final StatisticsService statisticsService;

    @GetMapping(ApiPaths.SYSTEM_STATISTICS)
    @Operation(summary = "Thống kê số liệu tài khoản, CLB và cơ cấu nhóm quyền toàn hệ thống (PB-36.1)")
    public SystemStatisticsResponse getSystemStatistics(Actor actor) {
        return statisticsService.getSystemStatistics(actor);
    }

    @GetMapping(ApiPaths.CLUB_STATISTICS)
    @Operation(summary = "Thống kê hoạt động CLB theo khoảng thời gian (PB-36.2)",
            description = "Phân biệt rõ số người tham gia duy nhất, số lượt đăng ký hợp lệ và số lượt có mặt thực tế.")
    public ClubStatisticsResponse getClubStatistics(
            Actor actor,
            @PathVariable UUID clubId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) OffsetDateTime from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) OffsetDateTime to) {
        return statisticsService.getClubStatistics(actor, clubId, from, to);
    }
}
