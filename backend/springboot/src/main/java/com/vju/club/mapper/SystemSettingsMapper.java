package com.vju.club.mapper;

import com.vju.club.dto.response.SystemSettingsResponse;
import com.vju.club.entity.SystemSettings;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

@Mapper
public interface SystemSettingsMapper {
    @Mapping(
            target = "smtpPasswordConfigured",
            expression = "java(settings.getSmtpPassword() != null && !settings.getSmtpPassword().isBlank())")
    SystemSettingsResponse toResponse(SystemSettings settings);
}
