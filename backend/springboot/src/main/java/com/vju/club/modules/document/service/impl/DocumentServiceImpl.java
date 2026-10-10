package com.vju.club.modules.document.service.impl;

import com.vju.club.common.OffsetLimitRequest;
import com.vju.club.common.dto.PageResponse;
import com.vju.club.config.StorageProperties;
import com.vju.club.error.ApiException;
import com.vju.club.modules.audit.enums.AuditAction;
import com.vju.club.modules.audit.service.AuditService;
import com.vju.club.modules.club.entity.Club;
import com.vju.club.modules.club.enums.ClubStatus;
import com.vju.club.modules.club.repository.ClubRepository;
import com.vju.club.modules.document.common.DocumentConstants;
import com.vju.club.modules.document.dto.request.DocumentPatchRequest;
import com.vju.club.modules.document.dto.response.DocumentCountResponse;
import com.vju.club.modules.document.dto.response.DocumentDownloadUrlResponse;
import com.vju.club.modules.document.dto.response.DocumentNamesResponse;
import com.vju.club.modules.document.dto.response.DocumentResponse;
import com.vju.club.modules.document.dto.response.DocumentVersionResponse;
import com.vju.club.modules.document.entity.Document;
import com.vju.club.modules.document.entity.DocumentVersion;
import com.vju.club.modules.document.exception.DocumentDeletedException;
import com.vju.club.modules.document.exception.DocumentException;
import com.vju.club.modules.document.exception.DocumentNameAlreadyExistsException;
import com.vju.club.modules.document.exception.DocumentNotDeletedException;
import com.vju.club.modules.document.exception.DocumentNotFoundException;
import com.vju.club.modules.document.exception.DocumentStorageException;
import com.vju.club.modules.document.exception.DocumentTypeChangedException;
import com.vju.club.modules.document.exception.DocumentVersionConflictException;
import com.vju.club.modules.document.exception.DocumentVersionNotFoundException;
import com.vju.club.modules.document.exception.DocumentVersionUnchangedException;
import com.vju.club.modules.document.exception.InvalidDocumentVersionException;
import com.vju.club.modules.document.mapper.DocumentMapper;
import com.vju.club.modules.document.repository.DocumentRepository;
import com.vju.club.modules.document.repository.DocumentVersionRepository;
import com.vju.club.modules.document.service.DocumentContent;
import com.vju.club.modules.document.service.DocumentFileInspector;
import com.vju.club.modules.document.service.DocumentFileInspector.InspectedFile;
import com.vju.club.modules.document.service.DocumentService;
import com.vju.club.modules.document.service.UploadedFile;
import com.vju.club.modules.document.storage.DocumentStorage;
import com.vju.club.modules.permission.annotation.RequirePermission;
import com.vju.club.modules.user.repository.UserRepository;
import com.vju.club.security.Actor;
import com.vju.club.security.PermissionAuthorizationService;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

import java.io.IOException;
import java.io.InputStream;
import java.time.OffsetDateTime;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.UUID;

import static com.vju.club.modules.document.specification.DocumentSpecifications.appDetailKey;
import static com.vju.club.modules.document.specification.DocumentSpecifications.deleted;
import static com.vju.club.modules.document.specification.DocumentSpecifications.inClub;
import static com.vju.club.modules.document.specification.DocumentSpecifications.nameContains;

@Service
@RequiredArgsConstructor
public class DocumentServiceImpl implements DocumentService {
    private static final Logger log = LoggerFactory.getLogger(DocumentServiceImpl.class);

    private final DocumentRepository documentRepository;
    private final DocumentVersionRepository versionRepository;
    private final ClubRepository clubRepository;
    private final UserRepository userRepository;
    private final DocumentStorage storage;
    private final DocumentFileInspector inspector;
    private final StorageProperties storageProperties;
    private final AuditService auditService;
    private final PermissionAuthorizationService authorizationService;
    private final DocumentMapper documentMapper;

    @Override
    @Transactional(readOnly = true)
    @RequirePermission(value = DocumentConstants.PERMISSION_VIEW, clubId = "clubId")
    public PageResponse<DocumentResponse> list(Actor actor, UUID clubId, String name, String appDetailKey,
                                               boolean deleted, int offset, int limit) {
        requireClubListing(actor, clubId, deleted);
        Specification<Document> filter = Specification.allOf(inClub(clubId), deleted(deleted), nameContains(name),
                appDetailKey(inspector.checkAppDetailKey(appDetailKey)));
        Sort order = deleted ? Sort.by(Sort.Order.desc("deletedAt"), Sort.Order.asc("id"))
                : Sort.by(Sort.Order.desc("createdAt"), Sort.Order.asc("id"));
        var page = documentRepository.findAll(filter, new OffsetLimitRequest(offset, limit, order));
        return new PageResponse<>(page.map(documentMapper::toResponse).getContent(), page.getTotalElements(), offset, limit);
    }

