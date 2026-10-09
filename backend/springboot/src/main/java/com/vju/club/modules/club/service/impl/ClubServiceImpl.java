package com.vju.club.modules.club.service.impl;

import com.vju.club.modules.permission.annotation.RequirePermission;
import lombok.RequiredArgsConstructor;
import com.vju.club.modules.club.mapper.ClubMapper;
import com.vju.club.modules.club.service.ClubService;
import com.vju.club.modules.club.common.ClubConstants;

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
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import com.vju.club.modules.club.specification.ClubSpecifications;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Locale;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class ClubServiceImpl implements ClubService {

    private final ClubRepository clubRepository;
    private final PermissionAuthorizationService authorizationService;
    private final AuditService auditService;
    private final ClubMapper clubMapper;

    @Transactional(readOnly = true)
    public PageResponse<ClubResponse> list(Actor actor, String query, int offset, int limit) {
        return list(actor, query, null, null, offset, limit);
    }

    @Transactional(readOnly = true)
    public PageResponse<ClubResponse> list(Actor actor, String query, String category, ClubStatus status,
                                           int offset, int limit) {
        Specification<Club> spec = Specification.where(ClubSpecifications.hasKeyword(query))
                .and(ClubSpecifications.hasCategory(category));

        if (authorizationService.hasGlobalPermission(actor, ClubConstants.PERMISSION_VIEW)) {
            spec = spec.and(ClubSpecifications.hasStatus(status));
        } else if (authorizationService.hasAnyPermission(actor, ClubConstants.PERMISSION_VIEW)) {
            java.util.Set<UUID> permittedClubIds = authorizationService.getPermittedClubIds(actor, ClubConstants.PERMISSION_VIEW);
            spec = spec.and(ClubSpecifications.hasStatus(status))
                    .and(ClubSpecifications.idIn(permittedClubIds));
        } else {
            spec = spec.and(ClubSpecifications.isDiscoverable());
        }

        Sort sort = Sort.by(Sort.Order.asc("name"), Sort.Order.asc("id"));
        OffsetLimitRequest page = new OffsetLimitRequest(offset, limit, sort);
        Page<Club> clubPage = clubRepository.findAll(spec, page);
        List<ClubResponse> clubs = clubPage.getContent().stream().map(clubMapper::toResponse).toList();
        return new PageResponse<>(clubs, clubPage.getTotalElements(), offset, limit);
    }

    @Transactional(readOnly = true)
    public ClubResponse get(Actor actor, UUID clubId) {
        if (authorizationService.hasAnyPermission(actor, ClubConstants.PERMISSION_VIEW)) {
            authorizationService.require(actor, ClubConstants.PERMISSION_VIEW, clubId, null);
            return clubMapper.toResponse(findClub(clubId));
        }
        return clubMapper.toResponse(clubRepository.findByIdAndStatus(clubId, ClubStatus.ACTIVE)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "CLUB_NOT_FOUND", "Club not found")));
    }

    @Transactional
    @RequirePermission(ClubConstants.PERMISSION_CREATE)
    public ClubResponse create(Actor actor, ClubRequest request) {
        String code = request.code().trim();
        if (clubRepository.existsByCodeIgnoreCase(code)) {
            throw new ApiException(HttpStatus.CONFLICT, "CLUB_CODE_ALREADY_EXISTS", "Club code is already used");
        }
        Club club = new Club();
        club.setCode(code);
        apply(club, request);
        Club saved = clubRepository.saveAndFlush(club);
        auditService.record(actor.id(), AuditAction.CLUB_CREATED, saved.getId(), saved.getId(), null, snapshot(saved));
        return clubMapper.toResponse(saved);
    }

    @Transactional
    @RequirePermission(value = ClubConstants.PERMISSION_UPDATE, clubId = "clubId")
    public ClubResponse update(Actor actor, UUID clubId, ClubPatchRequest request) {
        Club club = findClub(clubId);
        if (request.code() != null && !club.getCode().equalsIgnoreCase(request.code().trim())
                && clubRepository.existsByCodeIgnoreCase(request.code().trim())) {
            throw new ApiException(HttpStatus.CONFLICT, "CLUB_CODE_ALREADY_EXISTS", "Club code is already used");
        }
        Map<String, Object> before = snapshot(club);
        applyPatch(club, request);
        Club saved = clubRepository.saveAndFlush(club);
        auditService.recordChange(actor.id(), AuditAction.CLUB_UPDATED, clubId, clubId, before, snapshot(saved));
        return clubMapper.toResponse(saved);
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
        return clubMapper.toResponse(saved);
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
