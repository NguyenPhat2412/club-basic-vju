package com.vju.club.service;

import com.vju.club.dto.request.TestSmtpEmailRequest;
import com.vju.club.dto.request.UpdateSystemSettingsRequest;
import com.vju.club.dto.response.PublicSystemStatusResponse;
import com.vju.club.dto.response.SystemSettingsResponse;
import com.vju.club.security.Actor;

public interface SystemSettingsService {
    /** The limits the rest of the system enforces; no permission check. */
    SystemSettingsResponse current();

    /** Public non-sensitive status (maintenance mode & active global announcement). */
    PublicSystemStatusResponse publicStatus();

    SystemSettingsResponse get(Actor actor);

    SystemSettingsResponse update(Actor actor, UpdateSystemSettingsRequest request);

    void sendTestEmail(Actor actor, TestSmtpEmailRequest request);

    void sendTestTelegram(Actor actor);
}
