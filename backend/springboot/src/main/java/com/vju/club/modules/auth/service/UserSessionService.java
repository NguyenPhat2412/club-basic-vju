package com.vju.club.modules.auth.service;

import java.util.UUID;

public interface UserSessionService {
    int endAllSessions(UUID userId);

    int endSessionsExcept(UUID userId, String keptSessionId);
}
