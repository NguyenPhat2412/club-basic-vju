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
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
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
@Tag(name = "Documents", description = "Tài liệu CLB lưu trên Cloudflare R2 (hoặc thư mục local khi phát triển): upload, phiên bản, xoá mềm, khôi phục, tải file. "
        + "Mọi lỗi trả về application/problem+json có trường code.")
public class DocumentController {
    private final DocumentService documentService;

    @GetMapping("/clubs/{clubId}/documents")
    @Operation(summary = "Danh sách tài liệu của CLB",
            description = "Quyền: document.view trong CLB (xem thùng rác deleted=true cần thêm document.restore). "
                    + "Sắp xếp: mới tạo trước; với deleted=true thì mới xoá trước.")
    @ApiResponse(responseCode = "200", description = "Trang kết quả {items, total, offset, limit}")
    @ApiResponse(responseCode = "400", description = "INVALID_APP_DETAIL_KEY, VALIDATION_ERROR (offset/limit)")
    @ApiResponse(responseCode = "403", description = "PERMISSION_DENIED")
    @ApiResponse(responseCode = "404", description = "CLUB_NOT_FOUND")
    public PageResponse<DocumentResponse> list(Actor actor, @PathVariable UUID clubId,
                                               @Parameter(description = "Tên chứa chuỗi này (không phân biệt hoa thường; % và _ hiểu theo nghĩa đen)")
                                               @RequestParam(required = false) String name,
                                               @Parameter(description = "Lọc theo phần ứng dụng, ví dụ club.rules")
                                               @RequestParam(required = false) String appDetailKey,
                                               @Parameter(description = "true = thùng rác (tài liệu đã xoá mềm)")
                                               @RequestParam(defaultValue = "false") boolean deleted,
                                               @RequestParam(defaultValue = "0") @Min(0) int offset,
                                               @RequestParam(defaultValue = "20") @Min(1) @Max(100) int limit) {
        return documentService.list(actor, clubId, name, appDetailKey, deleted, offset, limit);
    }

    @GetMapping("/clubs/{clubId}/documents/count")
    @Operation(summary = "Đếm tài liệu (getDocCount)", description = "Quyền: document.view (deleted=true cần thêm document.restore).")
    @ApiResponse(responseCode = "200", description = "{clubId, deleted, count}")
    @ApiResponse(responseCode = "403", description = "PERMISSION_DENIED")
    @ApiResponse(responseCode = "404", description = "CLUB_NOT_FOUND")
    public DocumentCountResponse count(Actor actor, @PathVariable UUID clubId,
                                       @Parameter(description = "Chỉ đếm tài liệu có appDetailKey này")
                                       @RequestParam(required = false) String appDetailKey,
                                       @RequestParam(defaultValue = "false") boolean deleted) {
        return documentService.getDocCount(actor, clubId, appDetailKey, deleted);
    }

    @GetMapping("/clubs/{clubId}/documents/names")
    @Operation(summary = "Danh sách tên tài liệu (getDocumentNames)", description = "Tên sắp xếp A–Z. Quyền: document.view.")
    @ApiResponse(responseCode = "200", description = "{clubId, deleted, names[]}")
    @ApiResponse(responseCode = "403", description = "PERMISSION_DENIED")
    @ApiResponse(responseCode = "404", description = "CLUB_NOT_FOUND")
    public DocumentNamesResponse names(Actor actor, @PathVariable UUID clubId,
                                       @RequestParam(defaultValue = "false") boolean deleted) {
        return documentService.getDocumentNames(actor, clubId, deleted);
    }

