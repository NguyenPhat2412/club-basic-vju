package com.vju.club.modules.club.controller;

import com.vju.club.modules.auth.annotation.PublicEndpoint;
import lombok.RequiredArgsConstructor;
import com.vju.club.modules.club.service.ClubService;

import com.vju.club.security.Actor;
import com.vju.club.modules.club.dto.request.ClubRequest;
import com.vju.club.modules.club.dto.request.ClubPatchRequest;
import com.vju.club.modules.club.dto.response.ClubResponse;
import com.vju.club.modules.club.dto.request.ClubStatusRequest;
import com.vju.club.common.dto.PageResponse;
import com.vju.club.modules.club.enums.ClubStatus;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

@RestController
@RequestMapping("/api/v1")
@RequiredArgsConstructor
public class ClubController {
    private final ClubService clubService;

    @PublicEndpoint(reason = "Public club discovery on landing page")
    @GetMapping("/public/clubs")
    public PageResponse<ClubResponse> listPublic(
            @RequestParam(defaultValue = "") String query,
            @RequestParam(required = false) String category,
            @RequestParam(defaultValue = "0") @Min(0) int offset,
            @RequestParam(defaultValue = "20") @Min(1) @Max(100) int limit) {
        return clubService.listPublic(query, category, offset, limit);
    }

    @PublicEndpoint(reason = "Public club detail on landing page")
    @GetMapping("/public/clubs/{clubId}")
    public ClubResponse getPublic(@PathVariable UUID clubId) {
        return clubService.getPublic(clubId);
    }

    @GetMapping("/clubs")
    public PageResponse<ClubResponse> list(Actor actor,
                                   @RequestParam(defaultValue = "") String query,
                                   @RequestParam(required = false) String category,
                                   @RequestParam(required = false) ClubStatus status,
                                   @RequestParam(defaultValue = "0") @Min(0) int offset,
                                   @RequestParam(defaultValue = "20") @Min(1) @Max(100) int limit) {
        return clubService.list(actor, query, category, status, offset, limit);
    }

    @GetMapping("/clubs/{clubId}")
    public ClubResponse get(Actor actor, @PathVariable UUID clubId) {
        return clubService.get(actor, clubId);
    }

    @PostMapping("/clubs")
    public ResponseEntity<ClubResponse> create(Actor actor, @Valid @RequestBody ClubRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(clubService.create(actor, request));
    }

    @PatchMapping("/clubs/{clubId}")
    public ClubResponse update(Actor actor, @PathVariable UUID clubId,
                               @Valid @RequestBody ClubPatchRequest request) {
        return clubService.update(actor, clubId, request);
    }

    @PatchMapping("/clubs/{clubId}/status")
    public ClubResponse updateStatus(Actor actor, @PathVariable UUID clubId,
                                     @Valid @RequestBody ClubStatusRequest request) {
        return clubService.updateStatus(actor, clubId, request);
    }
}