    @Override
    @Transactional(readOnly = true)
    @RequirePermission(value = DocumentConstants.PERMISSION_VIEW, clubId = "clubId")
    public DocumentCountResponse getDocCount(Actor actor, UUID clubId, String appDetailKey, boolean deleted) {
        requireClubListing(actor, clubId, deleted);
        long count = documentRepository.count(Specification.allOf(inClub(clubId), deleted(deleted),
                appDetailKey(inspector.checkAppDetailKey(appDetailKey))));
        return new DocumentCountResponse(clubId, deleted, count);
    }

    @Override
    @Transactional(readOnly = true)
    @RequirePermission(value = DocumentConstants.PERMISSION_VIEW, clubId = "clubId")
    public DocumentNamesResponse getDocumentNames(Actor actor, UUID clubId, boolean deleted) {
        requireClubListing(actor, clubId, deleted);
        return new DocumentNamesResponse(clubId, deleted, documentRepository.findNames(clubId, deleted));
    }

    @Override
    @Transactional(readOnly = true)
    public DocumentResponse get(Actor actor, UUID documentId) {
        return documentMapper.toResponse(visible(actor, documentRepository.findById(documentId), documentId));
    }

    @Override
    @Transactional(readOnly = true)
    public List<DocumentVersionResponse> listVersions(Actor actor, UUID documentId) {
        visible(actor, documentRepository.findById(documentId), documentId);
        return versionRepository.findByDocument_IdOrderByVersionDesc(documentId).stream()
                .map(documentMapper::toVersionResponse).toList();
    }

    @Override
    @Transactional(readOnly = true)
    public DocumentContent download(Actor actor, UUID documentId, Integer version) {
        Document document = live(visible(actor, documentRepository.findById(documentId), documentId));
        DocumentVersion file = resolveVersion(document, version);
        DocumentStorage.StoredObject object = storage.open(file.getPath());
        return new DocumentContent(document.getName(), file.getContentType(), object.size(),
                file.getChecksumSha256(), file.getVersion(), object.content());
    }

    @Override
    @Transactional(readOnly = true)
    public DocumentDownloadUrlResponse downloadUrl(Actor actor, UUID documentId, Integer version) {
        Document document = live(visible(actor, documentRepository.findById(documentId), documentId));
        DocumentVersion file = resolveVersion(document, version);
        var ttl = storageProperties.getDownloadUrlTtl();
        return storage.presignDownload(file.getPath(), document.getName(), file.getContentType(), ttl)
                .map(url -> new DocumentDownloadUrlResponse(url.toString(), file.getVersion(), OffsetDateTime.now().plus(ttl)))
                .orElseGet(() -> new DocumentDownloadUrlResponse(
                        "/api/v1/documents/" + documentId + "/download?version=" + file.getVersion(), file.getVersion(), null));
    }

    @Override
    @Transactional
    @RequirePermission(value = DocumentConstants.PERMISSION_UPLOAD, clubId = "clubId")
    public DocumentResponse upload(Actor actor, UUID clubId, String name, String appDetailKey, UploadedFile file) {
        Club club = clubRepository.findById(clubId).orElseThrow(() -> notFound("CLUB_NOT_FOUND", "Club not found"));
        if (club.getStatus() != ClubStatus.ACTIVE) {
            throw new ApiException(HttpStatus.CONFLICT, "CLUB_INACTIVE", "Club is inactive");
        }
        String key = inspector.checkAppDetailKey(appDetailKey);
        InspectedFile inspected = inspector.inspect(name == null || name.isBlank() ? file.originalName() : name,
                file.content());
        if (documentRepository.existsLiveName(clubId, inspected.name(), null)) {
            throw new DocumentNameAlreadyExistsException();
        }
        String path = store(clubId, inspected, file);

        Document document = new Document();
        document.setClub(club);
        document.setOwner(userRepository.getReferenceById(actor.id()));
        document.setName(inspected.name());
        document.setAppDetailKey(key);
        point(document, 1, path, inspected);
        Document saved = documentRepository.saveAndFlush(document);
        versionRepository.saveAndFlush(version(saved, inspected, file.originalName(), actor));
        auditService.record(actor.id(), AuditAction.DOCUMENT_UPLOADED, saved.getId(), clubId, null, snapshot(saved));
        return documentMapper.toResponse(saved);
    }

