package com.vju.club.modules.notification.service;

import com.vju.club.common.dto.PageResponse;
import com.vju.club.modules.notification.dto.request.BroadcastNotificationRequest;
import com.vju.club.modules.notification.dto.response.NotificationBroadcastResponse;
import com.vju.club.modules.notification.dto.response.NotificationResponse;
import com.vju.club.security.Actor;

import java.util.UUID;

public interface NotificationService {
    void create(UUID userId, String title, String message, UUID referenceId);

    PageResponse<NotificationResponse> list(Actor actor, int offset, int limit);

    void markRead(Actor actor, UUID id);

    void markAllRead(Actor actor);

    NotificationBroadcastResponse broadcast(Actor actor, UUID clubId, BroadcastNotificationRequest request);
}
