package com.vju.club.modules.club.config.request;

import com.vju.club.modules.club.entity.ClubStatus;
import jakarta.validation.constraints.NotNull;

public record ClubStatusRequest(@NotNull ClubStatus status) { }
