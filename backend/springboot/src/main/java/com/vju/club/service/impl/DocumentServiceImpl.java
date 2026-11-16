package com.vju.club.service.impl;

import com.vju.club.annotation.RequirePermission;
import com.vju.club.common.ApiPaths;
import com.vju.club.common.DocumentConstants;
import com.vju.club.common.OffsetLimitRequest;
import com.vju.club.config.StorageProperties;
import com.vju.club.dto.record.DocumentContent;
import com.vju.club.dto.record.UploadedFile;
import com.vju.club.dto.request.DocumentPatchRequest;
import com.vju.club.dto.response.DocumentCountResponse;
import com.vju.club.dto.response.DocumentDownloadUrlResponse;
import com.vju.club.dto.response.DocumentNamesResponse;
import com.vju.club.dto.response.DocumentResponse;
import com.vju.club.dto.response.DocumentVersionResponse;
import com.vju.club.dto.response.PageResponse;
import com.vju.club.entity.Club;
import com.vju.club.entity.Department;
import com.vju.club.entity.Document;
import com.vju.club.entity.DocumentVersion;
import com.vju.club.enums.AuditAction;
import com.vju.club.enums.ClubStatus;
import com.vju.club.enums.DocumentScope;
import com.vju.club.enums.DocumentVisibility;
import com.vju.club.error.ApiException;
import com.vju.club.exception.DocumentDeletedException;
import com.vju.club.exception.DocumentNameAlreadyExistsException;
import com.vju.club.exception.DocumentNotDeletedException;
import com.vju.club.exception.DocumentNotFoundException;
import com.vju.club.exception.DocumentTypeChangedException;
import com.vju.club.exception.DocumentVersionConflictException;
import com.vju.club.exception.DocumentVersionNotFoundException;
import com.vju.club.exception.DocumentVersionUnchangedException;
import com.vju.club.exception.InvalidDocumentVersionException;
import com.vju.club.mapper.DocumentMapper;
import com.vju.club.repository.ClubRepository;
import com.vju.club.repository.DepartmentRepository;
import com.vju.club.repository.DocumentRepository;
import com.vju.club.repository.DocumentVersionRepository;
import com.vju.club.repository.UserRepository;
import com.vju.club.security.Actor;
import com.vju.club.security.PermissionAuthorizationService;
import com.vju.club.service.AuditService;
import com.vju.club.service.DocumentFileInspector;
import com.vju.club.service.DocumentFileInspector.InspectedFile;
import com.vju.club.service.DocumentService;
import com.vju.club.storage.DocumentStorage;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

import static com.vju.club.specification.DocumentSpecifications.appDetailKey;
import static com.vju.club.specification.DocumentSpecifications.deleted;
import static com.vju.club.specification.DocumentSpecifications.inClub;
import static com.vju.club.specification.DocumentSpecifications.inDepartment;
import static com.vju.club.specification.DocumentSpecifications.inSystem;
import static com.vju.club.specification.DocumentSpecifications.nameContains;
import static com.vju.club.specification.DocumentSpecifications.visibleInClub;
import static com.vju.club.specification.DocumentSpecifications.visibleInSystem;
import static com.vju.club.specification.DocumentSpecifications.withVisibility;

@Service
@RequiredArgsConstructor
public class DocumentServiceImpl implements DocumentService {
    private final DocumentRepository documentRepository;
    private final DocumentVersionRepository versionRepository;
    private final ClubRepository clubRepository;
    private final DepartmentRepository departmentRepository;
    private final UserRepository userRepository;
    private final DocumentStorage storage;
    private final DocumentVaultWriter vaultWriter;
    private final DocumentFileInspector inspector;
    private final StorageProperties storageProperties;
    private final AuditService auditService;
    private final PermissionAuthorizationService authorizationService;
    private final DocumentAccessPolicy accessPolicy;
    private final DocumentMapper documentMapper;
    @Autowired(required = false)
    private ChatAndVaultNotifier notifier;

