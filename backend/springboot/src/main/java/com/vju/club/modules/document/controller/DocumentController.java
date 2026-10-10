package com.vju.club.modules.document.controller;

import com.vju.club.common.dto.PageResponse;
import com.vju.club.modules.document.dto.request.DocumentPatchRequest;
import com.vju.club.modules.document.dto.response.DocumentCountResponse;
import com.vju.club.modules.document.dto.response.DocumentDownloadUrlResponse;
import com.vju.club.modules.document.dto.response.DocumentNamesResponse;
import com.vju.club.modules.document.dto.response.DocumentResponse;
import com.vju.club.modules.document.dto.response.DocumentVersionResponse;
import com.vju.club.modules.document.service.DocumentContent;
import com.vju.club.modules.document.service.DocumentService;
import com.vju.club.modules.document.service.UploadedFile;
import com.vju.club.security.Actor;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import lombok.RequiredArgsConstructor;
import org.springframework.core.io.InputStreamResource;
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
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1")
@RequiredArgsConstructor
public class DocumentController {
    private final DocumentService documentService;

    @GetMapping("/clubs/{clubId}/documents")
    public PageResponse<DocumentResponse> list(Actor actor, @PathVariable UUID clubId,
                                               @RequestParam(required = false) String name,
                                               @RequestParam(required = false) String appDetailKey,
                                               @RequestParam(defaultValue = "false") boolean deleted,
                                               @RequestParam(defaultValue = "0") @Min(0) int offset,
                                               @RequestParam(defaultValue = "20") @Min(1) @Max(100) int limit) {
        return documentService.list(actor, clubId, name, appDetailKey, deleted, offset, limit);
    }

    @GetMapping("/clubs/{clubId}/documents/count")
    public DocumentCountResponse count(Actor actor, @PathVariable UUID clubId,
                                       @RequestParam(required = false) String appDetailKey,
                                       @RequestParam(defaultValue = "false") boolean deleted) {
        return documentService.getDocCount(actor, clubId, appDetailKey, deleted);
    }

    @GetMapping("/clubs/{clubId}/documents/names")
    public DocumentNamesResponse names(Actor actor, @PathVariable UUID clubId,
                                       @RequestParam(defaultValue = "false") boolean deleted) {
        return documentService.getDocumentNames(actor, clubId, deleted);
    }

    @PostMapping(value = "/clubs/{clubId}/documents", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<DocumentResponse> upload(Actor actor, @PathVariable UUID clubId,
                                                   @RequestPart("file") MultipartFile file,
                                                   @RequestParam(required = false) String name,
                                                   @RequestParam(required = false) String appDetailKey) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(documentService.upload(actor, clubId, name, appDetailKey, uploaded(file)));
    }

    @GetMapping("/documents/{documentId}")
    public DocumentResponse get(Actor actor, @PathVariable UUID documentId) {
        return documentService.get(actor, documentId);
    }

    @PatchMapping("/documents/{documentId}")
    public DocumentResponse update(Actor actor, @PathVariable UUID documentId,
                                   @Valid @RequestBody DocumentPatchRequest request) {
        return documentService.update(actor, documentId, request);
    }

    @DeleteMapping("/documents/{documentId}")
    public ResponseEntity<Void> delete(Actor actor, @PathVariable UUID documentId) {
        documentService.delete(actor, documentId);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/documents/{documentId}/restore")
    public DocumentResponse restore(Actor actor, @PathVariable UUID documentId) {
        return documentService.restore(actor, documentId);
    }

    @GetMapping("/documents/{documentId}/versions")
    public List<DocumentVersionResponse> versions(Actor actor, @PathVariable UUID documentId) {
        return documentService.listVersions(actor, documentId);
    }

    @PostMapping(value = "/documents/{documentId}/versions", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<DocumentResponse> uploadVersion(Actor actor, @PathVariable UUID documentId,
                                                          @RequestPart("file") MultipartFile file,
                                                          @RequestParam(required = false) Integer expectedVersion) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(documentService.uploadVersion(actor, documentId, expectedVersion, uploaded(file)));
    }

    @GetMapping("/documents/{documentId}/download")
    public ResponseEntity<InputStreamResource> download(Actor actor, @PathVariable UUID documentId,
                                                        @RequestParam(required = false) Integer version) {
        DocumentContent content = documentService.download(actor, documentId, version);
        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(content.contentType()))
                .contentLength(content.size())
                .header(HttpHeaders.CONTENT_DISPOSITION,
                        ContentDisposition.attachment().filename(content.fileName(), StandardCharsets.UTF_8).build().toString())
                .eTag("\"" + content.checksumSha256() + "\"")
                .header("X-Document-Version", String.valueOf(content.version()))
                .body(new InputStreamResource(content.content()));
    }

    @GetMapping("/documents/{documentId}/download-url")
    public DocumentDownloadUrlResponse downloadUrl(Actor actor, @PathVariable UUID documentId,
                                                   @RequestParam(required = false) Integer version) {
        return documentService.downloadUrl(actor, documentId, version);
    }

    private static UploadedFile uploaded(MultipartFile file) {
        return new UploadedFile(file.getOriginalFilename(), file::getInputStream);
    }
}
