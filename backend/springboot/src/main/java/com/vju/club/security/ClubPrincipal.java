package com.vju.club.security;

import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

import java.util.Collection;
import java.util.List;
import java.util.Objects;
import java.util.UUID;

public record ClubPrincipal(UUID id, String email, String passwordHash, boolean active) implements UserDetails {
    public ClubPrincipal {
        Objects.requireNonNull(id, "id");
    }

    public ClubPrincipal withoutPassword() {
        return new ClubPrincipal(id, email, null, active);
    }

    @Override
    public String getUsername() {
        return id.toString();
    }

    @Override
    public String getPassword() {
        return passwordHash;
    }

    @Override
    public boolean isEnabled() {
        return active;
    }

    @Override
    public Collection<? extends GrantedAuthority> getAuthorities() {
        return List.of();
    }
}