    @Override
    @Transactional(readOnly = true)
    public PageResponse<DocumentResponse> listSystem(Actor actor, String name, String appDetailKey,
                                                     DocumentVisibility visibility, boolean deleted, int offset, int limit) {
        if (deleted) authorizationService.require(actor, DocumentConstants.PERMISSION_RESTORE, null, null);
        Specification<Document> filter = Specification.allOf(
                inSystem(), deleted(deleted), nameContains(name),
                appDetailKey(inspector.checkAppDetailKey(appDetailKey)),
                withVisibility(visibility),
                visibleInSystem(accessPolicy.canSeeSystemOfficerDocs(actor)));
        var page = documentRepository.findAll(filter, new OffsetLimitRequest(offset, limit, sortOrder(deleted)));
        return new PageResponse<>(page.map(documentMapper::toResponse).getContent(), page.getTotalElements(), offset, limit);
    }

    @Override
    @Transactional
    @RequirePermission(value = DocumentConstants.PERMISSION_UPLOAD)
    public DocumentResponse uploadSystem(Actor actor, String name, String appDetailKey,
                                         DocumentVisibility visibility, UploadedFile file) {
        String key = inspector.checkAppDetailKey(appDetailKey);
        DocumentVisibility resolvedVisibility = accessPolicy.validateVisibility(DocumentScope.SYSTEM, visibility);
        InspectedFile inspected = inspector.inspect(name == null || name.isBlank() ? file.originalName() : name, file.content());
        if (documentRepository.existsLiveSystemName(inspected.name(), null)) throw new DocumentNameAlreadyExistsException();
        String path = vaultWriter.store(inspected, file, DocumentScope.SYSTEM, "SYSTEM", null, 1, inspected.name());
        Document document = new Document();
        document.setScope(DocumentScope.SYSTEM);
        document.setVisibility(resolvedVisibility);
        document.setOwner(userRepository.getReferenceById(actor.id()));
        document.setName(inspected.name());
        document.setAppDetailKey(key);
        vaultWriter.point(document, 1, path, inspected);
        Document saved = documentRepository.saveAndFlush(document);
        versionRepository.saveAndFlush(vaultWriter.buildVersion(saved, inspected, file.originalName(), actor));
        auditService.record(actor.id(), AuditAction.DOCUMENT_UPLOADED, saved.getId(), null, null, vaultWriter.snapshot(saved));
        return documentMapper.toResponse(saved);
    }

    @Override
    @Transactional(readOnly = true)
    @RequirePermission(value = DocumentConstants.PERMISSION_VIEW, clubId = "clubId", departmentId = "departmentId")
    public PageResponse<DocumentResponse> list(Actor actor, UUID clubId, UUID departmentId, DocumentVisibility visibility,
                                               String name, String appDetailKey, boolean deleted, int offset, int limit) {
        requireClubListing(actor, clubId, deleted);
        boolean officer = accessPolicy.isClubOfficer(actor, clubId);
        Set<UUID> allowedDepts = officer ? Set.of() : accessPolicy.allowedDepartmentIds(actor, clubId);
        if (departmentId != null) {
            requireDepartmentInClub(clubId, departmentId);
            if (!officer && !allowedDepts.contains(departmentId)) {
                throw new ApiException(HttpStatus.FORBIDDEN, "PERMISSION_DENIED", "Permission denied");
            }
        }
        Specification<Document> filter = Specification.allOf(
                inClub(clubId), inDepartment(departmentId), withVisibility(visibility),
                visibleInClub(officer, allowedDepts), deleted(deleted),
                nameContains(name), appDetailKey(inspector.checkAppDetailKey(appDetailKey)));
        var page = documentRepository.findAll(filter, new OffsetLimitRequest(offset, limit, sortOrder(deleted)));
        return new PageResponse<>(page.map(documentMapper::toResponse).getContent(), page.getTotalElements(), offset, limit);
    }

    @Override
    @Transactional(readOnly = true)
    @RequirePermission(value = DocumentConstants.PERMISSION_VIEW, clubId = "clubId")
    public DocumentCountResponse getDocCount(Actor actor, UUID clubId, String appDetailKey, boolean deleted) {
        requireClubListing(actor, clubId, deleted);
        boolean officer = accessPolicy.isClubOfficer(actor, clubId);
        Set<UUID> allowedDepts = officer ? Set.of() : accessPolicy.allowedDepartmentIds(actor, clubId);
        long count = documentRepository.count(Specification.allOf(
                inClub(clubId), visibleInClub(officer, allowedDepts),
                deleted(deleted), appDetailKey(inspector.checkAppDetailKey(appDetailKey))));
        return new DocumentCountResponse(clubId, deleted, count);
    }

