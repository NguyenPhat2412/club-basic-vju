package com.vju.club.modules.clubapplication.controller;

import com.vju.club.common.dto.PageResponse;
import com.vju.club.modules.clubapplication.dto.request.CreateClubApplicationRequest;
import com.vju.club.modules.clubapplication.dto.request.ReviewClubApplicationRequest;
import com.vju.club.modules.clubapplication.dto.request.UpdateClubApplicationRequest;
import com.vju.club.modules.clubapplication.dto.request.UpsertClubApplicationFormRequest;
import com.vju.club.modules.clubapplication.dto.response.ClubApplicationFileResponse;
import com.vju.club.modules.clubapplication.dto.response.ClubApplicationFormResponse;
import com.vju.club.modules.clubapplication.dto.response.ClubApplicationResponse;
import com.vju.club.modules.clubapplication.dto.response.ClubApplicationSummaryResponse;
import com.vju.club.modules.clubapplication.enums.ClubApplicationStatus;
import com.vju.club.modules.clubapplication.service.ClubApplicationService;
import com.vju.club.modules.document.dto.record.DocumentContent;
import com.vju.club.modules.document.dto.record.UploadedFile;
import com.vju.club.security.Actor;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import lombok.RequiredArgsConstructor;
import org.springframework.core.io.InputStreamResource;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.nio.charset.StandardCharsets;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1")
@RequiredArgsConstructor
public class ClubApplicationController {
    private final ClubApplicationService applicationService;

    // -----------------------------------------------------------------------------------------
    // 1. Club Application Form Builder (Biểu mẫu đơn CLB - CRUD & File mẫu)
    // -----------------------------------------------------------------------------------------

    @GetMapping("/clubs/{clubId}/application-form")
    public ClubApplicationFormResponse getActiveFormForClub(Actor actor, @PathVariable UUID clubId) {
        return applicationService.getActiveFormForClub(actor, clubId);
    }

    @GetMapping("/clubs/{clubId}/application-forms")
    public List<ClubApplicationFormResponse> listFormsForClub(Actor actor, @PathVariable UUID clubId) {
        return applicationService.listFormsForClub(actor, clubId);
    }

    @PostMapping("/clubs/{clubId}/application-forms")
    public ResponseEntity<ClubApplicationFormResponse> createForm(
            Actor actor,
            @PathVariable UUID clubId,
            @Valid @RequestBody UpsertClubApplicationFormRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(applicationService.createForm(actor, clubId, request));
    }

    @PutMapping("/clubs/{clubId}/application-forms/{formId}")
    public ClubApplicationFormResponse updateForm(
            Actor actor,
            @PathVariable UUID clubId,
            @PathVariable UUID formId,
            @Valid @RequestBody UpsertClubApplicationFormRequest request) {
        return applicationService.updateForm(actor, clubId, formId, request);
    }

    @DeleteMapping("/clubs/{clubId}/application-forms/{formId}")
    public ResponseEntity<Void> deleteForm(Actor actor, @PathVariable UUID clubId, @PathVariable UUID formId) {
        applicationService.deleteForm(actor, clubId, formId);
        return ResponseEntity.noContent().build();
    }

    @PostMapping(value = "/clubs/{clubId}/application-forms/{formId}/files", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<ClubApplicationFileResponse> uploadFormFile(
            Actor actor,
            @PathVariable UUID clubId,
            @PathVariable UUID formId,
            @RequestPart("file") MultipartFile file,
            @RequestParam(required = false) String fileCategory) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(applicationService.uploadFormFile(actor, clubId, formId, fileCategory, uploaded(file)));
    }

    @DeleteMapping("/clubs/{clubId}/application-forms/{formId}/files/{fileId}")
    public ResponseEntity<Void> deleteFormFile(
            Actor actor,
            @PathVariable UUID clubId,
            @PathVariable UUID formId,
            @PathVariable UUID fileId) {
        applicationService.deleteFormFile(actor, clubId, formId, fileId);
        return ResponseEntity.noContent().build();
    }

    // -----------------------------------------------------------------------------------------
    // 2. Club Applications (Nộp đơn, Sửa, Xoá, Huỷ, Upload file đính kèm, Duyệt/Từ chối)
    // -----------------------------------------------------------------------------------------

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

    @PutMapping("/users/me/applications/{applicationId}")
    public ClubApplicationResponse updateMine(
            Actor actor,
            @PathVariable UUID applicationId,
            @Valid @RequestBody UpdateClubApplicationRequest request) {
        return applicationService.updateMine(actor, applicationId, request);
    }

    @DeleteMapping("/users/me/applications/{applicationId}")
    public ResponseEntity<Void> deleteMine(Actor actor, @PathVariable UUID applicationId) {
        applicationService.deleteMine(actor, applicationId);
        return ResponseEntity.noContent().build();
    }

    @PatchMapping("/users/me/applications/{applicationId}/cancel")
    public ClubApplicationResponse cancel(Actor actor, @PathVariable UUID applicationId) {
        return applicationService.cancel(actor, applicationId);
    }

    @PostMapping(value = "/applications/{applicationId}/files", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<ClubApplicationFileResponse> uploadApplicationFile(
            Actor actor,
            @PathVariable UUID applicationId,
            @RequestPart("file") MultipartFile file,
            @RequestParam(required = false) String fileCategory) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(applicationService.uploadApplicationFile(actor, applicationId, fileCategory, uploaded(file)));
    }

    @DeleteMapping("/applications/{applicationId}/files/{fileId}")
    public ResponseEntity<Void> deleteApplicationFile(
            Actor actor,
            @PathVariable UUID applicationId,
            @PathVariable UUID fileId) {
        applicationService.deleteApplicationFile(actor, applicationId, fileId);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/application-files/{fileId}/download")
    public ResponseEntity<InputStreamResource> downloadFile(
            Actor actor,
            @PathVariable UUID fileId,
            @RequestParam(defaultValue = "false") boolean inline) {
        DocumentContent content = applicationService.downloadFile(actor, fileId);
        ContentDisposition disposition = (inline
                ? ContentDisposition.inline()
                : ContentDisposition.attachment())
                .filename(content.fileName(), StandardCharsets.UTF_8)
                .build();
        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(content.contentType()))
                .contentLength(content.size())
                .header(HttpHeaders.CONTENT_DISPOSITION, disposition.toString())
                .header(HttpHeaders.CACHE_CONTROL, "private, max-age=3600, must-revalidate")
                .eTag("\"" + content.checksumSha256() + "\"")
                .body(new InputStreamResource(content.content()));
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

    @PutMapping("/clubs/{clubId}/applications/{applicationId}")
    public ClubApplicationResponse updateForClub(
            Actor actor,
            @PathVariable UUID clubId,
            @PathVariable UUID applicationId,
            @Valid @RequestBody UpdateClubApplicationRequest request) {
        return applicationService.updateForClub(actor, clubId, applicationId, request);
    }

    @DeleteMapping("/clubs/{clubId}/applications/{applicationId}")
    public ResponseEntity<Void> deleteForClub(Actor actor, @PathVariable UUID clubId,
                                              @PathVariable UUID applicationId) {
        applicationService.deleteForClub(actor, clubId, applicationId);
        return ResponseEntity.noContent().build();
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

    private static UploadedFile uploaded(MultipartFile file) {
        return new UploadedFile(file.getOriginalFilename(), file::getInputStream);
    }
}
