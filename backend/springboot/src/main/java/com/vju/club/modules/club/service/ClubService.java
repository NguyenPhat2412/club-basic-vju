package com.vju.club.modules.club.service;

import com.vju.club.common.dto.PageResponse;
import com.vju.club.modules.club.dto.request.ClubPatchRequest;
import com.vju.club.modules.club.dto.request.ClubRequest;
import com.vju.club.modules.club.dto.request.ClubStatusRequest;
import com.vju.club.modules.club.dto.response.ClubResponse;
import com.vju.club.modules.club.enums.ClubStatus;
import com.vju.club.security.Actor;

import java.util.UUID;

public interface ClubService {
    PageResponse<ClubResponse> listPublic(String query, String category, int offset, int limit);

    ClubResponse getPublic(UUID clubId);

    PageResponse<ClubResponse> list(Actor actor, String query, int offset, int limit);

    PageResponse<ClubResponse> list(Actor actor, String query, String category, ClubStatus status, int offset, int limit);

    ClubResponse get(Actor actor, UUID clubId);

    ClubResponse create(Actor actor, ClubRequest request);

    ClubResponse update(Actor actor, UUID clubId, ClubPatchRequest request);

    ClubResponse updateStatus(Actor actor, UUID clubId, ClubStatusRequest request);
}
