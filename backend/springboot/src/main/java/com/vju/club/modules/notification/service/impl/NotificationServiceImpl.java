package com.vju.club.modules.notification.service.impl;

import lombok.RequiredArgsConstructor;
import com.vju.club.modules.notification.mapper.NotificationMapper;
import com.vju.club.modules.notification.dto.response.NotificationResponse;

import com.vju.club.modules.notification.service.NotificationService;

import com.vju.club.common.dto.PageResponse;
import com.vju.club.common.OffsetLimitRequest;
import com.vju.club.modules.notification.entity.Notification;
import com.vju.club.modules.user.entity.User;
import com.vju.club.modules.notification.repository.NotificationRepository;
import com.vju.club.modules.user.repository.UserRepository;
import com.vju.club.security.Actor;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class NotificationServiceImpl implements NotificationService {
    private final NotificationRepository notifications;
    private final UserRepository users;
    private final NotificationMapper notificationMapper;
    @Transactional
    public void create(UUID userId, String title, String message, UUID referenceId) {
        User user = users.findById(userId).orElseThrow();
        Notification notification = new Notification(); notification.setUser(user); notification.setTitle(title); notification.setMessage(message); notification.setReferenceId(referenceId); notification.setRead(false); notifications.save(notification);
    }

    @Transactional(readOnly = true)
    public PageResponse<NotificationResponse> list(Actor actor, int offset, int limit) {
        var page = notifications.findByUser_IdOrderByCreatedAtDesc(actor.id(),
                new OffsetLimitRequest(offset, limit, Sort.by(Sort.Direction.DESC, "createdAt")));
        return new PageResponse<>(page.getContent().stream().map(notificationMapper::toResponse).toList(), page.getTotalElements(), offset, limit);
    }

    @Transactional
    public void markRead(Actor actor, UUID id) { notifications.findById(id).filter(n -> n.getUser().getId().equals(actor.id())).ifPresent(n -> { n.setRead(true); notifications.save(n); }); }
}
