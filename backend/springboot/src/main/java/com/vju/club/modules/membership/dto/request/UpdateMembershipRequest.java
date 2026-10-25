package com.vju.club.modules.membership.dto.request;

import com.vju.club.modules.membership.enums.MembershipStatus;
import jakarta.validation.constraints.NotNull;

public record UpdateMembershipRequest(@NotNull MembershipStatus status) { }
