package com.vju.club.config;

import com.vju.club.entity.SystemSettings;
import com.vju.club.repository.SystemSettingsRepository;
import com.vju.club.security.TokenCryptoService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

import java.util.Arrays;
import java.util.List;
import java.util.Locale;

/**
 * Resolves live integration configuration (Facebook OAuth, AI Gateway, Google Sign-In)
 * by preferring values stored in {@code system_settings} and falling back to {@code .env} properties.
 */
@Component
@Slf4j
@RequiredArgsConstructor
public class RuntimeIntegrationConfig {
    private final SystemSettingsRepository settingsRepository;
    private final FacebookProperties facebookProperties;
    private final AiProperties aiProperties;
    private final GoogleSignInProperties googleProperties;

    @Autowired(required = false)
    private TelegramProperties telegramProperties;

    @Autowired(required = false)
    private TokenCryptoService tokenCryptoService;

    public record EffectiveFacebook(
            String appId,
            String appSecret,
            String graphVersion,
            String graphBaseUrl,
            String oauthRedirectUri,
            String frontendBaseUrl) {
        public boolean isOauthConfigured() {
            return hasText(appId) && hasText(appSecret);
        }
    }

    public record EffectiveAi(String baseUrl, String apiKey, String model) {
        public boolean isConfigured() {
            return hasText(baseUrl) && hasText(apiKey);
        }
    }

    public record EffectiveGoogle(String clientId, List<String> allowedDomains, boolean createAccounts) {
        public boolean isEnabled() {
            return hasText(clientId);
        }

        public boolean isGoogleEmail(String email) {
            if (!isEnabled() || email == null) return false;
            int at = email.lastIndexOf('@');
            if (at < 0) return false;
            String domain = email.substring(at + 1).trim().toLowerCase(Locale.ROOT);
            return allowedDomains.stream().anyMatch(allowed -> allowed.equals(domain));
        }
    }

    public EffectiveFacebook facebook() {
        SystemSettings s = loadSettings();
        String appId = firstText(s == null ? null : s.getFacebookAppId(), facebookProperties.getAppId());
        String appSecret = firstText(decryptOrNull(s == null ? null : s.getFacebookAppSecret()), facebookProperties.getAppSecret());
        String graphVersion = firstText(s == null ? null : s.getFacebookGraphVersion(), facebookProperties.getGraphVersion(), "v22.0");
        String graphBaseUrl = firstText(facebookProperties.getGraphBaseUrl(), "https://graph.facebook.com");
        String redirectUri = firstText(s == null ? null : s.getFacebookOauthRedirectUri(), facebookProperties.getOauthRedirectUri());
        String frontendBase = firstText(s == null ? null : s.getFrontendBaseUrl(), facebookProperties.getFrontendBaseUrl(), "http://localhost:3000");
        return new EffectiveFacebook(appId, appSecret, graphVersion, graphBaseUrl, redirectUri, frontendBase);
    }

    public EffectiveAi ai() {
        SystemSettings s = loadSettings();
        String baseUrl = firstText(s == null ? null : s.getAiBaseUrl(), aiProperties.getBaseUrl());
        String apiKey = firstText(decryptOrNull(s == null ? null : s.getAiApiKey()), aiProperties.getApiKey());
        String model = firstText(s == null ? null : s.getAiModel(), aiProperties.getModel(), "apmarket");
        return new EffectiveAi(baseUrl, apiKey, model);
    }

    public EffectiveGoogle google() {
        SystemSettings s = loadSettings();
        String clientId = firstText(s == null ? null : s.getGoogleClientId(), googleProperties.getClientId());
        List<String> domains = parseDomains(s == null ? null : s.getGoogleAllowedDomains(), googleProperties.getAllowedDomains());
        boolean createAccounts = s != null && s.getGoogleCreateAccounts() != null
                ? s.getGoogleCreateAccounts()
                : googleProperties.isCreateAccounts();
        return new EffectiveGoogle(clientId, domains, createAccounts);
    }

