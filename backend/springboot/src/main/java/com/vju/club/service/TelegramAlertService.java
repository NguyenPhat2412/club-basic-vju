package com.vju.club.service;

public interface TelegramAlertService {
    /** Sends an immediate synchronous test message to verify bot token and chat ID. */
    void sendTestMessage(String triggeredByEmail, String ipAddress);

    /** Sends an asynchronous operational/security alert with per-key cooldown deduplication. */
    void sendAlertAsync(String dedupeKey, String title, String htmlBody);
}
