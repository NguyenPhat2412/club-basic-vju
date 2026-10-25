package com.vju.club.modules.document.service;

import com.vju.club.common.dto.PageResponse;
import com.vju.club.modules.document.dto.request.DocumentPatchRequest;
import com.vju.club.modules.document.dto.response.DocumentCountResponse;
import com.vju.club.modules.document.dto.response.DocumentDownloadUrlResponse;
import com.vju.club.modules.document.dto.response.DocumentNamesResponse;
import com.vju.club.modules.document.dto.response.DocumentResponse;
import com.vju.club.modules.document.dto.response.DocumentVersionResponse;
import com.vju.club.security.Actor;

import java.util.List;
import java.util.UUID;

public interface DocumentService {
    PageResponse<DocumentResponse> list(Actor actor, UUID clubId, String name, String appDetailKey, boolean deleted,
                                        int offset, int limit);

    DocumentCountResponse getDocCount(Actor actor, UUID clubId, String appDetailKey, boolean deleted);

    DocumentNamesResponse getDocumentNames(Actor actor, UUID clubId, boolean deleted);

    DocumentResponse get(Actor actor, UUID documentId);

    List<DocumentVersionResponse> listVersions(Actor actor, UUID documentId);

    DocumentResponse upload(Actor actor, UUID clubId, String name, String appDetailKey, UploadedFile file);

    DocumentResponse uploadVersion(Actor actor, UUID documentId, Integer expectedVersion, UploadedFile file);

    DocumentResponse update(Actor actor, UUID documentId, DocumentPatchRequest request);

    void delete(Actor actor, UUID documentId);

    DocumentResponse restore(Actor actor, UUID documentId);

    DocumentContent download(Actor actor, UUID documentId, Integer version);

    DocumentDownloadUrlResponse downloadUrl(Actor actor, UUID documentId, Integer version);
}
