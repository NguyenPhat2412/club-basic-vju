package com.vju.club.service;

import com.vju.club.dto.response.PageResponse;
import com.vju.club.dto.request.BroadcastNotificationRequest;
import com.vju.club.dto.response.NotificationBroadcastResponse;
import com.vju.club.dto.response.NotificationResponse;
import com.vju.club.security.Actor;

import java.util.UUID;

public interface NotificationService {
    default void create(UUID userId, String title, String message, UUID referenceId) {
        create(userId, title, message, null, referenceId, null);
    }

    void create(UUID userId, String title, String message, String referenceType, UUID referenceId, String eventKey);

    PageResponse<NotificationResponse> list(Actor actor, int offset, int limit);

    NotificationResponse get(Actor actor, UUID id);

    void markRead(Actor actor, UUID id);

    void markAllRead(Actor actor);

    NotificationBroadcastResponse broadcast(Actor actor, UUID clubId, BroadcastNotificationRequest request);
}
