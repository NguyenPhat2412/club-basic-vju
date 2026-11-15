package com.vju.club.service.impl;

import com.vju.club.common.DocumentConstants;
import com.vju.club.dto.record.UploadedFile;
import com.vju.club.entity.Document;
import com.vju.club.entity.DocumentVersion;
import com.vju.club.enums.DocumentScope;
import com.vju.club.exception.DocumentException;
import com.vju.club.exception.DocumentStorageException;
import com.vju.club.security.Actor;
import com.vju.club.service.DocumentFileInspector;
import com.vju.club.service.DocumentFileInspector.InspectedFile;
import com.vju.club.storage.DocumentStorage;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

import java.io.IOException;
import java.io.InputStream;
import java.time.LocalDate;
import java.time.YearMonth;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.UUID;

@Component
@RequiredArgsConstructor
public class DocumentVaultWriter {
    private static final Logger log = LoggerFactory.getLogger(DocumentVaultWriter.class);

    private final DocumentStorage storage;
    private final DocumentFileInspector inspector;

    public String store(InspectedFile inspected, UploadedFile file, DocumentScope scope,
                        String clubCode, UUID deptId, int version, String displayDocName) {
        String path = LocalDate.now(DocumentConstants.STORAGE_ZONE).format(DocumentConstants.STORAGE_FOLDER) + "/"
                + UUID.randomUUID() + "." + inspected.type().extension();
        String vaultFolder = switch (scope) {
            case SYSTEM -> "SYSTEM/" + YearMonth.now(DocumentConstants.STORAGE_ZONE);
            case DEPARTMENT -> "CLUBS/" + clubCode + "/DEPARTMENTS/" + deptId;
            case CLUB -> "CLUBS/" + clubCode + "/GENERAL";
        };
        Map<String, String> metadata = Map.of(
                "vaultFolder", vaultFolder,
                "displayName", "v" + version + "_" + displayDocName,
                "scope", scope.name(),
                "clubCode", clubCode
        );
        try (InputStream content = file.content().open()) {
            storage.put(path, content, inspected.size(), inspected.type().contentType(), metadata);
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

    public void point(Document document, int version, String path, InspectedFile inspected) {
        document.setVersion(version);
        document.setPath(path);
        document.setContentType(inspected.type().contentType());
        document.setSizeBytes(inspected.size());
        document.setChecksumSha256(inspected.sha256());
    }

    public DocumentVersion buildVersion(Document document, InspectedFile inspected, String originalName, Actor actor) {
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

    public Map<String, Object> snapshot(Document document) {
        Map<String, Object> values = new LinkedHashMap<>();
        values.put("name", document.getName());
        values.put("scope", document.getScope());
        values.put("visibility", document.getVisibility());
        values.put("version", document.getVersion());
        values.put("path", document.getPath());
        values.put("sizeBytes", document.getSizeBytes());
        values.put("appDetailKey", document.getAppDetailKey());
        values.put("deleted", document.isDeleted());
        return values;
    }

    private String originalNameOrChecked(String originalName, InspectedFile inspected) {
        try {
            return inspector.checkName(originalName);
        } catch (DocumentException | IllegalArgumentException exception) {
            return inspected.name();
        }
    }
}
