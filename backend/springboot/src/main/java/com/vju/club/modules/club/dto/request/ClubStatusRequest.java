package com.vju.club.modules.club.dto.request;

import com.vju.club.modules.club.enums.ClubStatus;
import jakarta.validation.constraints.NotNull;

public record ClubStatusRequest(@NotNull ClubStatus status) { }
