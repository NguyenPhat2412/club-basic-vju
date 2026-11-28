package com.vju.club.controller;

import com.vju.club.annotation.PublicEndpoint;
import com.vju.club.common.ApiPaths;
import com.vju.club.dto.CertificateDtos.CertificateShareLinkListResponse;
import com.vju.club.dto.CertificateDtos.CertificateShareLinkResponse;
import com.vju.club.dto.CertificateDtos.CreateCertificateShareLinkRequest;
import com.vju.club.dto.CertificateDtos.PublicCertificateProofResponse;
import com.vju.club.security.Actor;
import com.vju.club.service.CertificateShareLinkService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Size;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

@RestController
@RequestMapping(ApiPaths.API_V1)
@RequiredArgsConstructor
@Tag(name = "Event Certificates", description = "Liên kết chia sẻ hồ sơ minh chứng chứng nhận điện tử theo học kỳ")
public class CertificateShareLinkController {
    private final CertificateShareLinkService shareLinkService;

    @GetMapping(ApiPaths.MY_CERTIFICATE_SHARE_LINKS)
    @Operation(summary = "Danh sách liên kết chia sẻ minh chứng chứng nhận của tài khoản hiện tại")
    public CertificateShareLinkListResponse listMine(Actor actor) {
        return shareLinkService.listMine(actor);
    }

    @PostMapping(ApiPaths.MY_CERTIFICATE_SHARE_LINKS)
    @Operation(summary = "Tạo liên kết chia sẻ hồ sơ minh chứng chứng nhận (có hạn hiệu lực)")
    public ResponseEntity<CertificateShareLinkResponse> create(
            Actor actor,
            @Valid @RequestBody(required = false) CreateCertificateShareLinkRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(shareLinkService.create(actor, request));
    }

    @DeleteMapping(ApiPaths.MY_CERTIFICATE_SHARE_LINK_BY_ID)
    @Operation(summary = "Thu hồi liên kết chia sẻ hồ sơ minh chứng")
    public ResponseEntity<Void> revoke(Actor actor, @PathVariable UUID linkId) {
        shareLinkService.revoke(actor, linkId);
        return ResponseEntity.noContent().build();
    }

    @PublicEndpoint(reason = "Public verifiable student certificate proof link for DRL / Class Vice Monitors")
    @GetMapping(ApiPaths.PUBLIC_CERTIFICATE_PROOF)
    @Operation(summary = "Tra cứu công khai hồ sơ minh chứng chứng nhận điện tử qua mã chia sẻ")
    public PublicCertificateProofResponse resolvePublicProof(@PathVariable @Size(max = 64) String token) {
        return shareLinkService.resolvePublicProof(token);
    }
}
