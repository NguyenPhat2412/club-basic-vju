package com.vju.club.modules.notification.service.impl;

import com.vju.club.common.OffsetLimitRequest;
import com.vju.club.common.dto.PageResponse;
import com.vju.club.error.ApiException;
import com.vju.club.modules.audit.enums.AuditAction;
import com.vju.club.modules.audit.service.AuditService;
import com.vju.club.modules.club.entity.Club;
import com.vju.club.modules.club.repository.ClubRepository;
import com.vju.club.modules.department.entity.Department;
import com.vju.club.modules.department.repository.DepartmentRepository;
import com.vju.club.modules.departmentmember.repository.DepartmentMemberRepository;
import com.vju.club.modules.membership.repository.MembershipRepository;
import com.vju.club.modules.notification.dto.request.BroadcastNotificationRequest;
import com.vju.club.modules.notification.dto.response.NotificationBroadcastResponse;
import com.vju.club.modules.notification.dto.response.NotificationResponse;
import com.vju.club.modules.notification.entity.Notification;
import com.vju.club.modules.notification.mapper.NotificationMapper;
import com.vju.club.modules.notification.repository.NotificationRepository;
import com.vju.club.modules.notification.service.NotificationService;
import com.vju.club.modules.user.entity.User;
import com.vju.club.modules.user.repository.UserRepository;
import com.vju.club.security.Actor;
import com.vju.club.security.PermissionAuthorizationService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

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
    public void create(UUID userId, String title, String message, UUID referenceId) {
        User user = users.findById(userId).orElseThrow();
        Notification notification = new Notification();
        notification.setUser(user);
        notification.setTitle(title);
        notification.setMessage(message);
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
    @Transactional
    public void markRead(Actor actor, UUID id) {
        notifications.findById(id)
                .filter(n -> n.getUser().getId().equals(actor.id()))
                .ifPresent(n -> {
                    n.setRead(true);
                    notifications.save(n);
                });
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
            create(recipientId, title, message, club.getId());
        }

        Map<String, Object> auditValues = new LinkedHashMap<>();
        auditValues.put("title", title);
        auditValues.put("departmentId", departmentId);
        auditValues.put("recipientCount", recipientIds.size());
        auditService.record(actor.id(), AuditAction.NOTIFICATION_BROADCASTED, club.getId(), club.getId(), null, auditValues);

        return new NotificationBroadcastResponse(club.getId(), departmentId, recipientIds.size());
    }
}
