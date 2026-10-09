package com.vju.club.modules.clubapplication.controller;

import com.vju.club.modules.clubapplication.service.ClubApplicationService;

import com.vju.club.modules.clubapplication.dto.response.ClubApplicationResponse;
import com.vju.club.modules.clubapplication.dto.response.ClubApplicationSummaryResponse;
import com.vju.club.modules.clubapplication.dto.request.CreateClubApplicationRequest;
import com.vju.club.modules.clubapplication.dto.request.ReviewClubApplicationRequest;
import com.vju.club.common.dto.PageResponse;
import com.vju.club.modules.clubapplication.enums.ClubApplicationStatus;
import com.vju.club.security.Actor;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.format.annotation.DateTimeFormat;

import java.util.UUID;
import java.time.OffsetDateTime;

@RestController
@RequestMapping("/api/v1")
public class ClubApplicationController {

    private final ClubApplicationService applicationService;

    public ClubApplicationController(ClubApplicationService applicationService) {
        this.applicationService = applicationService;
    }

    @PostMapping("/clubs/{clubId}/applications")
    public ResponseEntity<ClubApplicationResponse> create(Actor actor, @PathVariable UUID clubId,
                                                          @Valid @RequestBody CreateClubApplicationRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(applicationService.create(actor, clubId, request));
    }

    @GetMapping("/users/me/applications")
    public PageResponse<ClubApplicationSummaryResponse> listMine(
            Actor actor,
            @RequestParam(required = false) ClubApplicationStatus status,
            @RequestParam(required = false) UUID clubId,
            @RequestParam(required = false) String sort,
            @RequestParam(defaultValue = "0") @Min(0) int offset,
            @RequestParam(defaultValue = "20") @Min(1) @Max(100) int limit) {
        return applicationService.listMine(actor, status, clubId, sort, offset, limit);
    }

    @GetMapping("/users/me/applications/{applicationId}")
    public ClubApplicationResponse getMine(Actor actor, @PathVariable UUID applicationId) {
        return applicationService.getMine(actor, applicationId);
    }

    @PatchMapping("/users/me/applications/{applicationId}/cancel")
    public ClubApplicationResponse cancel(Actor actor, @PathVariable UUID applicationId) {
        return applicationService.cancel(actor, applicationId);
    }

    @GetMapping("/clubs/{clubId}/applications")
    public PageResponse<ClubApplicationResponse> listForClub(
            Actor actor, @PathVariable UUID clubId,
            @RequestParam(required = false) ClubApplicationStatus status,
            @RequestParam(required = false) String search,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) OffsetDateTime createdFrom,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) OffsetDateTime createdTo,
            @RequestParam(required = false) String sort,
            @RequestParam(defaultValue = "0") @Min(0) int offset,
            @RequestParam(defaultValue = "20") @Min(1) @Max(100) int limit) {
        return applicationService.listForClub(actor, clubId, status, search, createdFrom, createdTo, sort, offset, limit);
    }

    @GetMapping("/clubs/{clubId}/applications/{applicationId}")
    public ClubApplicationResponse getForClub(Actor actor, @PathVariable UUID clubId,
                                              @PathVariable UUID applicationId) {
        return applicationService.getForClub(actor, clubId, applicationId);
    }

    @PostMapping("/clubs/{clubId}/applications/{applicationId}/approve")
    public ClubApplicationResponse approve(Actor actor, @PathVariable UUID clubId,
                                           @PathVariable UUID applicationId,
                                           @Valid @RequestBody(required = false) ReviewClubApplicationRequest request) {
        return applicationService.approve(actor, clubId, applicationId, request);
    }

    @PostMapping("/clubs/{clubId}/applications/{applicationId}/reject")
    public ClubApplicationResponse reject(Actor actor, @PathVariable UUID clubId,
                                          @PathVariable UUID applicationId,
                                          @Valid @RequestBody(required = false) ReviewClubApplicationRequest request) {
        return applicationService.reject(actor, clubId, applicationId, request);
    }
}
