package com.vju.club.service;

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

import java.util.UUID;

public interface EventCertificateService {
    IssueCertificatesResponse issueForEvent(Actor actor, UUID eventId);

    CertificateListResponse listForEvent(Actor actor, UUID eventId);

    EventCertificateResponse revoke(Actor actor, UUID certificateId, RevokeCertificateRequest request);

    CertificateListResponse listMine(Actor actor);

    PublicCertificateVerificationResponse verifyPublic(String certificateCode);

    CertificateTemplateResponse uploadTemplate(Actor actor, UUID eventId, UploadedFile file);

    CertificateTemplateResponse deleteTemplate(Actor actor, UUID eventId);

    ClubMediaContent openTemplate(String fileName);

    EventCertificateResponse acknowledgeMine(Actor actor, UUID certificateId);

    RemindCertificatesResponse remindForEvent(Actor actor, UUID eventId, RemindCertificatesRequest request);

    CertificateManagementResponse listManagement(Actor actor, UUID clubId, String academicTerm,
                                                 String status, Boolean acknowledged, String search,
                                                 int offset, int limit);
}