    @Override
    @Transactional(readOnly = true)
    @RequirePermission(value = DocumentConstants.PERMISSION_VIEW, clubId = "clubId")
    public DocumentNamesResponse getDocumentNames(Actor actor, UUID clubId, boolean deleted) {
        requireClubListing(actor, clubId, deleted);
        boolean officer = accessPolicy.isClubOfficer(actor, clubId);
        Set<UUID> allowedDepts = officer ? Set.of() : accessPolicy.allowedDepartmentIds(actor, clubId);
        List<String> names = officer
                ? documentRepository.findNames(clubId, deleted)
                : documentRepository.findAll(Specification.allOf(
                                inClub(clubId), visibleInClub(false, allowedDepts), deleted(deleted)))
                        .stream()
                        .map(Document::getName)
                        .sorted(Comparator.comparing((String n) -> n, String.CASE_INSENSITIVE_ORDER).thenComparing(Comparator.naturalOrder()))
                        .toList();
        return new DocumentNamesResponse(clubId, deleted, names);
    }

    @Override
    @Transactional(readOnly = true)
    public DocumentResponse get(Actor actor, UUID documentId) {
        return documentMapper.toResponse(accessPolicy.requireVisible(actor, documentRepository.findWithRelationsById(documentId)));
    }

    @Override
    @Transactional(readOnly = true)
    public List<DocumentVersionResponse> listVersions(Actor actor, UUID documentId) {
        accessPolicy.requireVisible(actor, documentRepository.findWithRelationsById(documentId));
        return versionRepository.findByDocument_IdOrderByVersionDesc(documentId).stream()
                .map(documentMapper::toVersionResponse).toList();
    }

    @Override
    @Transactional(readOnly = true)
    public DocumentMeta resolveMetadata(Actor actor, UUID documentId, Integer version, boolean requirePreviewable) {
        Document document = live(accessPolicy.requireVisible(actor, documentRepository.findWithRelationsById(documentId)));
        DocumentVersion file = resolveVersion(document, version);
        if (requirePreviewable && !documentMapper.isPreviewable(file.getContentType())) {
            throw new ApiException(HttpStatus.UNSUPPORTED_MEDIA_TYPE, "DOCUMENT_NOT_PREVIEWABLE",
                    "This file type cannot be previewed inline; please download it instead");
        }
        return new DocumentMeta(document.getName(), file.getContentType(), file.getSizeBytes(),
                file.getChecksumSha256(), file.getVersion(), file.getPath());
    }

    @Override
    public DocumentContent openContent(DocumentMeta meta) {
        DocumentStorage.StoredObject object = storage.open(meta.path());
        return new DocumentContent(meta.fileName(), meta.contentType(), object.size(),
                meta.checksumSha256(), meta.version(), object.content());
    }

    @Override
    @Transactional(readOnly = true)
    public DocumentDownloadUrlResponse downloadUrl(Actor actor, UUID documentId, Integer version) {
        Document document = live(accessPolicy.requireVisible(actor, documentRepository.findWithRelationsById(documentId)));
        DocumentVersion file = resolveVersion(document, version);
        var ttl = storageProperties.getDownloadUrlTtl();
        return storage.presignDownload(file.getPath(), document.getName(), file.getContentType(), ttl)
                .map(url -> new DocumentDownloadUrlResponse(url.toString(), file.getVersion(), OffsetDateTime.now().plus(ttl)))
                .orElseGet(() -> new DocumentDownloadUrlResponse(
                        ApiPaths.documentDownloadPath(documentId, file.getVersion()), file.getVersion(), null));
    }

