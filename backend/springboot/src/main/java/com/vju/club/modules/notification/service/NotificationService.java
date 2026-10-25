package com.vju.club.modules.notification.service;

import com.vju.club.modules.notification.dto.response.NotificationResponse;

import com.vju.club.common.dto.PageResponse;
import com.vju.club.common.OffsetLimitRequest;
import com.vju.club.modules.notification.entity.Notification;
import com.vju.club.modules.user.entity.User;
import com.vju.club.modules.notification.repository.NotificationRepository;
import com.vju.club.modules.user.repository.UserRepository;
import com.vju.club.security.Actor;
import org.springframework.data.domain.Sort;
import java.util.UUID;

public interface NotificationService {
    void create(UUID userId, String title, String message, UUID referenceId);

    PageResponse<NotificationResponse> list(Actor actor, int offset, int limit);

    void markRead(Actor actor, UUID id);
}
