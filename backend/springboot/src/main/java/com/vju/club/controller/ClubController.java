package com.vju.club.controller;

import com.vju.club.annotation.PublicEndpoint;
import com.vju.club.common.ApiPaths;
import com.vju.club.dto.record.ClubMediaContent;
import com.vju.club.dto.record.UploadedFile;
import lombok.RequiredArgsConstructor;
import com.vju.club.service.ClubService;

import com.vju.club.security.Actor;
import com.vju.club.dto.request.ClubRequest;
import com.vju.club.dto.request.ClubPatchRequest;
import com.vju.club.dto.response.ClubResponse;
import com.vju.club.dto.request.ClubStatusRequest;
import com.vju.club.dto.response.PageResponse;
import com.vju.club.enums.ClubStatus;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import org.springframework.core.io.InputStreamResource;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping(ApiPaths.API_V1)
@RequiredArgsConstructor
public class ClubController {
    private final ClubService clubService;

    @PublicEndpoint(reason = "Public club discovery on landing page")
    @GetMapping(ApiPaths.PUBLIC_CLUBS)
    public PageResponse<ClubResponse> listPublic(
            @RequestParam(defaultValue = "") String query,
            @RequestParam(required = false) String category,
            @RequestParam(defaultValue = "0") @Min(0) int offset,
            @RequestParam(defaultValue = "20") @Min(1) @Max(100) int limit) {
        return clubService.listPublic(query, category, offset, limit);
    }

    @PublicEndpoint(reason = "Public club categories for discovery filter")
    @GetMapping(ApiPaths.PUBLIC_CLUB_CATEGORIES)
    public List<String> listPublicCategories() {
        return clubService.listPublicCategories();
    }

    @PublicEndpoint(reason = "Public club detail on landing page")
    @GetMapping(ApiPaths.PUBLIC_CLUB_BY_ID)
    public ClubResponse getPublic(@PathVariable UUID clubId) {
        return clubService.getPublic(clubId);
    }

    @PublicEndpoint(reason = "Public club logo streamed from Cloudflare R2")
    @GetMapping(ApiPaths.PUBLIC_CLUB_LOGO)
    public ResponseEntity<InputStreamResource> getPublicLogo(@PathVariable UUID clubId) {
        return mediaResponse(clubService.getLogoContent(clubId));
    }

    @PublicEndpoint(reason = "Public club cover streamed from Cloudflare R2")
    @GetMapping(ApiPaths.PUBLIC_CLUB_COVER)
    public ResponseEntity<InputStreamResource> getPublicCover(@PathVariable UUID clubId) {
        return mediaResponse(clubService.getCoverContent(clubId));
    }

    @GetMapping(ApiPaths.CLUBS)
    public PageResponse<ClubResponse> list(Actor actor,
                                   @RequestParam(defaultValue = "") String query,
                                   @RequestParam(required = false) String category,
                                   @RequestParam(required = false) ClubStatus status,
                                   @RequestParam(defaultValue = "0") @Min(0) int offset,
                                   @RequestParam(defaultValue = "20") @Min(1) @Max(100) int limit) {
        return clubService.list(actor, query, category, status, offset, limit);
    }

    @GetMapping(ApiPaths.CLUB_BY_ID)
    public ClubResponse get(Actor actor, @PathVariable UUID clubId) {
        return clubService.get(actor, clubId);
    }

    @PostMapping(ApiPaths.CLUBS)
    public ResponseEntity<ClubResponse> create(Actor actor, @Valid @RequestBody ClubRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(clubService.create(actor, request));
    }

    @PatchMapping(ApiPaths.CLUB_BY_ID)
    public ClubResponse update(Actor actor, @PathVariable UUID clubId,
                               @Valid @RequestBody ClubPatchRequest request) {
        return clubService.update(actor, clubId, request);
    }

    @PatchMapping(ApiPaths.CLUB_STATUS)
    public ClubResponse updateStatus(Actor actor, @PathVariable UUID clubId,
                                     @Valid @RequestBody ClubStatusRequest request) {
        return clubService.updateStatus(actor, clubId, request);
    }

    @PostMapping(value = ApiPaths.CLUB_LOGO, consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @ResponseStatus(HttpStatus.CREATED)
    public ClubResponse uploadLogo(Actor actor, @PathVariable UUID clubId,
                                   @RequestPart("file") MultipartFile file) {
        return clubService.uploadLogo(actor, clubId, new UploadedFile(file.getOriginalFilename(), file::getInputStream));
    }

    @PostMapping(value = ApiPaths.CLUB_COVER, consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @ResponseStatus(HttpStatus.CREATED)
    public ClubResponse uploadCover(Actor actor, @PathVariable UUID clubId,
                                    @RequestPart("file") MultipartFile file) {
        return clubService.uploadCover(actor, clubId, new UploadedFile(file.getOriginalFilename(), file::getInputStream));
    }

    private static ResponseEntity<InputStreamResource> mediaResponse(ClubMediaContent media) {
        ResponseEntity.BodyBuilder builder = ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(media.contentType()))
                .header(HttpHeaders.CONTENT_DISPOSITION,
                        ContentDisposition.inline().filename(media.fileName(), StandardCharsets.UTF_8).build().toString())
                .header(HttpHeaders.CACHE_CONTROL, "public, max-age=86400");
        if (media.sizeBytes() != null && media.sizeBytes() > 0) {
            builder.contentLength(media.sizeBytes());
        }
        return builder.body(new InputStreamResource(media.content()));
    }
}
