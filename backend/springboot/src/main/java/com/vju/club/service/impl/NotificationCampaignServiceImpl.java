package com.vju.club.service.impl;

import com.vju.club.common.OffsetLimitRequest;
import com.vju.club.dto.request.CreateNotificationCampaignRequest;
import com.vju.club.dto.response.NotificationAudiencePreviewResponse;
import com.vju.club.dto.response.NotificationCampaignRemindResponse;
import com.vju.club.dto.response.NotificationCampaignResponse;
import com.vju.club.dto.response.NotificationRealtimeEvent;
import com.vju.club.dto.response.PageResponse;
import com.vju.club.entity.Document;
import com.vju.club.entity.NotificationCampaign;
import com.vju.club.entity.User;
import com.vju.club.enums.AuditAction;
import com.vju.club.error.ApiException;
import com.vju.club.repository.ClubRepository;
import com.vju.club.repository.DocumentRepository;
import com.vju.club.repository.MembershipRepository;
import com.vju.club.repository.NotificationCampaignRepository;
import com.vju.club.repository.NotificationRepository;
import com.vju.club.repository.UserRepository;
import com.vju.club.repository.UserRoleRepository;
import com.vju.club.security.Actor;
import com.vju.club.security.PermissionAuthorizationService;
import com.vju.club.security.websocket.WebSocketSessionTracker;
import com.vju.club.service.AuditService;
import com.vju.club.service.NotificationCampaignService;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.sql.Timestamp;
import java.time.Clock;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class NotificationCampaignServiceImpl implements NotificationCampaignService {
    private static final String PERMISSION_SEND = "notification.send";
    private static final int BATCH_CHUNK_SIZE = 200;

    private final NotificationCampaignRepository campaignRepository;
    private final NotificationRepository notificationRepository;
    private final UserRepository userRepository;
    private final UserRoleRepository userRoleRepository;
    private final MembershipRepository membershipRepository;
    private final ClubRepository clubRepository;
    private final DocumentRepository documentRepository;
    private final PermissionAuthorizationService authorizationService;
    private final AuditService auditService;
    private final JdbcTemplate jdbcTemplate;
    private final Clock clock;

    @Autowired(required = false)
    private NotificationEmailListener emailListener;

    @Autowired(required = false)
    private WebSocketSessionTracker webSocketSessionTracker;

    @Autowired(required = false)
    private ApplicationEventPublisher eventPublisher;

    @Override
    @Transactional(readOnly = true)
    public PageResponse<NotificationCampaignResponse> listCampaigns(Actor actor, int offset, int limit) {
        boolean isGlobalSender = authorizationService.hasPermission(actor, PERMISSION_SEND, null, null);
        if (!isGlobalSender && !canSendInAnyClub(actor)) {
            throw new ApiException(HttpStatus.FORBIDDEN, "PERMISSION_DENIED", "Permission denied");
        }
        var pageable = new OffsetLimitRequest(offset, limit, Sort.by(Sort.Direction.DESC, "createdAt"));
        Page<NotificationCampaign> page = isGlobalSender
                ? campaignRepository.findAllByOrderByCreatedAtDesc(pageable)
                : campaignRepository.findByCreatedByOrderByCreatedAtDesc(actor.id(), pageable);

        List<NotificationCampaign> rows = page.getContent();
        if (rows.isEmpty()) {
            return new PageResponse<>(List.of(), page.getTotalElements(), offset, limit);
        }

        List<UUID> campaignIds = rows.stream().map(NotificationCampaign::getId).toList();
        Map<UUID, Long> readCounts = new HashMap<>();
        for (Object[] row : notificationRepository.countReadByCampaignIds(campaignIds)) {
            readCounts.put((UUID) row[0], ((Number) row[1]).longValue());
        }

        Set<UUID> creatorIds = rows.stream().map(NotificationCampaign::getCreatedBy)
                .filter(java.util.Objects::nonNull).collect(Collectors.toSet());
        Map<UUID, String> creatorNames = new HashMap<>();
        if (!creatorIds.isEmpty()) {
            userRepository.findAllById(creatorIds).forEach(u -> creatorNames.put(u.getId(), u.getFullName()));
        }

        Set<UUID> docIds = rows.stream().map(NotificationCampaign::getDocumentId)
                .filter(java.util.Objects::nonNull).collect(Collectors.toSet());
        Map<UUID, String> docTitles = new HashMap<>();
        if (!docIds.isEmpty()) {
            documentRepository.findAllById(docIds).forEach(d -> docTitles.put(d.getId(), d.getName()));
        }

        List<NotificationCampaignResponse> items = rows.stream()
                .map(c -> toResponse(
                        c,
                        readCounts.getOrDefault(c.getId(), 0L),
                        c.getCreatedBy() == null ? null : creatorNames.get(c.getCreatedBy()),
                        c.getDocumentId() == null ? null : docTitles.get(c.getDocumentId())))
                .toList();
        return new PageResponse<>(items, page.getTotalElements(), offset, limit);
    }

    @Override
    @Transactional(readOnly = true)
    public NotificationAudiencePreviewResponse previewAudience(Actor actor, String audienceType, List<UUID> clubIds) {
        String normalizedType = normalizeAudience(audienceType);
        List<UUID> recipients = resolveAuthorizedRecipients(actor, normalizedType, clubIds);
        return new NotificationAudiencePreviewResponse(normalizedType, recipients.size());
    }

    @Override
    @Transactional
    public NotificationCampaignResponse createAndSend(Actor actor, CreateNotificationCampaignRequest request) {
        String audienceType = normalizeAudience(request.audienceType());
        List<UUID> distinctClubIds = request.clubIds() == null ? List.of()
                : request.clubIds().stream().filter(java.util.Objects::nonNull).distinct().toList();
        List<UUID> recipientIds = resolveAuthorizedRecipients(actor, audienceType, distinctClubIds);
        if (recipientIds.isEmpty()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "NO_RECIPIENTS", "No active recipients match this audience");
        }

        String category = normalizeCategory(request.category());
        Document attachedDoc = null;
        if (request.documentId() != null) {
            attachedDoc = documentRepository.findById(request.documentId())
                    .filter(d -> !d.isDeleted())
                    .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "DOCUMENT_NOT_FOUND", "Document not found"));
            category = "DOCUMENT";
        }

        String title = fit(request.title().strip(), 160);
        String message = fit(request.message().strip(), 2000);
        boolean sendEmail = Boolean.TRUE.equals(request.sendEmail());

        NotificationCampaign campaign = new NotificationCampaign();
        campaign.setTitle(title);
        campaign.setMessage(message);
        campaign.setAudienceType(audienceType);
        campaign.setTargetClubIds(distinctClubIds.isEmpty() ? null
                : distinctClubIds.stream().map(UUID::toString).collect(Collectors.joining(",")));
        campaign.setCategory(category);
        campaign.setDocumentId(attachedDoc == null ? null : attachedDoc.getId());
        campaign.setSendEmail(sendEmail);
        campaign.setTotalRecipients(recipientIds.size());
        campaign.setDeliveredCount(0);
        campaign.setEmailQueuedCount(0);
        campaign.setStatus("PROCESSING");
        NotificationCampaign saved = campaignRepository.saveAndFlush(campaign);

        String refType = attachedDoc != null ? "DOCUMENT" : ("DOCUMENT".equals(category) ? "DOCUMENT" : "SYSTEM");
        UUID refId = attachedDoc != null
                ? (attachedDoc.getClub() != null ? attachedDoc.getClub().getId() : attachedDoc.getId())
                : saved.getId();

        int delivered = batchInsertNotifications(recipientIds, title, message, refType, refId, saved.getId());

        int emailQueued = 0;
        if (sendEmail && emailListener != null) {
            List<User> targets = userRepository.findAllById(recipientIds);
            emailQueued = emailListener.enqueueCampaignEmails(targets, title, message, refType);
        }

        saved.setDeliveredCount(delivered);
        saved.setEmailQueuedCount(emailQueued);
        saved.setStatus("COMPLETED");
        NotificationCampaign finalSaved = campaignRepository.saveAndFlush(saved);

        notifyOnlineRecipients(recipientIds);

        Map<String, Object> auditValues = new LinkedHashMap<>();
        auditValues.put("campaignId", finalSaved.getId());
        auditValues.put("audienceType", audienceType);
        auditValues.put("category", category);
        auditValues.put("title", title);
        auditValues.put("recipientCount", delivered);
        auditValues.put("sendEmail", sendEmail);
        auditValues.put("emailQueuedCount", emailQueued);
        auditService.record(actor.id(), AuditAction.NOTIFICATION_BROADCASTED, finalSaved.getId(), null, null, auditValues);

        String creatorName = userRepository.findById(actor.id()).map(User::getFullName).orElse(null);
        return toResponse(finalSaved, 0L, creatorName, attachedDoc == null ? null : attachedDoc.getName());
    }

    @Override
    @Transactional
    public NotificationCampaignRemindResponse remindUnread(Actor actor, UUID campaignId) {
        NotificationCampaign campaign = campaignRepository.findById(campaignId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "CAMPAIGN_NOT_FOUND", "Campaign not found"));

        boolean isGlobal = authorizationService.hasPermission(actor, PERMISSION_SEND, null, null);
        if (!isGlobal && !actor.id().equals(campaign.getCreatedBy())) {
            throw new ApiException(HttpStatus.FORBIDDEN, "PERMISSION_DENIED", "Permission denied");
        }

        List<UUID> unreadUserIds = notificationRepository.findUnreadUserIdsByCampaignId(campaignId);
        if (unreadUserIds.isEmpty()) {
            return new NotificationCampaignRemindResponse(campaignId, 0);
        }

        String remindTitle = fit("[Nhắc đọc] " + campaign.getTitle(), 160);
        String refType = campaign.getDocumentId() != null ? "DOCUMENT" : campaign.getCategory();
        UUID refId = campaign.getDocumentId() != null ? campaign.getDocumentId() : campaign.getId();
        int delivered = batchInsertNotifications(unreadUserIds, remindTitle, campaign.getMessage(), refType, refId, null);

        if (campaign.isSendEmail() && emailListener != null) {
            List<User> targets = userRepository.findAllById(unreadUserIds);
            emailListener.enqueueCampaignEmails(targets, remindTitle, campaign.getMessage(), refType);
        }
        notifyOnlineRecipients(unreadUserIds);

        auditService.record(actor.id(), AuditAction.NOTIFICATION_BROADCASTED, campaign.getId(), null, null,
                Map.of("type", "REMIND_UNREAD", "campaignId", campaign.getId(), "remindedCount", delivered));
        return new NotificationCampaignRemindResponse(campaignId, delivered);
    }

    private int batchInsertNotifications(
            List<UUID> recipientIds,
            String title,
            String message,
            String refType,
            UUID refId,
            UUID campaignId) {
        Timestamp nowTs = Timestamp.from(clock.instant());
        String sql = "INSERT INTO notifications (id, user_id, title, message, read, reference_type, reference_id, campaign_id, created_at, updated_at) "
                + "VALUES (?, ?, ?, ?, FALSE, ?, ?, ?, ?, ?)";
        int total = 0;
        for (int i = 0; i < recipientIds.size(); i += BATCH_CHUNK_SIZE) {
            List<UUID> chunk = recipientIds.subList(i, Math.min(i + BATCH_CHUNK_SIZE, recipientIds.size()));
            List<Object[]> batchArgs = new ArrayList<>(chunk.size());
            for (UUID uid : chunk) {
                batchArgs.add(new Object[]{
                        UUID.randomUUID(), uid, title, message, refType, refId, campaignId, nowTs, nowTs
                });
            }
            jdbcTemplate.batchUpdate(sql, batchArgs);
            total += chunk.size();
        }
        return total;
    }

    private void notifyOnlineRecipients(List<UUID> recipientIds) {
        if (eventPublisher == null || webSocketSessionTracker == null) return;
        Set<UUID> targetSet = new LinkedHashSet<>(recipientIds);
        OffsetDateTime now = OffsetDateTime.ofInstant(clock.instant(), ZoneOffset.UTC);
        for (var snap : webSocketSessionTracker.activeSessions()) {
            if (targetSet.contains(snap.userId())) {
                long unread = notificationRepository.countByUser_IdAndReadFalse(snap.userId());
                eventPublisher.publishEvent(new NotificationRealtimeEvent(
                        "NOTIFICATION_READ_SYNC", snap.userId(), null, unread, now));
            }
        }
    }

    private List<UUID> resolveAuthorizedRecipients(Actor actor, String audienceType, List<UUID> clubIds) {
        return switch (audienceType) {
            case "ALL_USERS" -> {
                authorizationService.require(actor, PERMISSION_SEND, null, null);
                yield userRepository.findAllActiveUserIds();
            }
            case "CLUB_LEADERS" -> {
                authorizationService.require(actor, PERMISSION_SEND, null, null);
                yield userRoleRepository.findActiveClubLeaderUserIds();
            }
            case "CLUBS" -> {
                if (clubIds == null || clubIds.isEmpty()) {
                    throw new ApiException(HttpStatus.BAD_REQUEST, "CLUB_IDS_REQUIRED", "Select at least one club");
                }
                for (UUID cid : clubIds) {
                    authorizationService.require(actor, PERMISSION_SEND, cid, null);
                }
                yield membershipRepository.findActiveUserIdsByClubIds(clubIds);
            }
            default -> throw new ApiException(HttpStatus.BAD_REQUEST, "INVALID_AUDIENCE", "Unsupported audience type");
        };
    }

    private boolean canSendInAnyClub(Actor actor) {
        return clubRepository.findAll().stream()
                .anyMatch(c -> authorizationService.hasPermission(actor, PERMISSION_SEND, c.getId(), null));
    }

    private static String normalizeAudience(String raw) {
        String upper = raw == null ? "" : raw.trim().toUpperCase(Locale.ROOT);
        if ("ALL_USERS".equals(upper) || "CLUB_LEADERS".equals(upper) || "CLUBS".equals(upper)) {
            return upper;
        }
        throw new ApiException(HttpStatus.BAD_REQUEST, "INVALID_AUDIENCE",
                "Audience must be ALL_USERS, CLUB_LEADERS, or CLUBS");
    }

    private static String normalizeCategory(String raw) {
        String upper = raw == null ? "SYSTEM" : raw.trim().toUpperCase(Locale.ROOT);
        return ("DOCUMENT".equals(upper) || "ANNOUNCEMENT".equals(upper)) ? upper : "SYSTEM";
    }

    private static List<UUID> parseClubIds(String csv) {
        if (csv == null || csv.isBlank()) return List.of();
        return Arrays.stream(csv.split(","))
                .map(String::trim)
                .filter(s -> !s.isEmpty())
                .map(UUID::fromString)
                .toList();
    }

    private static NotificationCampaignResponse toResponse(
            NotificationCampaign c, long readCount, String createdByName, String documentTitle) {
        return new NotificationCampaignResponse(
                c.getId(),
                c.getTitle(),
                c.getMessage(),
                c.getAudienceType(),
                parseClubIds(c.getTargetClubIds()),
                c.getCategory(),
                c.getDocumentId(),
                documentTitle,
                c.isSendEmail(),
                c.getTotalRecipients(),
                c.getDeliveredCount(),
                readCount,
                c.getEmailQueuedCount(),
                c.getStatus(),
                c.getCreatedBy(),
                createdByName,
                c.getCreatedAt());
    }

    private static String fit(String text, int max) {
        if (text == null || text.length() <= max) return text;
        return text.substring(0, max - 1) + "…";
    }
}