    @PostMapping(value = "/clubs/{clubId}/documents", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @Operation(summary = "Upload tài liệu mới (version 1)",
            description = "Quyền: document.upload trong CLB; CLB phải ACTIVE. "
                    + "Cho phép: pdf, doc(x), xls(x), ppt(x), txt, csv, md, png, jpg/jpeg, gif, webp, zip; tối đa 20 MB. "
                    + "Content-Type được suy ra từ đuôi file và byte đầu file phải khớp với đuôi.")
    @ApiResponse(responseCode = "201", description = "Tài liệu đã tạo")
    @ApiResponse(responseCode = "400", description = "INVALID_DOCUMENT_NAME (../, /, CON.pdf, .hidden, không đuôi, ký tự <>:\"|?*, > 255 byte), "
            + "SUSPICIOUS_DOCUMENT_NAME (invoice.exe.pdf, ký tự U+202E/vô hình, đệm dấu cách), DOCUMENT_CONTENT_MISMATCH, EMPTY_DOCUMENT, "
            + "INVALID_APP_DETAIL_KEY, VALIDATION_ERROR (thiếu file)")
    @ApiResponse(responseCode = "403", description = "PERMISSION_DENIED")
    @ApiResponse(responseCode = "404", description = "CLUB_NOT_FOUND")
    @ApiResponse(responseCode = "409", description = "DOCUMENT_NAME_ALREADY_EXISTS (trùng tên tài liệu chưa xoá, không phân biệt hoa thường), CLUB_INACTIVE")
    @ApiResponse(responseCode = "413", description = "DOCUMENT_TOO_LARGE")
    @ApiResponse(responseCode = "415", description = "UNSUPPORTED_DOCUMENT_TYPE")
    @ApiResponse(responseCode = "502", description = "DOCUMENT_STORAGE_ERROR (R2 lỗi)")
    public ResponseEntity<DocumentResponse> upload(Actor actor, @PathVariable UUID clubId,
                                                   @Parameter(description = "File cần upload")
                                                   @RequestPart("file") MultipartFile file,
                                                   @Parameter(description = "Tên hiển thị; bỏ trống thì dùng tên file gửi lên")
                                                   @RequestParam(required = false) String name,
                                                   @Parameter(description = "Phần ứng dụng chứa file, chữ thường nối bằng dấu chấm, ví dụ club.rules")
                                                   @RequestParam(required = false) String appDetailKey) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(documentService.upload(actor, clubId, name, appDetailKey, uploaded(file)));
    }

    @GetMapping("/documents/{documentId}")
    @Operation(summary = "Chi tiết tài liệu",
            description = "Quyền: document.view. Tài liệu đã xoá chỉ hiện với người có document.restore, người khác nhận 404.")
    @ApiResponse(responseCode = "200", description = "Tài liệu")
    @ApiResponse(responseCode = "403", description = "PERMISSION_DENIED (kể cả id không tồn tại, để không dò được id)")
    @ApiResponse(responseCode = "404", description = "DOCUMENT_NOT_FOUND")
    public DocumentResponse get(Actor actor, @PathVariable UUID documentId) {
        return documentService.get(actor, documentId);
    }

    @PatchMapping("/documents/{documentId}")
    @Operation(summary = "Đổi tên / appDetailKey",
            description = "Quyền: chủ sở hữu hoặc document.update. Trường bỏ qua giữ nguyên; appDetailKey = \"\" để xoá. Tên mới phải giữ đuôi file.")
    @ApiResponse(responseCode = "200", description = "Tài liệu sau khi sửa")
    @ApiResponse(responseCode = "400", description = "INVALID_DOCUMENT_NAME, SUSPICIOUS_DOCUMENT_NAME, DOCUMENT_TYPE_CHANGED, INVALID_APP_DETAIL_KEY")
    @ApiResponse(responseCode = "403", description = "PERMISSION_DENIED")
    @ApiResponse(responseCode = "409", description = "DOCUMENT_NAME_ALREADY_EXISTS")
    @ApiResponse(responseCode = "410", description = "DOCUMENT_DELETED")
    public DocumentResponse update(Actor actor, @PathVariable UUID documentId,
                                   @Valid @RequestBody DocumentPatchRequest request) {
        return documentService.update(actor, documentId, request);
    }

