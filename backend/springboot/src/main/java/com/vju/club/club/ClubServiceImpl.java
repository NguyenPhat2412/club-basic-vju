package com.vju.club.club;

import com.vju.club.club.dto.ClubRequest;
import com.vju.club.club.dto.ClubPatchRequest;
import com.vju.club.club.dto.ClubResponse;
import com.vju.club.club.dto.ClubStatusRequest;
import com.vju.club.common.dto.PageResponse;
import com.vju.club.entity.Club;
import com.vju.club.error.ApiException;
import com.vju.club.repository.ClubRepository;
import com.vju.club.security.PermissionAuthorizationService;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;
import com.vju.club.security.SecurityIdentity;

@Service
public class ClubServiceImpl implements ClubService {

    private final ClubRepository clubRepository;
    private final ClubDao clubDao;
    private final PermissionAuthorizationService authorizationService;

    public ClubServiceImpl(ClubRepository clubRepository, ClubDao clubDao,
                           PermissionAuthorizationService authorizationService) {
        this.clubRepository = clubRepository;
        this.clubDao = clubDao;
        this.authorizationService = authorizationService;
    }

    @Override
    @Transactional(readOnly = true)
    public PageResponse<ClubResponse> list(Authentication authentication, String query, int offset, int limit) {
        List<ClubResponse> clubs;
        long total;
        if (authorizationService.hasGlobalPermission(authentication, "club.view")) {
            clubs = clubDao.search(query, offset, limit).stream().map(ClubResponse::from).toList();
            total = clubDao.count(query);
        } else {
            UUID userId = SecurityIdentity.userId(authentication);
            clubs = clubDao.searchForUser(userId, query, offset, limit).stream().map(ClubResponse::from).toList();
            total = clubDao.countForUser(userId, query);
            if (clubs.isEmpty() && total == 0 && !authorizationService.hasAnyPermission(authentication, "club.view")) {
                authorizationService.require(authentication, "club.view", null, null);
            }
        }
        return new PageResponse<>(clubs, total, Math.max(0, offset), Math.max(1, Math.min(limit, 100)));
    }

    @Override
    @Transactional(readOnly = true)
    public ClubResponse get(Authentication authentication, UUID clubId) {
        authorizationService.require(authentication, "club.view", clubId, null);
        return ClubResponse.from(findClub(clubId));
    }

    @Override
    @Transactional
    public ClubResponse create(Authentication authentication, ClubRequest request) {
        authorizationService.require(authentication, "club.create", null, null);
        String code = request.code().trim();
        if (clubRepository.existsByCodeIgnoreCase(code)) {
            throw new ApiException(HttpStatus.CONFLICT, "CLUB_CODE_ALREADY_EXISTS", "Club code is already used");
        }
        Club club = new Club();
        apply(club, request);
        club.setCode(code);
        return ClubResponse.from(clubRepository.save(club));
    }

    @Override
    @Transactional
    public ClubResponse update(Authentication authentication, UUID clubId, ClubPatchRequest request) {
        authorizationService.require(authentication, "club.update", clubId, null);
        Club club = findClub(clubId);
        if (request.code() != null && !club.getCode().equalsIgnoreCase(request.code())
                && clubRepository.existsByCodeIgnoreCase(request.code().trim())) {
            throw new ApiException(HttpStatus.CONFLICT, "CLUB_CODE_ALREADY_EXISTS", "Club code is already used");
        }
        applyPatch(club, request);
        return ClubResponse.from(clubRepository.save(club));
    }

    @Override
    @Transactional
    public ClubResponse updateStatus(Authentication authentication, UUID clubId, ClubStatusRequest request) {
        authorizationService.require(authentication,
                request.status() == com.vju.club.entity.ClubStatus.ACTIVE ? "club.active" : "club.inactive",
                clubId, null);
        Club club = findClub(clubId);
        club.setStatus(request.status());
        return ClubResponse.from(clubRepository.save(club));
    }

    private void apply(Club club, ClubRequest request) {
        club.setCode(request.code().trim());
        club.setName(request.name().trim());
        club.setLogoUrl(request.logoUrl());
        club.setCoverUrl(request.coverUrl());
        club.setDescription(request.description());
        club.setActivityField(request.activityField());
        club.setContactEmail(request.contactEmail());
    }

    private void applyPatch(Club club, ClubPatchRequest request) {
        if (request.code() != null) {
            if (request.code().isBlank()) throw new ApiException(HttpStatus.BAD_REQUEST, "INVALID_CLUB_CODE", "Club code cannot be blank");
            club.setCode(request.code().trim());
        }
        if (request.name() != null) {
            if (request.name().isBlank()) throw new ApiException(HttpStatus.BAD_REQUEST, "INVALID_CLUB_NAME", "Club name cannot be blank");
            club.setName(request.name().trim());
        }
        if (request.logoUrl() != null) club.setLogoUrl(request.logoUrl());
        if (request.coverUrl() != null) club.setCoverUrl(request.coverUrl());
        if (request.description() != null) club.setDescription(request.description());
        if (request.activityField() != null) club.setActivityField(request.activityField());
        if (request.contactEmail() != null) club.setContactEmail(request.contactEmail());
    }

    private Club findClub(UUID id) {
        return clubRepository.findById(id)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "CLUB_NOT_FOUND", "Club not found"));
    }
}
