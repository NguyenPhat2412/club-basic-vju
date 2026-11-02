package com.vju.club.service;

import com.vju.club.dto.response.PageResponse;
import com.vju.club.dto.request.CreateMembershipRequest;
import com.vju.club.dto.request.UpdateMembershipRequest;
import com.vju.club.dto.response.MembershipResponse;
import com.vju.club.dto.response.MyMembershipResponse;
import com.vju.club.enums.MembershipStatus;
import com.vju.club.security.Actor;

import java.util.UUID;

public interface MembershipService {
    PageResponse<MembershipResponse> list(Actor actor, UUID clubId, MembershipStatus status, int offset, int limit);

    PageResponse<MembershipResponse> list(Actor actor, UUID clubId, MembershipStatus status, UUID departmentId, String search, int offset, int limit);

    PageResponse<MyMembershipResponse> listMine(Actor actor, MembershipStatus status, int offset, int limit);

    MembershipResponse get(Actor actor, UUID membershipId);

    MembershipResponse create(Actor actor, UUID clubId, CreateMembershipRequest request);

    MembershipResponse update(Actor actor, UUID membershipId, UpdateMembershipRequest request);

    void remove(Actor actor, UUID membershipId);
}