    @Override
    @Transactional
    public DocumentResponse uploadVersion(Actor actor, UUID documentId, Integer expectedVersion, UploadedFile file) {
        Document document = live(visible(actor, documentRepository.findForUpdate(documentId), documentId));
        authorizationService.require(actor, DocumentConstants.PERMISSION_UPLOAD, clubId(document), null);
        if (expectedVersion != null && expectedVersion != document.getVersion()) {
            throw new DocumentVersionConflictException("Document is at version " + document.getVersion()
                    + ", not " + expectedVersion + "; reload it and try again");
        }
        InspectedFile inspected = inspector.inspect(file.originalName(), file.content());
        if (inspected.type() != inspector.typeOf(document.getName())) {
            throw new DocumentTypeChangedException("Document is a ." + inspector.typeOf(document.getName()).extension()
                    + " file; a new version cannot be ." + inspected.type().extension());
        }
        if (inspected.sha256().equals(document.getChecksumSha256())) {
            throw new DocumentVersionUnchangedException();
        }
        Map<String, Object> before = snapshot(document);
        String path = store(clubId(document), inspected, file);
        point(document, document.getVersion() + 1, path, inspected);
        Document saved = documentRepository.saveAndFlush(document);
        versionRepository.saveAndFlush(version(saved, inspected, file.originalName(), actor));
        auditService.recordChange(actor.id(), AuditAction.DOCUMENT_VERSION_UPLOADED, documentId, clubId(saved),
                before, snapshot(saved));
        return documentMapper.toResponse(saved);
    }

    @Override
    @Transactional
    public DocumentResponse update(Actor actor, UUID documentId, DocumentPatchRequest request) {
        Document document = live(visible(actor, documentRepository.findForUpdate(documentId), documentId));
        requireOwnerOr(actor, document, DocumentConstants.PERMISSION_UPDATE);
        Map<String, Object> before = snapshot(document);
        if (request.name() != null) {
            String name = inspector.checkName(request.name());
            if (inspector.typeOf(name) != inspector.typeOf(document.getName())) {
                throw new DocumentTypeChangedException("Renaming cannot change the file extension");
            }
            if (documentRepository.existsLiveName(clubId(document), name, documentId)) {
                throw new DocumentNameAlreadyExistsException();
            }
            document.setName(name);
        }
        if (request.appDetailKey() != null) document.setAppDetailKey(inspector.checkAppDetailKey(request.appDetailKey()));
        Document saved = documentRepository.saveAndFlush(document);
        auditService.recordChange(actor.id(), AuditAction.DOCUMENT_UPDATED, documentId, clubId(saved), before, snapshot(saved));
        return documentMapper.toResponse(saved);
    }

    @Override
    @Transactional
    public void delete(Actor actor, UUID documentId) {
        Document document = live(visible(actor, documentRepository.findForUpdate(documentId), documentId));
        requireOwnerOr(actor, document, DocumentConstants.PERMISSION_DELETE);
        Map<String, Object> before = snapshot(document);
        document.setDeleted(true);
        document.setDeletedAt(OffsetDateTime.now());
        document.setDeletedBy(actor.id());
        Document saved = documentRepository.saveAndFlush(document);
        auditService.recordChange(actor.id(), AuditAction.DOCUMENT_DELETED, documentId, clubId(saved), before, snapshot(saved));
    }

    @Override
    @Transactional
    public DocumentResponse restore(Actor actor, UUID documentId) {
        Document document = documentRepository.findForUpdate(documentId).orElseThrow(() ->
                authorizationService.missingResource(actor, DocumentConstants.PERMISSION_RESTORE,
                        new DocumentNotFoundException()));
        authorizationService.require(actor, DocumentConstants.PERMISSION_RESTORE, clubId(document), null);
        if (!document.isDeleted()) throw new DocumentNotDeletedException();
        if (documentRepository.existsLiveName(clubId(document), document.getName(), documentId)) {
            throw new DocumentNameAlreadyExistsException(
                    "Another live document is now called " + document.getName() + "; rename it before restoring this one");
        }
        Map<String, Object> before = snapshot(document);
        document.setDeleted(false);
        document.setDeletedAt(null);
        document.setDeletedBy(null);
        Document saved = documentRepository.saveAndFlush(document);
        auditService.recordChange(actor.id(), AuditAction.DOCUMENT_RESTORED, documentId, clubId(saved), before, snapshot(saved));
        return documentMapper.toResponse(saved);
    }

