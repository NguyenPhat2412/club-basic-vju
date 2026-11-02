package com.vju.club.dto.request;

import com.vju.club.enums.MembershipStatus;
import jakarta.validation.constraints.NotNull;

public record UpdateMembershipRequest(@NotNull MembershipStatus status) { }
