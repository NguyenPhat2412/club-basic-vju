package com.vju.club.club.dto;

import com.vju.club.entity.ClubStatus;
import jakarta.validation.constraints.NotNull;

public record ClubStatusRequest(@NotNull ClubStatus status) { }
