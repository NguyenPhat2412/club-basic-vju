package com.vju.club.club;

import com.vju.club.security.Actor;
import com.vju.club.club.dto.ClubRequest;
import com.vju.club.club.dto.ClubPatchRequest;
import com.vju.club.club.dto.ClubResponse;
import com.vju.club.club.dto.ClubStatusRequest;
import com.vju.club.common.dto.PageResponse;
import com.vju.club.entity.ClubStatus;
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

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/clubs")
public class ClubController {

    private final ClubService clubService;

    public ClubController(ClubService clubService) { this.clubService = clubService; }

    @GetMapping
    public PageResponse<ClubResponse> list(Actor actor,
                                   @RequestParam(defaultValue = "") String query,
                                   @RequestParam(required = false) String category,
                                   @RequestParam(required = false) ClubStatus status,
                                   @RequestParam(defaultValue = "0") @Min(0) int offset,
                                   @RequestParam(defaultValue = "20") @Min(1) @Max(100) int limit) {
        return clubService.list(actor, query, category, status, offset, limit);
    }

    @GetMapping("/{clubId}")
    public ClubResponse get(Actor actor, @PathVariable UUID clubId) {
        return clubService.get(actor, clubId);
    }

    @PostMapping
    public ResponseEntity<ClubResponse> create(Actor actor, @Valid @RequestBody ClubRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(clubService.create(actor, request));
    }

    @PatchMapping("/{clubId}")
    public ClubResponse update(Actor actor, @PathVariable UUID clubId,
                               @Valid @RequestBody ClubPatchRequest request) {
        return clubService.update(actor, clubId, request);
    }

    @PatchMapping("/{clubId}/status")
    public ClubResponse updateStatus(Actor actor, @PathVariable UUID clubId,
                                     @Valid @RequestBody ClubStatusRequest request) {
        return clubService.updateStatus(actor, clubId, request);
    }
}
