package com.vju.club.notification;

import com.vju.club.common.dto.PageResponse;
import com.vju.club.common.OffsetLimitRequest;
import com.vju.club.entity.Notification;
import com.vju.club.entity.User;
import com.vju.club.repository.NotificationRepository;
import com.vju.club.repository.UserRepository;
import com.vju.club.security.Actor;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.UUID;

@Service
public class NotificationService {
    private final NotificationRepository notifications;
    private final UserRepository users;
    public NotificationService(NotificationRepository notifications, UserRepository users) { this.notifications = notifications; this.users = users; }

    @Transactional
    public void create(UUID userId, String title, String message, UUID referenceId) {
        User user = users.findById(userId).orElseThrow();
        Notification notification = new Notification(); notification.setUser(user); notification.setTitle(title); notification.setMessage(message); notification.setReferenceId(referenceId); notification.setRead(false); notifications.save(notification);
    }

    @Transactional(readOnly = true)
    public PageResponse<NotificationResponse> list(Actor actor, int offset, int limit) {
        var page = notifications.findByUser_IdOrderByCreatedAtDesc(actor.id(),
                new OffsetLimitRequest(offset, limit, Sort.by(Sort.Direction.DESC, "createdAt")));
        return new PageResponse<>(page.getContent().stream().map(NotificationResponse::from).toList(), page.getTotalElements(), offset, limit);
    }

    @Transactional
    public void markRead(Actor actor, UUID id) { notifications.findById(id).filter(n -> n.getUser().getId().equals(actor.id())).ifPresent(n -> { n.setRead(true); notifications.save(n); }); }
}
