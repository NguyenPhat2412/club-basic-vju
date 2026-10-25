package com.vju.club.modules.membership.dto.request;

import jakarta.validation.constraints.NotNull;

import java.util.UUID;

public record CreateMembershipRequest(@NotNull UUID userId) { }
