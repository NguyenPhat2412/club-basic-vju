package com.vju.club.controller;

import com.vju.club.common.ApiPaths;
import com.vju.club.common.DocumentConstants;
import com.vju.club.dto.record.DocumentContent;
import com.vju.club.dto.record.UploadedFile;
import com.vju.club.dto.request.DocumentPatchRequest;
import com.vju.club.dto.response.DocumentCountResponse;
import com.vju.club.dto.response.DocumentDownloadUrlResponse;
import com.vju.club.dto.response.DocumentNamesResponse;
import com.vju.club.dto.response.DocumentResponse;
import com.vju.club.dto.response.DocumentVersionResponse;
import com.vju.club.dto.response.PageResponse;
import com.vju.club.enums.DocumentVisibility;
import com.vju.club.security.Actor;
import com.vju.club.service.DocumentService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Size;
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
import org.springframework.web.context.request.WebRequest;
import org.springframework.web.multipart.MultipartFile;

import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping(ApiPaths.API_V1)
@RequiredArgsConstructor
@Tag(name = "Documents", description = "Kho lưu trữ tập trung (Google Drive Vault / Cloudflare R2 / Local) phân quyền 3 tầng: Hệ thống, CLB, Ban chuyên môn.")
public class DocumentController {
    private final DocumentService documentService;

    @GetMapping(ApiPaths.SYSTEM_DOCUMENTS)
    @Operation(summary = "Danh sách văn bản & biểu mẫu chung cấp Hệ thống")
    public PageResponse<DocumentResponse> listSystem(
            Actor actor,
            @RequestParam(required = false) @Size(max = DocumentConstants.MAX_NAME_LENGTH) String name,
            @RequestParam(required = false) @Size(max = DocumentConstants.MAX_APP_DETAIL_KEY_LENGTH) String appDetailKey,
            @RequestParam(required = false) DocumentVisibility visibility,
            @RequestParam(defaultValue = "false") boolean deleted,
            @RequestParam(defaultValue = "0") @Min(0) int offset,
            @RequestParam(defaultValue = "20") @Min(1) @Max(100) int limit) {
        return documentService.listSystem(actor, name, appDetailKey, visibility, deleted, offset, limit);
    }

    @PostMapping(value = ApiPaths.SYSTEM_DOCUMENTS, consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @Operation(summary = "Tải lên văn bản / biểu mẫu cấp Hệ thống (quyền GLOBAL document.upload)")
    public ResponseEntity<DocumentResponse> uploadSystem(
            Actor actor,
            @RequestPart("file") MultipartFile file,
            @RequestParam(required = false) @Size(max = DocumentConstants.MAX_NAME_LENGTH) String name,
            @RequestParam(required = false) @Size(max = DocumentConstants.MAX_APP_DETAIL_KEY_LENGTH) String appDetailKey,
            @RequestParam(required = false) DocumentVisibility visibility) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(documentService.uploadSystem(actor, name, appDetailKey, visibility, uploaded(file)));
    }

    @GetMapping(ApiPaths.CLUB_DOCUMENTS)
    @Operation(summary = "Danh sách tài liệu của CLB hoặc Ban chuyên môn")
    public PageResponse<DocumentResponse> list(
            Actor actor,
            @PathVariable UUID clubId,
            @RequestParam(required = false) UUID departmentId,
            @RequestParam(required = false) DocumentVisibility visibility,
            @RequestParam(required = false) @Size(max = DocumentConstants.MAX_NAME_LENGTH) String name,
            @RequestParam(required = false) @Size(max = DocumentConstants.MAX_APP_DETAIL_KEY_LENGTH) String appDetailKey,
            @RequestParam(defaultValue = "false") boolean deleted,
            @RequestParam(defaultValue = "0") @Min(0) int offset,
            @RequestParam(defaultValue = "20") @Min(1) @Max(100) int limit) {
        return documentService.list(actor, clubId, departmentId, visibility, name, appDetailKey, deleted, offset, limit);
    }

