package com.vju.club.dto.request;

import com.vju.club.enums.ClubStatus;
import jakarta.validation.constraints.NotNull;

public record ClubStatusRequest(@NotNull ClubStatus status) { }
