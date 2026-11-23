package com.vju.club.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.time.OffsetDateTime;

public record ScheduleInterviewRequest(
        @NotNull OffsetDateTime interviewAt,
        @NotBlank @Size(max = 500) String interviewLocation,
        @Size(max = 1000) String interviewNote
) { }
