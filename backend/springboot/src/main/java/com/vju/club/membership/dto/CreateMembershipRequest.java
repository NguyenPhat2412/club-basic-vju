package com.vju.club.membership.dto;

import jakarta.validation.constraints.NotNull;

import java.util.UUID;

public record CreateMembershipRequest(@NotNull UUID userId) { }
