package com.vju.club.service;

import com.vju.club.dto.CertificateDtos.CertificateShareLinkListResponse;
import com.vju.club.dto.CertificateDtos.CertificateShareLinkResponse;
import com.vju.club.dto.CertificateDtos.CreateCertificateShareLinkRequest;
import com.vju.club.dto.CertificateDtos.PublicCertificateProofResponse;
import com.vju.club.security.Actor;

import java.util.UUID;

public interface CertificateShareLinkService {
    CertificateShareLinkListResponse listMine(Actor actor);

    CertificateShareLinkResponse create(Actor actor, CreateCertificateShareLinkRequest request);

    void revoke(Actor actor, UUID linkId);

    PublicCertificateProofResponse resolvePublicProof(String token);
}
