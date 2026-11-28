package com.vju.club.service.impl;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.vju.club.config.RuntimeIntegrationConfig;
import com.vju.club.error.ApiException;
import com.vju.club.service.TelegramAlertService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

@Service
@Slf4j
@RequiredArgsConstructor
public class TelegramAlertServiceImpl implements TelegramAlertService {
    private static final ObjectMapper JSON = new ObjectMapper();
    private static final DateTimeFormatter VN_TIME =
            DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss 'ICT'").withZone(ZoneId.of("Asia/Ho_Chi_Minh"));
    private static final int MAX_COOLDOWN_ENTRIES = 2_000;

    private final RuntimeIntegrationConfig runtimeIntegrationConfig;
    private final Clock clock;

    private final HttpClient httpClient = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(5))
            .build();
    private final ExecutorService executor = Executors.newSingleThreadExecutor(r -> {
        Thread t = new Thread(r, "telegram-alert-sender");
        t.setDaemon(true);
        return t;
    });
    private final ConcurrentHashMap<String, Instant> lastSentByKey = new ConcurrentHashMap<>();

    @Override
    public void sendTestMessage(String triggeredByEmail, String ipAddress) {
        RuntimeIntegrationConfig.EffectiveTelegram cfg = runtimeIntegrationConfig.telegram();
        if (!cfg.isConfigured()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "TELEGRAM_NOT_CONFIGURED",
                    "Telegram Bot Token and Chat ID must be configured first");
        }
        String text = """
                <b>[VJU ClubHub] Kiểm tra kết nối Telegram thành công</b>
                • Thực hiện bởi: <code>%s</code>
                • Địa chỉ IP: <code>%s</code>
                • Thời gian: <code>%s</code>
                • Trạng thái cảnh báo: <b>%s</b>"""
                .formatted(
                        escapeHtml(triggeredByEmail == null ? "admin" : triggeredByEmail),
                        escapeHtml(ipAddress == null ? "unknown" : ipAddress),
                        VN_TIME.format(clock.instant()),
                        cfg.enabled() ? "Đang bật" : "Đang tắt (chỉ thử kết nối)");
        dispatchSync(cfg, text, true);
    }

    @Override
    public void sendAlertAsync(String dedupeKey, String title, String htmlBody) {
        RuntimeIntegrationConfig.EffectiveTelegram cfg = runtimeIntegrationConfig.telegram();
        if (!cfg.isActive()) {
            return;
        }
        Instant now = clock.instant();
        if (dedupeKey != null && !dedupeKey.isBlank()) {
            evictStaleIfNeeded(now, cfg.cooldownSeconds());
            Instant previous = lastSentByKey.get(dedupeKey);
            if (previous != null && previous.plusSeconds(cfg.cooldownSeconds()).isAfter(now)) {
                return;
            }
            lastSentByKey.put(dedupeKey, now);
        }
        String text = "<b>[VJU ClubHub] " + escapeHtml(title) + "</b>\n"
                + htmlBody
                + "\n• Thời gian: <code>" + VN_TIME.format(now) + "</code>";
        CompletableFuture.runAsync(() -> dispatchSync(cfg, text, false), executor);
    }

    private void dispatchSync(RuntimeIntegrationConfig.EffectiveTelegram cfg, String text, boolean throwOnError) {
        try {
            String baseUrl = cfg.apiBaseUrl().endsWith("/")
                    ? cfg.apiBaseUrl().substring(0, cfg.apiBaseUrl().length() - 1)
                    : cfg.apiBaseUrl();
            URI uri = URI.create(baseUrl + "/bot" + cfg.botToken() + "/sendMessage");

            Map<String, Object> payload = new LinkedHashMap<>();
            payload.put("chat_id", cfg.chatId());
            payload.put("text", text);
            payload.put("parse_mode", "HTML");
            payload.put("disable_web_page_preview", true);
            if (cfg.threadId() != null && !cfg.threadId().isBlank()) {
                try {
                    payload.put("message_thread_id", Long.parseLong(cfg.threadId().trim()));
                } catch (NumberFormatException ignored) {
                    // Ignore non-numeric thread id gracefully
                }
            }

            HttpRequest request = HttpRequest.newBuilder(uri)
                    .timeout(Duration.ofSeconds(6))
                    .header("Content-Type", "application/json")
                    .POST(HttpRequest.BodyPublishers.ofString(JSON.writeValueAsString(payload)))
                    .build();

            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() < 200 || response.statusCode() >= 300) {
                String description = extractTelegramError(response.body());
                log.warn("Telegram API returned HTTP {}: {}", response.statusCode(), description);
                if (throwOnError) {
                    throw new ApiException(HttpStatus.BAD_GATEWAY, "TELEGRAM_DELIVERY_FAILED",
                            "Telegram rejected the message: " + description);
                }
            }
        } catch (ApiException e) {
            throw e;
        } catch (Exception e) {
            log.warn("Failed to deliver Telegram alert: {}", e.getMessage());
            if (throwOnError) {
                throw new ApiException(HttpStatus.BAD_GATEWAY, "TELEGRAM_DELIVERY_FAILED",
                        "Could not reach Telegram API: " + e.getMessage());
            }
        }
    }

    private void evictStaleIfNeeded(Instant now, int cooldownSeconds) {
        if (lastSentByKey.size() < MAX_COOLDOWN_ENTRIES) return;
        Instant cutoff = now.minusSeconds(Math.max(60L, cooldownSeconds));
        lastSentByKey.entrySet().removeIf(entry -> entry.getValue().isBefore(cutoff));
    }

    private static String extractTelegramError(String body) {
        if (body == null || body.isBlank()) return "Empty response";
        try {
            JsonNode node = JSON.readTree(body);
            if (node.hasNonNull("description")) {
                return node.get("description").asText();
            }
        } catch (Exception ignored) {
        }
        return body.length() > 160 ? body.substring(0, 160) : body;
    }

    public static String escapeHtml(String value) {
        if (value == null) return "";
        return value.replace("&", "&amp;")
                .replace("<", "&lt;")
                .replace(">", "&gt;");
    }
}
