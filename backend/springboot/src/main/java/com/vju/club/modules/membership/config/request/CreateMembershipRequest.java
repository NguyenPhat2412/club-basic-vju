package com.vju.club.modules.membership.config.request;

import jakarta.validation.constraints.NotNull;

import java.util.UUID;

public record CreateMembershipRequest(@NotNull UUID userId) { }
