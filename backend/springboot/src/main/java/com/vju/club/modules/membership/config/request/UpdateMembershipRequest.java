package com.vju.club.modules.membership.config.request;

import com.vju.club.modules.membership.entity.MembershipStatus;
import jakarta.validation.constraints.NotNull;

public record UpdateMembershipRequest(@NotNull MembershipStatus status) { }
