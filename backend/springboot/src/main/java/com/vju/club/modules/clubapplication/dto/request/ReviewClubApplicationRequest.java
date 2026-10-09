package com.vju.club.modules.clubapplication.dto.request;

import jakarta.validation.constraints.Size;

public record ReviewClubApplicationRequest(@Size(max = 1000) String reviewNote) { }
