package com.vju.club.mapper;

import com.vju.club.dto.record.NotificationRecord;
import com.vju.club.dto.response.NotificationResponse;
import com.vju.club.entity.Notification;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

@Mapper
public interface NotificationMapper {
    NotificationResponse toResponse(Notification notification);

    @Mapping(target = "userId", source = "user.id")
    NotificationRecord toRecord(Notification notification);
}
