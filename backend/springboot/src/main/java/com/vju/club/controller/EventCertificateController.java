package com.vju.club.controller;

import com.vju.club.annotation.PublicEndpoint;
import com.vju.club.common.ApiPaths;
import com.vju.club.dto.CertificateDtos.CertificateListResponse;
import com.vju.club.dto.CertificateDtos.CertificateManagementResponse;
import com.vju.club.dto.CertificateDtos.CertificateTemplateResponse;
import com.vju.club.dto.CertificateDtos.EventCertificateResponse;
import com.vju.club.dto.CertificateDtos.IssueCertificatesResponse;
import com.vju.club.dto.CertificateDtos.PublicCertificateVerificationResponse;
import com.vju.club.dto.CertificateDtos.RemindCertificatesRequest;
import com.vju.club.dto.CertificateDtos.RemindCertificatesResponse;
import com.vju.club.dto.CertificateDtos.RevokeCertificateRequest;
import com.vju.club.dto.record.ClubMediaContent;
import com.vju.club.dto.record.UploadedFile;
import com.vju.club.security.Actor;
import com.vju.club.service.EventCertificateService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Size;
import lombok.RequiredArgsConstructor;
import org.springframework.core.io.InputStreamResource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.util.UUID;

@RestController
@RequestMapping(ApiPaths.API_V1)
@RequiredArgsConstructor
@Tag(name = "Event Certificates", description = "Phát hành, thu hồi, xác nhận, nhắc nhận, phôi mẫu và quản trị thống kê giấy chứng nhận điện tử")
public class EventCertificateController {
    private final EventCertificateService certificateService;

    @PostMapping(ApiPaths.EVENT_CERTIFICATES_ISSUE)
    @Operation(summary = "Phát hành chứng nhận điện tử cho người đã điểm danh (yêu cầu đã chốt sổ SHA-256)")
    public IssueCertificatesResponse issueForEvent(Actor actor, @PathVariable UUID eventId) {
        return certificateService.issueForEvent(actor, eventId);
    }

    @GetMapping(ApiPaths.EVENT_CERTIFICATES)
    @Operation(summary = "Danh sách chứng nhận điện tử đã phát hành của sự kiện")
    public CertificateListResponse listForEvent(Actor actor, @PathVariable UUID eventId) {
        return certificateService.listForEvent(actor, eventId);
    }

    @PostMapping(ApiPaths.CERTIFICATE_REVOKE)
    @Operation(summary = "Thu hồi chứng nhận điện tử kèm lý do và ghi audit log")
    public EventCertificateResponse revoke(Actor actor,
                                           @PathVariable UUID certificateId,
                                           @Valid @RequestBody RevokeCertificateRequest request) {
        return certificateService.revoke(actor, certificateId, request);
    }

    @GetMapping(ApiPaths.MY_CERTIFICATES)
    @Operation(summary = "Danh sách chứng nhận điện tử của tài khoản đang đăng nhập")
    public CertificateListResponse listMine(Actor actor) {
        return certificateService.listMine(actor);
    }

    @PostMapping(ApiPaths.MY_CERTIFICATE_ACKNOWLEDGE)
    @Operation(summary = "Người nhận xác nhận đã nhận giấy chứng nhận điện tử")
    public EventCertificateResponse acknowledgeMine(Actor actor, @PathVariable UUID certificateId) {
        return certificateService.acknowledgeMine(actor, certificateId);
    }

    @PostMapping(ApiPaths.EVENT_CERTIFICATES_REMIND)
    @Operation(summary = "Gửi thông báo & email nhắc xác nhận chứng nhận cho người chưa xác nhận")
    public RemindCertificatesResponse remindForEvent(Actor actor,
                                                     @PathVariable UUID eventId,
                                                     @Valid @RequestBody(required = false) RemindCertificatesRequest request) {
        return certificateService.remindForEvent(actor, eventId, request);
    }

    @PostMapping(value = ApiPaths.EVENT_CERTIFICATE_TEMPLATE, consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @Operation(summary = "Tải lên phôi ảnh chứng nhận riêng cho sự kiện (PNG/JPG/WEBP)")
    public CertificateTemplateResponse uploadTemplate(Actor actor,
                                                      @PathVariable UUID eventId,
                                                      @RequestPart("file") MultipartFile file) {
        return certificateService.uploadTemplate(actor, eventId,
                new UploadedFile(file.getOriginalFilename(), file::getInputStream));
    }

    @DeleteMapping(ApiPaths.EVENT_CERTIFICATE_TEMPLATE)
    @Operation(summary = "Xoá phôi ảnh chứng nhận riêng của sự kiện, quay về mẫu mặc định")
    public CertificateTemplateResponse deleteTemplate(Actor actor, @PathVariable UUID eventId) {
        return certificateService.deleteTemplate(actor, eventId);
    }

    @GetMapping(ApiPaths.CERTIFICATES_MANAGEMENT)
    @Operation(summary = "Thống kê tổng hợp và danh sách quản trị chứng nhận điện tử theo CLB/học kỳ")
    public CertificateManagementResponse listManagement(
            Actor actor,
            @RequestParam(required = false) UUID clubId,
            @RequestParam(required = false) @Size(max = 16) String academicTerm,
            @RequestParam(required = false) @Size(max = 24) String status,
            @RequestParam(required = false) Boolean acknowledged,
            @RequestParam(required = false) @Size(max = 120) String search,
            @RequestParam(defaultValue = "0") @Min(0) int offset,
            @RequestParam(defaultValue = "50") @Min(1) @Max(200) int limit) {
        return certificateService.listManagement(actor, clubId, academicTerm, status, acknowledged, search, offset, limit);
    }

    @PublicEndpoint(reason = "Public e-certificate authenticity verification")
    @GetMapping(ApiPaths.PUBLIC_CERTIFICATE_VERIFY)
    @Operation(summary = "Xác thực công khai mã chứng nhận điện tử (không cần đăng nhập)")
    public PublicCertificateVerificationResponse verifyPublic(@PathVariable @Size(max = 64) String certificateCode) {
        return certificateService.verifyPublic(certificateCode);
    }

    @PublicEndpoint(reason = "Custom club/youth-union certificate template image; file names are unguessable")
    @GetMapping(ApiPaths.PUBLIC_CERTIFICATE_TEMPLATE)
    @Operation(summary = "Tải công khai ảnh phôi chứng nhận điện tử của sự kiện")
    public ResponseEntity<InputStreamResource> openTemplate(@PathVariable @Size(max = 128) String fileName) {
        ClubMediaContent media = certificateService.openTemplate(fileName);
        ResponseEntity.BodyBuilder builder = ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(media.contentType()))
                .header(HttpHeaders.CACHE_CONTROL, "public, max-age=31536000, immutable")
                .header("X-Content-Type-Options", "nosniff")
                .header("Content-Security-Policy", "default-src 'none'; img-src 'self' data: blob:; style-src 'unsafe-inline'");
        if (media.sizeBytes() != null && media.sizeBytes() > 0) {
            builder.contentLength(media.sizeBytes());
        }
        return builder.body(new InputStreamResource(media.content()));
    }
}
