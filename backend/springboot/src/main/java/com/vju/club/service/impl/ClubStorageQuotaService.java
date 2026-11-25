package com.vju.club.service.impl;

import com.vju.club.common.ClubConstants;
import com.vju.club.common.DocumentConstants;
import com.vju.club.dto.response.ClubUsageResponse;
import com.vju.club.dto.response.SystemSettingsResponse;
import com.vju.club.enums.EventStatus;
import com.vju.club.enums.TaskStatus;
import com.vju.club.error.ApiException;
import com.vju.club.repository.ChatChannelRepository;
import com.vju.club.repository.ChatMessageAttachmentRepository;
import com.vju.club.repository.ClubRepository;
import com.vju.club.repository.DepartmentRepository;
import com.vju.club.repository.DocumentVersionRepository;
import com.vju.club.repository.EventRepository;
import com.vju.club.repository.TaskRepository;
import com.vju.club.security.Actor;
import com.vju.club.security.PermissionAuthorizationService;
import com.vju.club.service.SystemSettingsService;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class ClubStorageQuotaService {
    private static final int DEFAULT_CLUB_STORAGE_QUOTA_MB = 500;
    private static final int DEFAULT_DOCUMENT_MAX_VERSIONS = 20;
    private static final int DEFAULT_MAX_CHANNELS_PER_CLUB = 30;
    private static final int DEFAULT_MAX_DEPARTMENTS_PER_CLUB = 20;
    private static final int DEFAULT_MAX_ACTIVE_EVENTS_PER_CLUB = 50;
    private static final int DEFAULT_MAX_OPEN_TASKS_PER_CLUB = 200;
    private static final long BYTES_PER_MB = 1024L * 1024L;

    private final DocumentVersionRepository documentVersionRepository;
    private final ChatMessageAttachmentRepository chatAttachmentRepository;
    private final ClubRepository clubRepository;
    private final ChatChannelRepository chatChannelRepository;
    private final DepartmentRepository departmentRepository;
    private final EventRepository eventRepository;
    private final TaskRepository taskRepository;
    private final PermissionAuthorizationService authorizationService;

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
        int quotaMb = (settingsService != null && settingsService.current() != null)
                ? settingsService.current().clubStorageQuotaMb()
                : DEFAULT_CLUB_STORAGE_QUOTA_MB;
        return quotaMb <= 0 ? 0L : quotaMb * BYTES_PER_MB;
    }

    @Transactional(readOnly = true)
    public ClubUsageResponse getClubUsage(Actor actor, UUID clubId) {
        boolean allowed = authorizationService.hasPermission(actor, ClubConstants.PERMISSION_VIEW, clubId, null)
                || authorizationService.hasPermission(actor, DocumentConstants.PERMISSION_VIEW, clubId, null);
        if (!allowed) {
            throw new ApiException(HttpStatus.FORBIDDEN, "PERMISSION_DENIED", "Permission denied");
        }
        if (clubId == null || !clubRepository.existsById(clubId)) {
            throw new ApiException(HttpStatus.NOT_FOUND, "CLUB_NOT_FOUND", "Club not found");
        }

        long documentBytes = Math.max(0L, documentVersionRepository.sumLiveSizeBytesByClubId(clubId));
        long chatMediaBytes = Math.max(0L, chatAttachmentRepository.sumSizeBytesByClubId(clubId));
        long storageUsedBytes = documentBytes + chatMediaBytes;

        SystemSettingsResponse settings = settingsService != null ? settingsService.current() : null;
        int storageQuotaMb = Math.max(0, settings != null ? settings.clubStorageQuotaMb() : DEFAULT_CLUB_STORAGE_QUOTA_MB);
        long storageQuotaBytes = storageQuotaMb <= 0 ? 0L : storageQuotaMb * BYTES_PER_MB;

        long channelCount = Math.max(0L, chatChannelRepository.countByClub_Id(clubId));
        int maxChannelsPerClub = settings != null ? settings.maxChannelsPerClub() : DEFAULT_MAX_CHANNELS_PER_CLUB;

        long departmentCount = Math.max(0L, departmentRepository.countByClub_Id(clubId));
        int maxDepartmentsPerClub = settings != null ? settings.maxDepartmentsPerClub() : DEFAULT_MAX_DEPARTMENTS_PER_CLUB;

        long activeEventCount = Math.max(0L, eventRepository.countByClub_IdAndStatusNotIn(
                clubId, List.of(EventStatus.COMPLETED, EventStatus.CANCELLED)));
        int maxActiveEventsPerClub = settings != null ? settings.maxActiveEventsPerClub() : DEFAULT_MAX_ACTIVE_EVENTS_PER_CLUB;

        long openTaskCount = Math.max(0L, taskRepository.countByClub_IdAndStatusIn(
                clubId, List.of(TaskStatus.TODO, TaskStatus.IN_PROGRESS, TaskStatus.OVERDUE)));
        int maxOpenTasksPerClub = settings != null ? settings.maxOpenTasksPerClub() : DEFAULT_MAX_OPEN_TASKS_PER_CLUB;

        return new ClubUsageResponse(
                clubId,
                storageUsedBytes,
                documentBytes,
                chatMediaBytes,
                storageQuotaBytes,
                storageQuotaMb,
                channelCount,
                maxChannelsPerClub,
                departmentCount,
                maxDepartmentsPerClub,
                activeEventCount,
                maxActiveEventsPerClub,
                openTaskCount,
                maxOpenTasksPerClub
        );
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