    @Override
    @Transactional
    @RequirePermission(value = DocumentConstants.PERMISSION_UPLOAD, clubId = "clubId", departmentId = "departmentId")
    public DocumentResponse upload(Actor actor, UUID clubId, UUID departmentId, DocumentVisibility visibility,
                                   String name, String appDetailKey, UploadedFile file) {
        Club club = clubRepository.findById(clubId).orElseThrow(() -> notFound("CLUB_NOT_FOUND", "Club not found"));
        if (club.getStatus() != ClubStatus.ACTIVE) throw new ApiException(HttpStatus.CONFLICT, "CLUB_INACTIVE", "Club is inactive");
        Department department = departmentId != null ? requireDepartmentInClub(clubId, departmentId) : null;
        DocumentScope scope = department != null ? DocumentScope.DEPARTMENT : DocumentScope.CLUB;
        DocumentVisibility resolvedVisibility = accessPolicy.validateVisibility(scope, visibility);
        String key = inspector.checkAppDetailKey(appDetailKey);
        InspectedFile inspected = inspector.inspect(name == null || name.isBlank() ? file.originalName() : name, file.content());
        ensureUniqueName(scope, clubId, departmentId, inspected.name(), null);
        String path = vaultWriter.store(inspected, file, scope, club.getCode(), departmentId, 1, inspected.name());
        Document document = new Document();
        document.setClub(club);
        document.setDepartment(department);
        document.setScope(scope);
        document.setVisibility(resolvedVisibility);
        document.setOwner(userRepository.getReferenceById(actor.id()));
        document.setName(inspected.name());
        document.setAppDetailKey(key);
        vaultWriter.point(document, 1, path, inspected);
        Document saved = documentRepository.saveAndFlush(document);
        versionRepository.saveAndFlush(vaultWriter.buildVersion(saved, inspected, file.originalName(), actor));
        auditService.record(actor.id(), AuditAction.DOCUMENT_UPLOADED, saved.getId(), clubId, null, vaultWriter.snapshot(saved));
        if (notifier != null) notifier.notifyClubDocumentUploaded(actor.id(), club, department, resolvedVisibility, saved);
        return documentMapper.toResponse(saved);
    }

    @Override
    @Transactional
    public DocumentResponse uploadVersion(Actor actor, UUID documentId, Integer expectedVersion, UploadedFile file) {
        Document document = live(accessPolicy.requireVisible(actor, documentRepository.findForUpdate(documentId)));
        accessPolicy.requireUploadVersion(actor, document);
        requireActiveClub(document);
        if (expectedVersion != null && expectedVersion != document.getVersion()) {
            throw new DocumentVersionConflictException("Document is at version " + document.getVersion()
                    + ", not " + expectedVersion + "; reload it and try again");
        }
        InspectedFile inspected = inspector.inspect(file.originalName(), file.content());
        if (inspected.type() != inspector.typeOf(document.getName())) {
            throw new DocumentTypeChangedException("Document is a ." + inspector.typeOf(document.getName()).extension()
                    + " file; a new version cannot be ." + inspected.type().extension());
        }
        if (inspected.sha256().equals(document.getChecksumSha256())) throw new DocumentVersionUnchangedException();
        Map<String, Object> before = vaultWriter.snapshot(document);
        int nextVersion = document.getVersion() + 1;
        String clubCode = document.getClub() != null ? document.getClub().getCode() : "SYSTEM";
        String path = vaultWriter.store(inspected, file, document.getScope(), clubCode, deptIdOf(document), nextVersion, document.getName());
        vaultWriter.point(document, nextVersion, path, inspected);
        Document saved = documentRepository.saveAndFlush(document);
        versionRepository.saveAndFlush(vaultWriter.buildVersion(saved, inspected, file.originalName(), actor));
        auditService.recordChange(actor.id(), AuditAction.DOCUMENT_VERSION_UPLOADED, documentId, clubIdOf(saved),
                before, vaultWriter.snapshot(saved));
        return documentMapper.toResponse(saved);
    }

    @Override
    @Transactional
    public DocumentResponse update(Actor actor, UUID documentId, DocumentPatchRequest request) {
        Document document = live(accessPolicy.requireVisible(actor, documentRepository.findForUpdate(documentId)));
        accessPolicy.requireUpdateOrOwner(actor, document);
        requireActiveClub(document);
        Map<String, Object> before = vaultWriter.snapshot(document);
        if (request.name() != null) {
            String name = inspector.checkName(request.name());
            if (inspector.typeOf(name) != inspector.typeOf(document.getName())) {
                throw new DocumentTypeChangedException("Renaming cannot change the file extension");
            }
            ensureUniqueName(document.getScope(), clubIdOf(document), deptIdOf(document), name, documentId);
            document.setName(name);
        }
        if (request.appDetailKey() != null) document.setAppDetailKey(inspector.checkAppDetailKey(request.appDetailKey()));
        if (request.visibility() != null) {
            if (request.visibility() != document.getVisibility()) accessPolicy.requireVisibilityChange(actor, document);
            document.setVisibility(accessPolicy.validateVisibility(document.getScope(), request.visibility()));
        }
        Document saved = documentRepository.saveAndFlush(document);
        auditService.recordChange(actor.id(), AuditAction.DOCUMENT_UPDATED, documentId, clubIdOf(saved), before, vaultWriter.snapshot(saved));
        return documentMapper.toResponse(saved);
    }

