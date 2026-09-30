package com.vju.club.membership;

import com.vju.club.common.dto.PageResponse;
import com.vju.club.entity.MembershipStatus;
import com.vju.club.membership.dto.CreateMembershipRequest;
import com.vju.club.membership.dto.MembershipResponse;
import com.vju.club.membership.dto.UpdateMembershipRequest;
import org.springframework.security.core.Authentication;

import java.util.UUID;

public interface MembershipService {
    PageResponse<MembershipResponse> list(Authentication authentication, UUID clubId, MembershipStatus status,
                                          int offset, int limit);
    MembershipResponse get(Authentication authentication, UUID membershipId);
    MembershipResponse create(Authentication authentication, UUID clubId, CreateMembershipRequest request);
    MembershipResponse update(Authentication authentication, UUID membershipId, UpdateMembershipRequest request);
    void remove(Authentication authentication, UUID membershipId);
}
