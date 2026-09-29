package com.vju.club.club;

import com.vju.club.club.dto.ClubRequest;
import com.vju.club.club.dto.ClubPatchRequest;
import com.vju.club.club.dto.ClubResponse;
import com.vju.club.club.dto.ClubStatusRequest;
import com.vju.club.common.dto.PageResponse;
import org.springframework.security.core.Authentication;

import java.util.List;
import java.util.UUID;

public interface ClubService {
    PageResponse<ClubResponse> list(Authentication authentication, String query, int offset, int limit);
    ClubResponse get(Authentication authentication, UUID clubId);
    ClubResponse create(Authentication authentication, ClubRequest request);
    ClubResponse update(Authentication authentication, UUID clubId, ClubPatchRequest request);
    ClubResponse updateStatus(Authentication authentication, UUID clubId, ClubStatusRequest request);
}