    private void requireClubListing(Actor actor, UUID clubId, boolean deleted) {
        if (deleted) authorizationService.require(actor, DocumentConstants.PERMISSION_RESTORE, clubId, null);
        if (!clubRepository.existsById(clubId)) throw notFound("CLUB_NOT_FOUND", "Club not found");
    }

    private Document visible(Actor actor, java.util.Optional<Document> found, UUID documentId) {
        Document document = found.orElseThrow(() -> authorizationService.missingResource(actor,
                DocumentConstants.PERMISSION_VIEW, new DocumentNotFoundException()));
        authorizationService.require(actor, DocumentConstants.PERMISSION_VIEW, clubId(document), null);
        if (document.isDeleted()
                && !authorizationService.hasPermission(actor, DocumentConstants.PERMISSION_RESTORE, clubId(document), null)) {
            throw new DocumentNotFoundException();
        }
        return document;
    }

    private static Document live(Document document) {
        if (document.isDeleted()) throw new DocumentDeletedException();
        return document;
    }

    private void requireOwnerOr(Actor actor, Document document, String permissionKey) {
        if (!Objects.equals(document.getOwner().getId(), actor.id())) {
            authorizationService.require(actor, permissionKey, clubId(document), null);
        }
    }

    private DocumentVersion resolveVersion(Document document, Integer version) {
        if (version == null) version = document.getVersion();
        if (version < 1) throw new InvalidDocumentVersionException();
        return versionRepository.findByDocument_IdAndVersion(document.getId(), version)
                .orElseThrow(() -> new DocumentVersionNotFoundException(
                        "Document has versions 1 to " + document.getVersion()));
    }

    private String store(UUID clubId, InspectedFile inspected, UploadedFile file) {
        String path = "clubs/" + clubId + "/documents/" + UUID.randomUUID() + "." + inspected.type().extension();
        try (InputStream content = file.content().open()) {
            storage.put(path, content, inspected.size(), inspected.type().contentType());
        } catch (IOException exception) {
            throw new DocumentStorageException("Uploaded file could not be read", exception);
        }
        if (TransactionSynchronizationManager.isSynchronizationActive()) {
            TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                @Override
                public void afterCompletion(int status) {
                    if (status == STATUS_COMMITTED) return;
                    try {
                        storage.delete(path);
                    } catch (RuntimeException exception) {
                        log.warn("Orphaned document object {} could not be removed", path, exception);
                    }
                }
            });
        }
        return path;
    }

    private static void point(Document document, int version, String path, InspectedFile inspected) {
        document.setVersion(version);
        document.setPath(path);
        document.setContentType(inspected.type().contentType());
        document.setSizeBytes(inspected.size());
        document.setChecksumSha256(inspected.sha256());
    }

    private DocumentVersion version(Document document, InspectedFile inspected, String originalName, Actor actor) {
        DocumentVersion version = new DocumentVersion();
        version.setDocument(document);
        version.setVersion(document.getVersion());
        version.setPath(document.getPath());
        version.setOriginalName(originalNameOrChecked(originalName, inspected));
        version.setContentType(document.getContentType());
        version.setSizeBytes(document.getSizeBytes());
        version.setChecksumSha256(document.getChecksumSha256());
        version.setUploadedBy(actor.id());
        return version;
    }

    private String originalNameOrChecked(String originalName, InspectedFile inspected) {
        try {
            return inspector.checkName(originalName);
        } catch (DocumentException | IllegalArgumentException exception) {
            return inspected.name();
        }
    }

    private static UUID clubId(Document document) {
        return document.getClub().getId();
    }

    private static Map<String, Object> snapshot(Document document) {
        Map<String, Object> values = new LinkedHashMap<>();
        values.put("name", document.getName());
        values.put("version", document.getVersion());
        values.put("path", document.getPath());
        values.put("sizeBytes", document.getSizeBytes());
        values.put("appDetailKey", document.getAppDetailKey());
        values.put("deleted", document.isDeleted());
        return values;
    }

    private static ApiException notFound(String code, String message) {
        return new ApiException(HttpStatus.NOT_FOUND, code, message);
    }
}
