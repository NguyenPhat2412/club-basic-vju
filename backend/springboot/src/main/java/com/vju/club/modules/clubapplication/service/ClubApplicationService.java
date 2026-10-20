package com.vju.club.modules.clubapplication.service;

import com.vju.club.common.dto.PageResponse;
import com.vju.club.modules.clubapplication.dto.request.CreateClubApplicationRequest;
import com.vju.club.modules.clubapplication.dto.request.ReviewClubApplicationRequest;
import com.vju.club.modules.clubapplication.dto.response.ClubApplicationResponse;
import com.vju.club.modules.clubapplication.dto.response.ClubApplicationSummaryResponse;
import com.vju.club.modules.clubapplication.enums.ClubApplicationStatus;
import com.vju.club.security.Actor;

import java.time.OffsetDateTime;
import java.util.UUID;

public interface ClubApplicationService {
    ClubApplicationResponse create(Actor actor, UUID clubId, CreateClubApplicationRequest request);

    PageResponse<ClubApplicationSummaryResponse> listMine(Actor actor, ClubApplicationStatus status, UUID clubId, String sort, int offset, int limit);

    ClubApplicationResponse getMine(Actor actor, UUID applicationId);

    ClubApplicationResponse cancel(Actor actor, UUID applicationId);

    PageResponse<ClubApplicationResponse> listForClub(Actor actor, UUID clubId, ClubApplicationStatus status, String search, OffsetDateTime createdFrom, OffsetDateTime createdTo, String sort, int offset, int limit);

    ClubApplicationResponse getForClub(Actor actor, UUID clubId, UUID applicationId);

    ClubApplicationResponse approve(Actor actor, UUID clubId, UUID applicationId, ReviewClubApplicationRequest request);

    ClubApplicationResponse reject(Actor actor, UUID clubId, UUID applicationId, ReviewClubApplicationRequest request);
}
