package com.vju.club.security;

import java.util.Objects;
import java.util.UUID;

public record Actor(UUID id) {
    public Actor {
        Objects.requireNonNull(id, "id");
    }
}