    @GetMapping(ApiPaths.CLUB_DOCUMENTS_COUNT)
    @Operation(summary = "Đếm tài liệu của CLB")
    public DocumentCountResponse count(
            Actor actor,
            @PathVariable UUID clubId,
            @RequestParam(required = false) @Size(max = DocumentConstants.MAX_APP_DETAIL_KEY_LENGTH) String appDetailKey,
            @RequestParam(defaultValue = "false") boolean deleted) {
        return documentService.getDocCount(actor, clubId, appDetailKey, deleted);
    }

    @GetMapping(ApiPaths.CLUB_DOCUMENTS_NAMES)
    @Operation(summary = "Danh sách tên tài liệu của CLB")
    public DocumentNamesResponse names(
            Actor actor,
            @PathVariable UUID clubId,
            @RequestParam(defaultValue = "false") boolean deleted) {
        return documentService.getDocumentNames(actor, clubId, deleted);
    }

    @PostMapping(value = ApiPaths.CLUB_DOCUMENTS, consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @Operation(summary = "Upload tài liệu mới vào kho CLB hoặc kho Ban chuyên môn")
    public ResponseEntity<DocumentResponse> upload(
            Actor actor,
            @PathVariable UUID clubId,
            @RequestPart("file") MultipartFile file,
            @RequestParam(required = false) UUID departmentId,
            @RequestParam(required = false) DocumentVisibility visibility,
            @RequestParam(required = false) @Size(max = DocumentConstants.MAX_NAME_LENGTH) String name,
            @RequestParam(required = false) @Size(max = DocumentConstants.MAX_APP_DETAIL_KEY_LENGTH) String appDetailKey) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(documentService.upload(actor, clubId, departmentId, visibility, name, appDetailKey, uploaded(file)));
    }

    @GetMapping(ApiPaths.DOCUMENT_BY_ID)
    @Operation(summary = "Chi tiết tài liệu")
    public DocumentResponse get(Actor actor, @PathVariable UUID documentId) {
        return documentService.get(actor, documentId);
    }

    @PatchMapping(ApiPaths.DOCUMENT_BY_ID)
    @Operation(summary = "Cập nhật tên, appDetailKey hoặc mức hiển thị tài liệu")
    public DocumentResponse update(Actor actor, @PathVariable UUID documentId,
                                   @Valid @RequestBody DocumentPatchRequest request) {
        return documentService.update(actor, documentId, request);
    }

    @DeleteMapping(ApiPaths.DOCUMENT_BY_ID)
    @Operation(summary = "Xoá mềm tài liệu (file vẫn an toàn trong kho lưu trữ tập trung)")
    public ResponseEntity<Void> delete(Actor actor, @PathVariable UUID documentId) {
        documentService.delete(actor, documentId);
        return ResponseEntity.noContent().build();
    }

    @PostMapping(ApiPaths.DOCUMENT_RESTORE)
    @Operation(summary = "Khôi phục tài liệu từ thùng rác")
    public DocumentResponse restore(Actor actor, @PathVariable UUID documentId) {
        return documentService.restore(actor, documentId);
    }

    @GetMapping(ApiPaths.DOCUMENT_VERSIONS)
    @Operation(summary = "Lịch sử phiên bản bất biến")
    public List<DocumentVersionResponse> versions(Actor actor, @PathVariable UUID documentId) {
        return documentService.listVersions(actor, documentId);
    }

    @PostMapping(value = ApiPaths.DOCUMENT_VERSIONS, consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @Operation(summary = "Upload phiên bản mới (version + 1)")
    public ResponseEntity<DocumentResponse> uploadVersion(
            Actor actor,
            @PathVariable UUID documentId,
            @RequestPart("file") MultipartFile file,
            @RequestParam(required = false) @Min(1) Integer expectedVersion) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(documentService.uploadVersion(actor, documentId, expectedVersion, uploaded(file)));
    }