    public record EffectiveTelegram(
            boolean enabled,
            String botToken,
            String chatId,
            String threadId,
            String apiBaseUrl,
            boolean alertOnFailedLogin,
            int failedLoginThreshold,
            boolean alertOnRateLimit,
            boolean alertOnAdminLogin,
            boolean alertOnSettingsChange,
            boolean alertOnServerError,
            boolean alertOnBroadcast,
            int cooldownSeconds) {
        public boolean isConfigured() {
            return hasText(botToken) && hasText(chatId);
        }

        public boolean isActive() {
            return enabled && isConfigured();
        }
    }

    public EffectiveTelegram telegram() {
        SystemSettings s = loadSettings();
        String envToken = telegramProperties == null ? null : telegramProperties.getBotToken();
        String envChatId = telegramProperties == null ? null : telegramProperties.getChatId();
        String envThreadId = telegramProperties == null ? null : telegramProperties.getThreadId();
        String apiBase = firstText(
                telegramProperties == null ? null : telegramProperties.getApiBaseUrl(),
                "https://api.telegram.org");
        boolean envEnabled = telegramProperties != null && telegramProperties.isEnabled();

        String botToken = firstText(decryptOrNull(s == null ? null : s.getTelegramBotToken()), envToken);
        String chatId = firstText(s == null ? null : s.getTelegramChatId(), envChatId);
        String threadId = firstText(s == null ? null : s.getTelegramThreadId(), envThreadId);
        boolean enabled = s != null ? (s.isTelegramEnabled() || envEnabled) : envEnabled;
        boolean alertOnFailedLogin = s == null || s.isTelegramAlertOnFailedLogin();
        int failedLoginThreshold = s == null ? 5 : Math.max(2, s.getTelegramFailedLoginThreshold());
        boolean alertOnRateLimit = s == null || s.isTelegramAlertOnRateLimit();
        boolean alertOnAdminLogin = s == null || s.isTelegramAlertOnAdminLogin();
        boolean alertOnSettingsChange = s == null || s.isTelegramAlertOnSettingsChange();
        boolean alertOnServerError = s == null || s.isTelegramAlertOnServerError();
        boolean alertOnBroadcast = s == null || s.isTelegramAlertOnBroadcast();
        int cooldownSeconds = s == null ? 180 : Math.max(10, s.getTelegramCooldownSeconds());
        return new EffectiveTelegram(
                enabled,
                botToken,
                chatId,
                threadId,
                apiBase,
                alertOnFailedLogin,
                failedLoginThreshold,
                alertOnRateLimit,
                alertOnAdminLogin,
                alertOnSettingsChange,
                alertOnServerError,
                alertOnBroadcast,
                cooldownSeconds);
    }

    private SystemSettings loadSettings() {
        try {
            return settingsRepository == null ? null : settingsRepository.findSingleton().orElse(null);
        } catch (RuntimeException e) {
            log.debug("Could not read system_settings overrides, falling back to environment properties: {}", e.getMessage());
            return null;
        }
    }

    private String decryptOrNull(String stored) {
        if (!hasText(stored)) return null;
        if (stored.startsWith("enc:v1:")) {
            if (tokenCryptoService == null) return null;
            try {
                return tokenCryptoService.decrypt(stored);
            } catch (RuntimeException e) {
                log.warn("Failed to decrypt stored integration secret in system_settings: {}", e.getMessage());
                return null;
            }
        }
        return stored.trim();
    }

    private static List<String> parseDomains(String rawOverride, List<String> fallback) {
        if (hasText(rawOverride)) {
            List<String> parsed = Arrays.stream(rawOverride.split("[,\\s]+"))
                    .map(v -> v.trim().toLowerCase(Locale.ROOT))
                    .filter(v -> !v.isEmpty())
                    .distinct()
                    .toList();
            if (!parsed.isEmpty()) return parsed;
        }
        if (fallback == null) return List.of();
        return fallback.stream()
                .map(v -> v == null ? "" : v.trim().toLowerCase(Locale.ROOT))
                .filter(v -> !v.isEmpty())
                .distinct()
                .toList();
    }

    private static String firstText(String... candidates) {
        for (String c : candidates) {
            if (hasText(c)) return c.trim();
        }
        return "";
    }

    private static boolean hasText(String value) {
        return value != null && !value.isBlank();
    }
}
