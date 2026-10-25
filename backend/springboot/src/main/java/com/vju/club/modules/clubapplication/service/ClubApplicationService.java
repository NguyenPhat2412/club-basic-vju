package com.vju.club.modules.clubapplication.service;

import com.vju.club.modules.clubapplication.dto.response.ClubApplicationResponse;
import com.vju.club.modules.clubapplication.dto.response.ClubApplicationSummaryResponse;
import com.vju.club.modules.clubapplication.dto.request.CreateClubApplicationRequest;
import com.vju.club.modules.audit.enums.AuditAction;
import com.vju.club.modules.audit.service.AuditService;
import com.vju.club.common.OffsetLimitRequest;
import com.vju.club.common.dto.PageResponse;
import com.vju.club.modules.club.entity.Club;
import com.vju.club.modules.clubapplication.entity.ClubApplication;
import com.vju.club.modules.clubapplication.enums.ClubApplicationStatus;
import com.vju.club.modules.club.enums.ClubStatus;
import com.vju.club.modules.membership.enums.MembershipStatus;
import com.vju.club.modules.user.entity.User;
import com.vju.club.modules.user.enums.UserStatus;
import com.vju.club.error.ApiException;
import com.vju.club.modules.clubapplication.repository.ClubApplicationRepository;
import com.vju.club.modules.club.repository.ClubRepository;
import com.vju.club.modules.membership.repository.MembershipRepository;
import com.vju.club.modules.user.repository.UserRepository;
import com.vju.club.security.Actor;
import com.vju.club.security.PermissionAuthorizationService;
import com.vju.club.modules.notification.service.NotificationService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.data.domain.Sort;
import java.time.Clock;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

public interface ClubApplicationService {
    ClubApplicationResponse create(Actor actor, UUID clubId, CreateClubApplicationRequest request);

    PageResponse<ClubApplicationSummaryResponse> listMine( Actor actor, ClubApplicationStatus status, UUID clubId, String sort, int offset, int limit);

    ClubApplicationResponse getMine(Actor actor, UUID applicationId);

    ClubApplicationResponse cancel(Actor actor, UUID applicationId);

    PageResponse<ClubApplicationResponse> listForClub(Actor actor, UUID clubId, ClubApplicationStatus status, String search, OffsetDateTime createdFrom, OffsetDateTime createdTo, String sort, int offset, int limit);

    ClubApplicationResponse getForClub(Actor actor, UUID clubId, UUID applicationId);

    ClubApplicationResponse approve(Actor actor, UUID clubId, UUID applicationId, com.vju.club.modules.clubapplication.dto.request.ReviewClubApplicationRequest request);

    ClubApplicationResponse reject(Actor actor, UUID clubId, UUID applicationId, com.vju.club.modules.clubapplication.dto.request.ReviewClubApplicationRequest request);
}
