package com.vju.club.mapper;

import com.vju.club.dto.response.SystemSettingsResponse;
import com.vju.club.entity.SystemSettings;
import org.mapstruct.Mapper;

@Mapper
public interface SystemSettingsMapper {
    SystemSettingsResponse toResponse(SystemSettings settings);
}