    @Override
    @Transactional
    public void delete(Actor actor, UUID documentId) {
        Document document = live(accessPolicy.requireVisible(actor, documentRepository.findForUpdate(documentId)));
        accessPolicy.requireDeleteOrOwner(actor, document);
        requireActiveClub(document);
        Map<String, Object> before = vaultWriter.snapshot(document);
        document.setDeleted(true);
        document.setDeletedAt(OffsetDateTime.now());
        document.setDeletedBy(actor.id());
        Document saved = documentRepository.saveAndFlush(document);
        auditService.recordChange(actor.id(), AuditAction.DOCUMENT_DELETED, documentId, clubIdOf(saved), before, vaultWriter.snapshot(saved));
    }

    @Override
    @Transactional
    public DocumentResponse restore(Actor actor, UUID documentId) {
        Document document = documentRepository.findForUpdate(documentId).orElseThrow(() ->
                authorizationService.missingResource(actor, DocumentConstants.PERMISSION_RESTORE, new DocumentNotFoundException()));
        accessPolicy.requireRestore(actor, document);
        requireActiveClub(document);
        if (!document.isDeleted()) throw new DocumentNotDeletedException();
        ensureUniqueName(document.getScope(), clubIdOf(document), deptIdOf(document), document.getName(), documentId);
        Map<String, Object> before = vaultWriter.snapshot(document);
        document.setDeleted(false);
        document.setDeletedAt(null);
        document.setDeletedBy(null);
        Document saved = documentRepository.saveAndFlush(document);
        auditService.recordChange(actor.id(), AuditAction.DOCUMENT_RESTORED, documentId, clubIdOf(saved), before, vaultWriter.snapshot(saved));
        return documentMapper.toResponse(saved);
    }

    private void ensureUniqueName(DocumentScope scope, UUID clubId, UUID deptId, String name, UUID exceptId) {
        boolean exists = switch (scope) {
            case SYSTEM -> documentRepository.existsLiveSystemName(name, exceptId);
            case DEPARTMENT -> documentRepository.existsLiveDepartmentName(clubId, deptId, name, exceptId);
            case CLUB -> documentRepository.existsLiveName(clubId, name, exceptId);
        };
        if (exists) throw new DocumentNameAlreadyExistsException();
    }

    private Department requireDepartmentInClub(UUID clubId, UUID departmentId) {
        return departmentRepository.findById(departmentId)
                .filter(d -> d.getClub().getId().equals(clubId))
                .orElseThrow(() -> notFound("DEPARTMENT_NOT_FOUND", "Department not found in club"));
    }

    private void requireClubListing(Actor actor, UUID clubId, boolean deleted) {
        if (deleted) authorizationService.require(actor, DocumentConstants.PERMISSION_RESTORE, clubId, null);
        if (!clubRepository.existsById(clubId)) throw notFound("CLUB_NOT_FOUND", "Club not found");
    }

    private static Sort sortOrder(boolean deleted) {
        return deleted ? Sort.by(Sort.Order.desc("deletedAt"), Sort.Order.asc("id"))
                : Sort.by(Sort.Order.desc("createdAt"), Sort.Order.asc("id"));
    }

    private static Document live(Document document) {
        if (document.isDeleted()) throw new DocumentDeletedException();
        return document;
    }

    private static void requireActiveClub(Document document) {
        if (document.getClub() != null && document.getClub().getStatus() != ClubStatus.ACTIVE) {
            throw new ApiException(HttpStatus.CONFLICT, "CLUB_INACTIVE", "Club is inactive");
        }
    }

    private DocumentVersion resolveVersion(Document document, Integer version) {
        if (version == null) version = document.getVersion();
        if (version < 1) throw new InvalidDocumentVersionException();
        return versionRepository.findByDocument_IdAndVersion(document.getId(), version)
                .orElseThrow(() -> new DocumentVersionNotFoundException(
                        "Document has versions 1 to " + document.getVersion()));
    }

    private static UUID clubIdOf(Document document) {
        return document.getClub() != null ? document.getClub().getId() : null;
    }

    private static UUID deptIdOf(Document document) {
        return document.getDepartment() != null ? document.getDepartment().getId() : null;
    }

    private static ApiException notFound(String code, String message) {
        return new ApiException(HttpStatus.NOT_FOUND, code, message);
    }
}
