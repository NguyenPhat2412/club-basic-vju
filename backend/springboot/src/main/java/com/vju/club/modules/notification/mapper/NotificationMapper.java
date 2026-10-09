package com.vju.club.modules.notification.mapper;

import com.vju.club.modules.notification.dto.response.NotificationResponse;
import com.vju.club.modules.notification.entity.Notification;
import org.mapstruct.Mapper;

@Mapper
public interface NotificationMapper {
    NotificationResponse toResponse(Notification notification);
}
