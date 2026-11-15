package com.vju.club.security.websocket;

import com.vju.club.security.Actor;

import java.security.Principal;
import java.util.UUID;

public record ActorPrincipal(UUID userId, String fullName) implements Principal {
    @Override
    public String getName() {
        return userId.toString();
    }

    public Actor toActor() {
        return new Actor(userId);
    }
}
