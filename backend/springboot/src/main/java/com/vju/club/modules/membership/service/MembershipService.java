package com.vju.club.modules.membership.service;

import com.vju.club.security.Actor;
import com.vju.club.modules.audit.enums.AuditAction;
import com.vju.club.modules.audit.service.AuditService;
import com.vju.club.common.OffsetLimitRequest;
import com.vju.club.common.dto.PageResponse;
import com.vju.club.modules.club.entity.Club;
import com.vju.club.modules.club.enums.ClubStatus;
import com.vju.club.modules.membership.entity.Membership;
import com.vju.club.modules.membership.enums.MembershipStatus;
import com.vju.club.modules.user.entity.User;
import com.vju.club.modules.user.enums.UserStatus;
import com.vju.club.error.ApiException;
import com.vju.club.modules.membership.dto.request.CreateMembershipRequest;
import com.vju.club.modules.membership.dto.response.MembershipResponse;
import com.vju.club.modules.membership.dto.response.MyMembershipResponse;
import com.vju.club.modules.membership.dto.response.MembershipDepartmentResponse;
import com.vju.club.modules.membership.dto.request.UpdateMembershipRequest;
import com.vju.club.modules.club.repository.ClubRepository;
import com.vju.club.modules.departmentmember.repository.DepartmentMemberRepository;
import com.vju.club.modules.membership.repository.MembershipRepository;
import com.vju.club.modules.user.repository.UserRepository;
import com.vju.club.security.PermissionAuthorizationService;
import org.springframework.http.HttpStatus;
import java.time.Clock;
import java.time.OffsetDateTime;
import java.util.Map;
import java.util.UUID;
import java.util.List;
import java.util.stream.Collectors;

public interface MembershipService {
    PageResponse<MembershipResponse> list(Actor actor, UUID clubId, MembershipStatus status, int offset, int limit);

    PageResponse<MembershipResponse> list(Actor actor, UUID clubId, MembershipStatus status, UUID departmentId, String search, int offset, int limit);

    PageResponse<MyMembershipResponse> listMine(Actor actor, MembershipStatus status, int offset, int limit);

    MembershipResponse get(Actor actor, UUID membershipId);

    MembershipResponse create(Actor actor, UUID clubId, CreateMembershipRequest request);

    MembershipResponse update(Actor actor, UUID membershipId, UpdateMembershipRequest request);

    void remove(Actor actor, UUID membershipId);
}
