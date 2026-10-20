package com.vju.club.modules.auth.service.impl;

import com.vju.club.modules.auth.service.UserSessionService;
import lombok.RequiredArgsConstructor;
import org.springframework.session.FindByIndexNameSessionRepository;
import org.springframework.session.Session;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class UserSessionServiceImpl implements UserSessionService {
    private final FindByIndexNameSessionRepository<? extends Session> sessions;

    @Override
    public int endAllSessions(UUID userId) {
        return endSessionsExcept(userId, null);
    }

    @Override
    public int endSessionsExcept(UUID userId, String keptSessionId) {
        List<String> ended = sessions.findByPrincipalName(userId.toString()).keySet().stream()
                .filter(sessionId -> !sessionId.equals(keptSessionId))
                .toList();
        ended.forEach(sessions::deleteById);
        return ended.size();
    }
}
