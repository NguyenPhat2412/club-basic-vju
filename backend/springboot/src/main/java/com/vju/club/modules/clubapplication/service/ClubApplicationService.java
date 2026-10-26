package com.vju.club.modules.clubapplication.service;

import com.vju.club.common.dto.PageResponse;
import com.vju.club.modules.clubapplication.dto.request.CreateClubApplicationRequest;
import com.vju.club.modules.clubapplication.dto.request.ReviewClubApplicationRequest;
import com.vju.club.modules.clubapplication.dto.request.UpdateClubApplicationRequest;
import com.vju.club.modules.clubapplication.dto.request.UpsertClubApplicationFormRequest;
import com.vju.club.modules.clubapplication.dto.response.ClubApplicationFileResponse;
import com.vju.club.modules.clubapplication.dto.response.ClubApplicationFormResponse;
import com.vju.club.modules.clubapplication.dto.response.ClubApplicationResponse;
import com.vju.club.modules.clubapplication.dto.response.ClubApplicationSummaryResponse;
import com.vju.club.modules.clubapplication.enums.ClubApplicationStatus;
import com.vju.club.modules.document.dto.record.DocumentContent;
import com.vju.club.modules.document.dto.record.UploadedFile;
import com.vju.club.security.Actor;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

public interface ClubApplicationService {
    ClubApplicationFormResponse getActiveFormForClub(Actor actor, UUID clubId);

    List<ClubApplicationFormResponse> listFormsForClub(Actor actor, UUID clubId);

    ClubApplicationFormResponse createForm(Actor actor, UUID clubId, UpsertClubApplicationFormRequest request);

    ClubApplicationFormResponse updateForm(Actor actor, UUID clubId, UUID formId, UpsertClubApplicationFormRequest request);

    void deleteForm(Actor actor, UUID clubId, UUID formId);

    ClubApplicationFileResponse uploadFormFile(Actor actor, UUID clubId, UUID formId, String fileCategory, UploadedFile file);

    void deleteFormFile(Actor actor, UUID clubId, UUID formId, UUID fileId);

    ClubApplicationResponse create(Actor actor, UUID clubId, CreateClubApplicationRequest request);

    PageResponse<ClubApplicationSummaryResponse> listMine(Actor actor, ClubApplicationStatus status, UUID clubId, String sort, int offset, int limit);

    ClubApplicationResponse getMine(Actor actor, UUID applicationId);

    ClubApplicationResponse updateMine(Actor actor, UUID applicationId, UpdateClubApplicationRequest request);

    void deleteMine(Actor actor, UUID applicationId);

    ClubApplicationResponse cancel(Actor actor, UUID applicationId);

    PageResponse<ClubApplicationResponse> listForClub(Actor actor, UUID clubId, ClubApplicationStatus status, String search, OffsetDateTime createdFrom, OffsetDateTime createdTo, String sort, int offset, int limit);

    ClubApplicationResponse getForClub(Actor actor, UUID clubId, UUID applicationId);

    ClubApplicationResponse updateForClub(Actor actor, UUID clubId, UUID applicationId, UpdateClubApplicationRequest request);

    void deleteForClub(Actor actor, UUID clubId, UUID applicationId);

    ClubApplicationFileResponse uploadApplicationFile(Actor actor, UUID applicationId, String fileCategory, UploadedFile file);

    void deleteApplicationFile(Actor actor, UUID applicationId, UUID fileId);

    DocumentContent downloadFile(Actor actor, UUID fileId);

    ClubApplicationResponse approve(Actor actor, UUID clubId, UUID applicationId, ReviewClubApplicationRequest request);

    ClubApplicationResponse reject(Actor actor, UUID clubId, UUID applicationId, ReviewClubApplicationRequest request);
}
