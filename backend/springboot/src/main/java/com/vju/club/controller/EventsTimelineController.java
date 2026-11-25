package com.vju.club.controller;

import com.vju.club.common.ApiPaths;
import com.vju.club.dto.response.EventsTimelineResponse;
import com.vju.club.security.Actor;
import com.vju.club.service.impl.EventsTimelineServiceImpl;
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
@Tag(name = "Events", description = "Lịch tổng hợp và biểu đồ GANTT sự kiện đa đơn vị")
public class EventsTimelineController {
    private final EventsTimelineServiceImpl eventsTimelineService;

    @GetMapping(ApiPaths.EVENTS_TIMELINE)
    @Operation(summary = "Lấy dòng thời gian sự kiện theo 13 đơn vị / CLB")
    public EventsTimelineResponse getEventsTimeline(
            Actor actor,
            @RequestParam(required = false) UUID clubId,
            @RequestParam(required = false) @Size(max = 16) String academicTerm,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) OffsetDateTime from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) OffsetDateTime to
    ) {
        return eventsTimelineService.getTimeline(actor, clubId, academicTerm, from, to);
    }
}