    @DeleteMapping("/documents/{documentId}")
    @Operation(summary = "Xoá mềm",
            description = "Quyền: chủ sở hữu hoặc document.delete. Đánh dấu deleted, ghi deletedAt/deletedBy; file vẫn nằm trên R2 để khôi phục.")
    @ApiResponse(responseCode = "204", description = "Đã xoá mềm")
    @ApiResponse(responseCode = "403", description = "PERMISSION_DENIED")
    @ApiResponse(responseCode = "410", description = "DOCUMENT_DELETED (đã xoá trước đó)")
    public ResponseEntity<Void> delete(Actor actor, @PathVariable UUID documentId) {
        documentService.delete(actor, documentId);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/documents/{documentId}/restore")
    @Operation(summary = "Khôi phục tài liệu đã xoá", description = "Quyền: document.restore.")
    @ApiResponse(responseCode = "200", description = "Tài liệu đã khôi phục")
    @ApiResponse(responseCode = "403", description = "PERMISSION_DENIED")
    @ApiResponse(responseCode = "409", description = "DOCUMENT_NOT_DELETED, DOCUMENT_NAME_ALREADY_EXISTS (tên đã bị tài liệu khác dùng)")
    public DocumentResponse restore(Actor actor, @PathVariable UUID documentId) {
        return documentService.restore(actor, documentId);
    }

    @GetMapping("/documents/{documentId}/versions")
    @Operation(summary = "Lịch sử phiên bản", description = "Mới nhất trước. Quyền: document.view.")
    @ApiResponse(responseCode = "200", description = "Danh sách phiên bản")
    @ApiResponse(responseCode = "403", description = "PERMISSION_DENIED")
    public List<DocumentVersionResponse> versions(Actor actor, @PathVariable UUID documentId) {
        return documentService.listVersions(actor, documentId);
    }

    @PostMapping(value = "/documents/{documentId}/versions", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @Operation(summary = "Upload phiên bản mới",
            description = "Quyền: document.upload. File mới phải cùng loại (cùng đuôi) và khác nội dung phiên bản hiện tại.")
    @ApiResponse(responseCode = "201", description = "Tài liệu với version tăng thêm 1")
    @ApiResponse(responseCode = "400", description = "DOCUMENT_TYPE_CHANGED, DOCUMENT_CONTENT_MISMATCH, EMPTY_DOCUMENT, INVALID/SUSPICIOUS_DOCUMENT_NAME")
    @ApiResponse(responseCode = "409", description = "DOCUMENT_VERSION_CONFLICT (expectedVersion cũ), DOCUMENT_VERSION_UNCHANGED (nội dung trùng)")
    @ApiResponse(responseCode = "410", description = "DOCUMENT_DELETED")
    public ResponseEntity<DocumentResponse> uploadVersion(Actor actor, @PathVariable UUID documentId,
                                                          @RequestPart("file") MultipartFile file,
                                                          @Parameter(description = "Phiên bản bạn đang dựa vào; khác phiên bản hiện tại thì trả 409")
                                                          @RequestParam(required = false) Integer expectedVersion) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(documentService.uploadVersion(actor, documentId, expectedVersion, uploaded(file)));
    }

    @GetMapping("/documents/{documentId}/download")
    @Operation(summary = "Tải file qua backend",
            description = "Quyền: document.view. Trả nội dung file kèm Content-Disposition (tên UTF-8), ETag = SHA-256, X-Document-Version. "
                    + "Trong Swagger bấm \"Download file\" ở phần response.")
    @ApiResponse(responseCode = "200", description = "Nội dung file")
    @ApiResponse(responseCode = "400", description = "INVALID_DOCUMENT_VERSION (version < 1)")
    @ApiResponse(responseCode = "404", description = "DOCUMENT_VERSION_NOT_FOUND")
    @ApiResponse(responseCode = "410", description = "DOCUMENT_DELETED")
    @ApiResponse(responseCode = "502", description = "DOCUMENT_STORAGE_ERROR")
    public ResponseEntity<InputStreamResource> download(Actor actor, @PathVariable UUID documentId,
                                                        @Parameter(description = "Bỏ trống = phiên bản hiện tại")
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
    @Operation(summary = "Link tải trực tiếp từ R2 (presigned)",
            description = "Quyền: document.view. Với R2: link ký sẵn, hết hạn sau 5 phút, mở thẳng trên trình duyệt. "
                    + "Với storage local: trả đường dẫn /download của API và expiresAt = null.")
    @ApiResponse(responseCode = "200", description = "{url, version, expiresAt}")
    @ApiResponse(responseCode = "404", description = "DOCUMENT_VERSION_NOT_FOUND")
    @ApiResponse(responseCode = "410", description = "DOCUMENT_DELETED")
    public DocumentDownloadUrlResponse downloadUrl(Actor actor, @PathVariable UUID documentId,
                                                   @Parameter(description = "Bỏ trống = phiên bản hiện tại")
                                                   @RequestParam(required = false) Integer version) {
        return documentService.downloadUrl(actor, documentId, version);
    }

    private static UploadedFile uploaded(MultipartFile file) {
        return new UploadedFile(file.getOriginalFilename(), file::getInputStream);
    }
}
