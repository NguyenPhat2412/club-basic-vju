package com.vju.club.service;

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

import java.util.List;
import java.util.UUID;

public interface DocumentService {
    record DocumentMeta(String fileName, String contentType, long sizeBytes, String checksumSha256, int version, String path) { }

    PageResponse<DocumentResponse> listSystem(Actor actor, String name, String appDetailKey,
                                              DocumentVisibility visibility, boolean deleted, int offset, int limit);

    DocumentResponse uploadSystem(Actor actor, String name, String appDetailKey,
                                  DocumentVisibility visibility, UploadedFile file);

    default PageResponse<DocumentResponse> list(Actor actor, UUID clubId, String name, String appDetailKey,
                                                boolean deleted, int offset, int limit) {
        return list(actor, clubId, null, null, name, appDetailKey, deleted, offset, limit);
    }

    PageResponse<DocumentResponse> list(Actor actor, UUID clubId, UUID departmentId, DocumentVisibility visibility,
                                        String name, String appDetailKey, boolean deleted, int offset, int limit);

    DocumentCountResponse getDocCount(Actor actor, UUID clubId, String appDetailKey, boolean deleted);

    DocumentNamesResponse getDocumentNames(Actor actor, UUID clubId, boolean deleted);

    DocumentResponse get(Actor actor, UUID documentId);

    List<DocumentVersionResponse> listVersions(Actor actor, UUID documentId);

    default DocumentResponse upload(Actor actor, UUID clubId, String name, String appDetailKey, UploadedFile file) {
        return upload(actor, clubId, null, null, name, appDetailKey, file);
    }

    DocumentResponse upload(Actor actor, UUID clubId, UUID departmentId, DocumentVisibility visibility,
                            String name, String appDetailKey, UploadedFile file);

    DocumentResponse uploadVersion(Actor actor, UUID documentId, Integer expectedVersion, UploadedFile file);

    DocumentResponse update(Actor actor, UUID documentId, DocumentPatchRequest request);

    void delete(Actor actor, UUID documentId);

    DocumentResponse restore(Actor actor, UUID documentId);

    default DocumentContent download(Actor actor, UUID documentId, Integer version) {
        return openContent(resolveMetadata(actor, documentId, version, false));
    }

    default DocumentContent preview(Actor actor, UUID documentId, Integer version) {
        return openContent(resolveMetadata(actor, documentId, version, true));
    }

    DocumentMeta resolveMetadata(Actor actor, UUID documentId, Integer version, boolean requirePreviewable);

    DocumentContent openContent(DocumentMeta meta);

    DocumentDownloadUrlResponse downloadUrl(Actor actor, UUID documentId, Integer version);
}
