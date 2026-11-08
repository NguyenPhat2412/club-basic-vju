package com.vju.club.service.impl;

import com.vju.club.common.EventConstants;
import com.vju.club.common.OffsetLimitRequest;
import com.vju.club.common.TaskConstants;
import com.vju.club.dto.request.BroadcastNotificationRequest;
import com.vju.club.dto.request.ResourceNotificationRequest;
import com.vju.club.dto.response.NotificationBroadcastResponse;
import com.vju.club.dto.response.NotificationResponse;
import com.vju.club.dto.response.PageResponse;
import com.vju.club.dto.response.ResourceNotificationResponse;
import com.vju.club.entity.Club;
import com.vju.club.entity.Department;
import com.vju.club.entity.Event;
import com.vju.club.entity.Notification;
import com.vju.club.entity.Task;
import com.vju.club.entity.User;
import com.vju.club.enums.AuditAction;
import com.vju.club.enums.ClubStatus;
import com.vju.club.enums.TaskStatus;
import com.vju.club.error.ApiException;
import com.vju.club.mapper.NotificationMapper;
import com.vju.club.repository.ClubRepository;
import com.vju.club.repository.DepartmentMemberRepository;
import com.vju.club.repository.DepartmentRepository;
import com.vju.club.repository.EventRegistrationRepository;
import com.vju.club.repository.EventRepository;
import com.vju.club.repository.MembershipRepository;
import com.vju.club.repository.NotificationRepository;
import com.vju.club.repository.TaskRepository;
import com.vju.club.repository.UserRepository;
import com.vju.club.security.Actor;
import com.vju.club.security.PermissionAuthorizationService;
import com.vju.club.service.AuditService;
import com.vju.club.service.NotificationService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
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
    private final EventRepository eventRepository;
    private final EventRegistrationRepository eventRegistrationRepository;
    private final TaskRepository taskRepository;
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

    @Override
    @Transactional
    public ResourceNotificationResponse notifyEventParticipants(Actor actor, UUID eventId, ResourceNotificationRequest request) {
        Event event = eventRepository.findWithRelationsById(eventId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "EVENT_NOT_FOUND", "Event not found"));
        UUID clubId = event.getClub().getId();
        if (event.getClub().getStatus() != ClubStatus.ACTIVE) {
            throw new ApiException(HttpStatus.CONFLICT, "CLUB_INACTIVE", "Club is inactive");
        }
        UUID deptId = event.getDepartment() == null ? null : event.getDepartment().getId();
        boolean allowed = authorizationService.hasPermission(actor, PERMISSION_SEND, clubId, deptId)
                || authorizationService.hasPermission(actor, EventConstants.PERMISSION_UPDATE, clubId, deptId);
        if (!allowed) {
            throw new ApiException(HttpStatus.FORBIDDEN, "PERMISSION_DENIED", "Permission denied");
        }

        Set<UUID> recipientIds = new LinkedHashSet<>(eventRegistrationRepository.findRegisteredUserIds(event.getId()));
        String title = fit(request.title().strip(), 160);
        String message = fit(request.message().strip(), 2000);
        String eventKey = request.idempotencyKey() != null && !request.idempotencyKey().isBlank()
                ? fit("EVENT_NOTIFY:" + event.getId() + ":" + request.idempotencyKey().strip(), 120)
                : null;

        int delivered = deliverToRecipients(recipientIds, title, message, "EVENT", event.getId(), eventKey);

        Map<String, Object> auditValues = new LinkedHashMap<>();
        auditValues.put("referenceType", "EVENT");
        auditValues.put("eventId", event.getId());
        auditValues.put("title", title);
        auditValues.put("recipientCount", delivered);
        auditService.record(actor.id(), AuditAction.NOTIFICATION_BROADCASTED, event.getId(), clubId, null, auditValues);

        return new ResourceNotificationResponse("EVENT", event.getId(), clubId, delivered);
    }

    @Override
    @Transactional
    public ResourceNotificationResponse notifyTaskAssignees(Actor actor, UUID taskId, ResourceNotificationRequest request) {
        Task task = taskRepository.findWithRelationsById(taskId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "TASK_NOT_FOUND", "Task not found"));
        UUID clubId = task.getClub().getId();
        if (task.getClub().getStatus() != ClubStatus.ACTIVE) {
            throw new ApiException(HttpStatus.CONFLICT, "CLUB_INACTIVE", "Club is inactive");
        }
        UUID deptId = task.getDepartment() == null ? null : task.getDepartment().getId();
        boolean allowed = task.getAssigner().getId().equals(actor.id())
                || authorizationService.hasPermission(actor, TaskConstants.PERMISSION_UPDATE, clubId, deptId)
                || authorizationService.hasPermission(actor, TaskConstants.PERMISSION_CREATE, clubId, deptId)
                || authorizationService.hasPermission(actor, PERMISSION_SEND, clubId, deptId);
        if (!allowed) {
            throw new ApiException(HttpStatus.FORBIDDEN, "PERMISSION_DENIED", "Permission denied");
        }

        Set<UUID> recipientIds = new LinkedHashSet<>();
        recipientIds.add(task.getAssignee().getId());
        if (Boolean.TRUE.equals(request.includeSubtasks())) {
            for (Task subtask : taskRepository.findByParentTask_Id(task.getId())) {
                if (subtask.getStatus() != TaskStatus.CANCELLED && subtask.getStatus() != TaskStatus.COMPLETED) {
                    recipientIds.add(subtask.getAssignee().getId());
                }
            }
        }

        String title = fit(request.title().strip(), 160);
        String message = fit(request.message().strip(), 2000);
        String eventKey = request.idempotencyKey() != null && !request.idempotencyKey().isBlank()
                ? fit("TASK_NOTIFY:" + task.getId() + ":" + request.idempotencyKey().strip(), 120)
                : null;

        int delivered = deliverToRecipients(recipientIds, title, message, "TASK", task.getId(), eventKey);

        Map<String, Object> auditValues = new LinkedHashMap<>();
        auditValues.put("referenceType", "TASK");
        auditValues.put("taskId", task.getId());
        auditValues.put("title", title);
        auditValues.put("recipientCount", delivered);
        auditService.record(actor.id(), AuditAction.NOTIFICATION_BROADCASTED, task.getId(), clubId, null, auditValues);

        return new ResourceNotificationResponse("TASK", task.getId(), clubId, delivered);
    }

    private int deliverToRecipients(Set<UUID> recipientIds, String title, String message,
                                    String referenceType, UUID referenceId, String eventKey) {
        int delivered = 0;
        for (UUID recipientId : recipientIds) {
            if (eventKey != null) {
                delivered += notifications.insertIdempotent(recipientId, title, message, referenceType, referenceId, eventKey);
            } else {
                create(recipientId, title, message, referenceType, referenceId, null);
                delivered++;
            }
        }
        return delivered;
    }

    static String fit(String text, int max) {
        if (text == null || text.length() <= max) return text;
        return text.substring(0, max - 1) + "…";
    }
}
