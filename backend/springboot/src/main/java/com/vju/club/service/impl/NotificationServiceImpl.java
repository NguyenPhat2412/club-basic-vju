package com.vju.club.service.impl;

import com.vju.club.common.OffsetLimitRequest;
import com.vju.club.dto.response.PageResponse;
import com.vju.club.error.ApiException;
import com.vju.club.enums.AuditAction;
import com.vju.club.service.AuditService;
import com.vju.club.entity.Club;
import com.vju.club.repository.ClubRepository;
import com.vju.club.entity.Department;
import com.vju.club.repository.DepartmentRepository;
import com.vju.club.repository.DepartmentMemberRepository;
import com.vju.club.repository.MembershipRepository;
import com.vju.club.dto.request.BroadcastNotificationRequest;
import com.vju.club.dto.response.NotificationBroadcastResponse;
import com.vju.club.dto.response.NotificationResponse;
import com.vju.club.entity.Notification;
import com.vju.club.mapper.NotificationMapper;
import com.vju.club.repository.NotificationRepository;
import com.vju.club.service.NotificationService;
import com.vju.club.entity.User;
import com.vju.club.repository.UserRepository;
import com.vju.club.security.Actor;
import com.vju.club.security.PermissionAuthorizationService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.vju.club.enums.ClubStatus;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class NotificationServiceImpl implements NotificationService {
    private static final String PERMISSION_SEND = "notification.send";

    private final NotificationRepository notifications;
    private final UserRepository users;
    private final ClubRepository clubRepository;
    private final DepartmentRepository departmentRepository;
    private final MembershipRepository membershipRepository;
    private final DepartmentMemberRepository departmentMemberRepository;
    private final PermissionAuthorizationService authorizationService;
    private final AuditService auditService;
    private final NotificationMapper notificationMapper;

    @Override
    @Transactional
    public void create(UUID userId, String title, String message, String referenceType, UUID referenceId, String eventKey) {
        String safeTitle = fit(title, 160);
        String safeMessage = fit(message, 2000);
        String normalizedRefType = referenceType != null && !referenceType.isBlank() ? fit(referenceType.strip(), 40) : null;
        String normalizedEventKey = eventKey != null && !eventKey.isBlank() ? fit(eventKey.strip(), 120) : null;

        if (normalizedEventKey != null) {
            if (!users.existsById(userId)) {
                throw new ApiException(HttpStatus.NOT_FOUND, "USER_NOT_FOUND", "User not found");
            }
            notifications.insertIdempotent(userId, safeTitle, safeMessage, normalizedRefType, referenceId, normalizedEventKey);
            return;
        }

        User user = users.findById(userId).orElseThrow();
        Notification notification = new Notification();
        notification.setUser(user);
        notification.setTitle(safeTitle);
        notification.setMessage(safeMessage);
        notification.setReferenceType(normalizedRefType);
        notification.setReferenceId(referenceId);
        notification.setRead(false);
        notifications.save(notification);
    }

    @Override
    @Transactional(readOnly = true)
    public PageResponse<NotificationResponse> list(Actor actor, int offset, int limit) {
        var page = notifications.findByUser_IdOrderByCreatedAtDesc(actor.id(),
                new OffsetLimitRequest(offset, limit, Sort.by(Sort.Direction.DESC, "createdAt")));
        return new PageResponse<>(page.getContent().stream().map(notificationMapper::toResponse).toList(),
                page.getTotalElements(), offset, limit);
    }

    @Override
    @Transactional(readOnly = true)
    public NotificationResponse get(Actor actor, UUID id) {
        Notification notification = notifications.findByIdAndUser_Id(id, actor.id())
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "NOTIFICATION_NOT_FOUND", "Notification not found"));
        return notificationMapper.toResponse(notification);
    }

    @Override
    @Transactional
    public void markRead(Actor actor, UUID id) {
        Notification notification = notifications.findByIdAndUser_Id(id, actor.id())
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "NOTIFICATION_NOT_FOUND", "Notification not found"));
        if (!notification.isRead()) {
            notification.setRead(true);
            notifications.save(notification);
        }
    }

    @Override
    @Transactional
    public void markAllRead(Actor actor) {
        notifications.markAllReadByUserId(actor.id());
    }

    @Override
    @Transactional
    public NotificationBroadcastResponse broadcast(Actor actor, UUID clubId, BroadcastNotificationRequest request) {
        Club club = clubRepository.findById(clubId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "CLUB_NOT_FOUND", "Club not found"));
        if (club.getStatus() != ClubStatus.ACTIVE) {
            throw new ApiException(HttpStatus.CONFLICT, "CLUB_INACTIVE", "Club is inactive");
        }
        UUID departmentId = request.departmentId();
        List<UUID> recipientIds;
        if (departmentId == null) {
            authorizationService.require(actor, PERMISSION_SEND, club.getId(), null);
            recipientIds = membershipRepository.findActiveUserIdsByClubId(club.getId());
        } else {
            Department department = departmentRepository.findById(departmentId)
                    .filter(d -> d.getClub().getId().equals(club.getId()))
                    .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "DEPARTMENT_NOT_FOUND", "Department not found in club"));
            authorizationService.require(actor, PERMISSION_SEND, club.getId(), department.getId());
            recipientIds = departmentMemberRepository.findActiveUserIdsByDepartmentId(department.getId());
        }

        String title = request.title().strip();
        String message = request.message().strip();
        for (UUID recipientId : recipientIds) {
            create(recipientId, title, message, "CLUB", club.getId(), null);
        }

        Map<String, Object> auditValues = new LinkedHashMap<>();
        auditValues.put("title", title);
        auditValues.put("departmentId", departmentId);
        auditValues.put("recipientCount", recipientIds.size());
        auditService.record(actor.id(), AuditAction.NOTIFICATION_BROADCASTED, club.getId(), club.getId(), null, auditValues);

        return new NotificationBroadcastResponse(club.getId(), departmentId, recipientIds.size());
    }

    static String fit(String text, int max) {
        if (text == null || text.length() <= max) return text;
        return text.substring(0, max - 1) + "…";
    }
}
