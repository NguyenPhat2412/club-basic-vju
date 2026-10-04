package com.vju.club.security;

import java.util.Objects;
import java.util.UUID;

/**
 * The authenticated user making the request. Controllers receive it as a method argument (see
 * {@link ActorArgumentResolver}), so services depend on this plain value instead of Spring Security.
 */
public record Actor(UUID id) {
    public Actor {
        Objects.requireNonNull(id, "id");
    }
}
