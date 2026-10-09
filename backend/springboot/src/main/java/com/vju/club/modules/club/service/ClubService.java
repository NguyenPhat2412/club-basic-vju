package com.vju.club.modules.club.service;

import com.vju.club.security.Actor;
import com.vju.club.modules.audit.enums.AuditAction;
import com.vju.club.modules.audit.service.AuditService;
import com.vju.club.modules.club.dto.request.ClubRequest;
import com.vju.club.modules.club.dto.request.ClubPatchRequest;
import com.vju.club.modules.club.dto.response.ClubResponse;
import com.vju.club.modules.club.dto.request.ClubStatusRequest;
import com.vju.club.common.OffsetLimitRequest;
import com.vju.club.common.dto.PageResponse;
import com.vju.club.modules.club.entity.Club;
import com.vju.club.modules.club.enums.ClubStatus;
import com.vju.club.error.ApiException;
import com.vju.club.modules.club.repository.ClubRepository;
import com.vju.club.security.PermissionAuthorizationService;
import org.springframework.http.HttpStatus;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Locale;
import java.util.UUID;

public interface ClubService {

    PageResponse<ClubResponse> list(Actor actor, String query, int offset, int limit);

    PageResponse<ClubResponse> list(Actor actor, String query, String category, ClubStatus status, int offset, int limit);

    ClubResponse get(Actor actor, UUID clubId);

    ClubResponse create(Actor actor, ClubRequest request);

    ClubResponse update(Actor actor, UUID clubId, ClubPatchRequest request);

    ClubResponse updateStatus(Actor actor, UUID clubId, ClubStatusRequest request);

}
