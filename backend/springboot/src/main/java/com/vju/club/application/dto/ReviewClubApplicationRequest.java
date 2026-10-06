package com.vju.club.application.dto;

import jakarta.validation.constraints.Size;

public record ReviewClubApplicationRequest(@Size(max = 1000) String reviewNote) { }