    @GetMapping(ApiPaths.DOCUMENT_DOWNLOAD)
    @Operation(summary = "Tải file qua cổng bảo mật Backend (hỗ trợ ETag / 304 Not Modified)")
    public ResponseEntity<InputStreamResource> download(
            Actor actor,
            @PathVariable UUID documentId,
            @RequestParam(required = false) @Min(1) Integer version,
            WebRequest webRequest) {
        DocumentService.DocumentMeta meta = documentService.resolveMetadata(actor, documentId, version, false);
        if (webRequest.checkNotModified(meta.checksumSha256())) {
            return notModifiedResponse(meta);
        }
        DocumentContent content = documentService.openContent(meta);
        return streamResponse(content, ContentDisposition.attachment().filename(content.fileName(), StandardCharsets.UTF_8).build());
    }

    @GetMapping(ApiPaths.DOCUMENT_PREVIEW)
    @Operation(summary = "Xem trước trực tuyến PDF / Ảnh / Văn bản qua Backend Proxy (hỗ trợ ETag / 304, không lộ link Google Drive)")
    public ResponseEntity<InputStreamResource> preview(
            Actor actor,
            @PathVariable UUID documentId,
            @RequestParam(required = false) @Min(1) Integer version,
            WebRequest webRequest) {
        DocumentService.DocumentMeta meta = documentService.resolveMetadata(actor, documentId, version, true);
        if (webRequest.checkNotModified(meta.checksumSha256())) {
            return notModifiedResponse(meta);
        }
        DocumentContent content = documentService.openContent(meta);
        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(content.contentType()))
                .contentLength(content.size())
                .header(HttpHeaders.CONTENT_DISPOSITION,
                        ContentDisposition.inline().filename(content.fileName(), StandardCharsets.UTF_8).build().toString())
                .header(HttpHeaders.CACHE_CONTROL, "private, max-age=3600, must-revalidate")
                .header("X-Content-Type-Options", "nosniff")
                .header("Content-Security-Policy", "default-src 'none'; img-src 'self' data: blob:; media-src 'self'; style-src 'unsafe-inline'")
                .eTag("\"" + content.checksumSha256() + "\"")
                .header("X-Document-Version", String.valueOf(content.version()))
                .body(new InputStreamResource(content.content()));
    }

    @GetMapping(ApiPaths.DOCUMENT_DOWNLOAD_URL)
    @Operation(summary = "Lấy link tải file")
    public DocumentDownloadUrlResponse downloadUrl(
            Actor actor,
            @PathVariable UUID documentId,
            @RequestParam(required = false) @Min(1) Integer version) {
        return documentService.downloadUrl(actor, documentId, version);
    }

    private static ResponseEntity<InputStreamResource> notModifiedResponse(DocumentService.DocumentMeta meta) {
        return ResponseEntity.status(HttpStatus.NOT_MODIFIED)
                .header(HttpHeaders.CACHE_CONTROL, "private, max-age=3600, must-revalidate")
                .eTag("\"" + meta.checksumSha256() + "\"")
                .header("X-Document-Version", String.valueOf(meta.version()))
                .build();
    }

    private static ResponseEntity<InputStreamResource> streamResponse(DocumentContent content, ContentDisposition disposition) {
        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(content.contentType()))
                .contentLength(content.size())
                .header(HttpHeaders.CONTENT_DISPOSITION, disposition.toString())
                .header(HttpHeaders.CACHE_CONTROL, "private, max-age=3600, must-revalidate")
                .header("X-Content-Type-Options", "nosniff")
                .eTag("\"" + content.checksumSha256() + "\"")
                .header("X-Document-Version", String.valueOf(content.version()))
                .body(new InputStreamResource(content.content()));
    }

    private static UploadedFile uploaded(MultipartFile file) {
        return new UploadedFile(file.getOriginalFilename(), file::getInputStream);
    }
}
