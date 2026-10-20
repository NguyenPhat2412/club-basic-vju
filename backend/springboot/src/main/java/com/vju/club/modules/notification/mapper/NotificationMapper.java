package com.vju.club.modules.notification.mapper;

import com.vju.club.modules.notification.dto.record.NotificationRecord;
import com.vju.club.modules.notification.dto.response.NotificationResponse;
import com.vju.club.modules.notification.entity.Notification;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

@Mapper
public interface NotificationMapper {
    NotificationResponse toResponse(Notification notification);

    @Mapping(target = "userId", source = "user.id")
    NotificationRecord toRecord(Notification notification);
}
