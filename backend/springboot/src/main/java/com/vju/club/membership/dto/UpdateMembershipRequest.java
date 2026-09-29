package com.vju.club.membership.dto;

import com.vju.club.entity.MembershipStatus;
import jakarta.validation.constraints.NotNull;

public record UpdateMembershipRequest(@NotNull MembershipStatus status) { }
