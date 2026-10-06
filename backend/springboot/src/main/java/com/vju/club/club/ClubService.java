package com.vju.club.club;

import com.vju.club.security.Actor;
import com.vju.club.audit.AuditAction;
import com.vju.club.audit.AuditService;
import com.vju.club.club.dto.ClubRequest;
import com.vju.club.club.dto.ClubPatchRequest;
import com.vju.club.club.dto.ClubResponse;
import com.vju.club.club.dto.ClubStatusRequest;
import com.vju.club.common.OffsetLimitRequest;
import com.vju.club.common.dto.PageResponse;
import com.vju.club.entity.Club;
import com.vju.club.entity.ClubStatus;
import com.vju.club.error.ApiException;
import com.vju.club.repository.ClubRepository;
import com.vju.club.security.PermissionAuthorizationService;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Locale;
import java.util.UUID;

@Service
public class ClubService {

    private final ClubRepository clubRepository;
    private final AuditService auditService;
    private final PermissionAuthorizationService authorizationService;

    public ClubService(ClubRepository clubRepository, PermissionAuthorizationService authorizationService,
                       AuditService auditService) {
        this.clubRepository = clubRepository;
        this.auditService = auditService;
        this.authorizationService = authorizationService;
    }

    @Transactional(readOnly = true)
    public PageResponse<ClubResponse> list(Actor actor, String query, int offset, int limit) {
        return list(actor, query, null, null, offset, limit);
    }

    @Transactional(readOnly = true)
    public PageResponse<ClubResponse> list(Actor actor, String query, String category, ClubStatus status,
                                           int offset, int limit) {
        String pattern = "%" + (query == null ? "" : query.trim().toLowerCase(Locale.ROOT)) + "%";
        String normalizedCategory = category == null || category.isBlank() ? "" : category.trim();
        OffsetLimitRequest page = new OffsetLimitRequest(offset, limit);
        List<ClubResponse> clubs;
        long total;
        if (authorizationService.hasGlobalPermission(actor, "club.view")) {
            clubs = clubRepository.search(pattern, normalizedCategory, status, page).stream().map(ClubResponse::from).toList();
            total = clubRepository.countSearch(pattern, normalizedCategory, status);
        } else if (authorizationService.hasAnyPermission(actor, "club.view")) {
            String statusName = status == null ? "" : status.name();
            clubs = clubRepository.searchVisibleTo(actor.id(), pattern, normalizedCategory, statusName, page)
                    .stream().map(ClubResponse::from).toList();
            total = clubRepository.countVisibleTo(actor.id(), pattern, normalizedCategory, statusName);
        } else {
            clubs = clubRepository.searchDiscoverable(pattern, normalizedCategory, page)
                    .stream().map(ClubResponse::from).toList();
            total = clubRepository.countDiscoverable(pattern, normalizedCategory);
        }
        return new PageResponse<>(clubs, total, offset, limit);
    }

    @Transactional(readOnly = true)
    public ClubResponse get(Actor actor, UUID clubId) {
        if (authorizationService.hasAnyPermission(actor, "club.view")) {
            authorizationService.require(actor, "club.view", clubId, null);
            return ClubResponse.from(findClub(clubId));
        }
        return ClubResponse.from(clubRepository.findByIdAndStatus(clubId, ClubStatus.ACTIVE)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "CLUB_NOT_FOUND", "Club not found")));
    }

    @Transactional
    public ClubResponse create(Actor actor, ClubRequest request) {
        authorizationService.require(actor, "club.create", null, null);
        String code = request.code().trim();
        if (clubRepository.existsByCodeIgnoreCase(code)) {
            throw new ApiException(HttpStatus.CONFLICT, "CLUB_CODE_ALREADY_EXISTS", "Club code is already used");
        }
        Club club = new Club();
        club.setCode(code);
        apply(club, request);
        Club saved = clubRepository.saveAndFlush(club);
        auditService.record(actor.id(), AuditAction.CLUB_CREATED, saved.getId(), saved.getId(), null, snapshot(saved));
        return ClubResponse.from(saved);
    }

    @Transactional
    public ClubResponse update(Actor actor, UUID clubId, ClubPatchRequest request) {
        authorizationService.require(actor, "club.update", clubId, null);
        Club club = findClub(clubId);
        if (request.code() != null && !club.getCode().equalsIgnoreCase(request.code().trim())
                && clubRepository.existsByCodeIgnoreCase(request.code().trim())) {
            throw new ApiException(HttpStatus.CONFLICT, "CLUB_CODE_ALREADY_EXISTS", "Club code is already used");
        }
        Map<String, Object> before = snapshot(club);
        applyPatch(club, request);
        Club saved = clubRepository.saveAndFlush(club);
        auditService.recordChange(actor.id(), AuditAction.CLUB_UPDATED, clubId, clubId, before, snapshot(saved));
        return ClubResponse.from(saved);
    }

    @Transactional
    public ClubResponse updateStatus(Actor actor, UUID clubId, ClubStatusRequest request) {
        authorizationService.require(actor,
                request.status() == ClubStatus.ACTIVE ? "club.active" : "club.inactive",
                clubId, null);
        Club club = findClub(clubId);
        Map<String, Object> before = Map.of("status", club.getStatus());
        club.setStatus(request.status());
        Club saved = clubRepository.saveAndFlush(club);
        auditService.recordChange(actor.id(), request.status() == ClubStatus.ACTIVE
                ? AuditAction.CLUB_ACTIVATED : AuditAction.CLUB_DEACTIVATED, clubId, clubId,
                before, Map.of("status", saved.getStatus()));
        return ClubResponse.from(saved);
    }

    private static Map<String, Object> snapshot(Club club) {
        Map<String, Object> values = new LinkedHashMap<>();
        values.put("code", club.getCode());
        values.put("name", club.getName());
        values.put("description", club.getDescription());
        values.put("activityField", club.getActivityField());
        values.put("contactEmail", club.getContactEmail());
        values.put("logoUrl", club.getLogoUrl());
        values.put("coverUrl", club.getCoverUrl());
        values.put("status", club.getStatus());
        return values;
    }

    private void apply(Club club, ClubRequest request) {
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
