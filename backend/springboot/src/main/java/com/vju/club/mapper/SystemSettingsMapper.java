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
    @Mapping(
            target = "facebookAppSecretConfigured",
            expression = "java(settings.getFacebookAppSecret() != null && !settings.getFacebookAppSecret().isBlank())")
    @Mapping(
            target = "facebookOauthConfigured",
            expression = "java(settings.getFacebookAppId() != null && !settings.getFacebookAppId().isBlank() && settings.getFacebookAppSecret() != null && !settings.getFacebookAppSecret().isBlank())")
    @Mapping(
            target = "aiApiKeyConfigured",
            expression = "java(settings.getAiApiKey() != null && !settings.getAiApiKey().isBlank())")
    @Mapping(
            target = "aiConfigured",
            expression = "java(settings.getAiBaseUrl() != null && !settings.getAiBaseUrl().isBlank() && settings.getAiApiKey() != null && !settings.getAiApiKey().isBlank())")
    @Mapping(
            target = "googleSignInConfigured",
            expression = "java(settings.getGoogleClientId() != null && !settings.getGoogleClientId().isBlank())")
    SystemSettingsResponse toResponse(SystemSettings settings);
}
