package com.vju.club.service.impl;

import com.vju.club.error.ApiException;
import com.vju.club.repository.ChatMessageAttachmentRepository;
import com.vju.club.repository.DocumentVersionRepository;
import com.vju.club.service.SystemSettingsService;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Service
@RequiredArgsConstructor
public class ClubStorageQuotaService {
    private static final int DEFAULT_CLUB_STORAGE_QUOTA_MB = 500;
    private static final int DEFAULT_DOCUMENT_MAX_VERSIONS = 20;
    private static final long BYTES_PER_MB = 1024L * 1024L;

    private final DocumentVersionRepository documentVersionRepository;
    private final ChatMessageAttachmentRepository chatAttachmentRepository;

    @Autowired(required = false)
    private SystemSettingsService settingsService;

    @Transactional(readOnly = true)
    public void requireDocumentVersionAllowed(int currentVersion) {
        int maxVersions = (settingsService != null && settingsService.current() != null)
                ? settingsService.current().documentMaxVersions()
                : DEFAULT_DOCUMENT_MAX_VERSIONS;
        if (maxVersions > 0 && currentVersion >= maxVersions) {
            throw new ApiException(HttpStatus.CONFLICT, "DOCUMENT_VERSION_LIMIT_REACHED",
                    "Mỗi tài liệu chỉ được lưu tối đa " + maxVersions + " phiên bản.");
        }
    }

    @Transactional(readOnly = true)
    public void requireDocumentRestoreQuota(UUID clubId, UUID documentId) {
        if (clubId == null || documentId == null) {
            return;
        }
        requireQuotaAvailable(clubId, documentVersionRepository.sumSizeBytesByDocumentId(documentId));
    }

    @Transactional(readOnly = true)
    public long usedBytes(UUID clubId) {
        if (clubId == null) {
            return 0L;
        }
        long docBytes = documentVersionRepository.sumLiveSizeBytesByClubId(clubId);
        long chatBytes = chatAttachmentRepository.sumSizeBytesByClubId(clubId);
        return docBytes + chatBytes;
    }

    @Transactional(readOnly = true)
    public long quotaBytes() {
        int quotaMb = settingsService != null
                ? settingsService.current().clubStorageQuotaMb()
                : DEFAULT_CLUB_STORAGE_QUOTA_MB;
        return quotaMb <= 0 ? 0L : quotaMb * BYTES_PER_MB;
    }

    @Transactional(readOnly = true)
    public void requireQuotaAvailable(UUID clubId, long additionalBytes) {
        if (clubId == null || additionalBytes <= 0) {
            return;
        }
        long quota = quotaBytes();
        if (quota <= 0) {
            return;
        }
        long used = usedBytes(clubId);
        if (used + additionalBytes > quota) {
            long quotaMb = quota / BYTES_PER_MB;
            throw new ApiException(
                    HttpStatus.CONFLICT,
                    "CLUB_STORAGE_QUOTA_EXCEEDED",
                    "Câu lạc bộ đã đạt giới hạn dung lượng lưu trữ (" + quotaMb
                            + " MB). Vui lòng xoá bớt tệp cũ hoặc liên hệ quản trị viên."
            );
        }
    }
}
