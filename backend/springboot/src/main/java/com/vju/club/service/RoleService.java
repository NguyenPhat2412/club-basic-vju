package com.vju.club.service;

import com.vju.club.dto.request.AssignClubPositionRequest;
import com.vju.club.dto.request.AssignRoleRequest;
import com.vju.club.dto.request.CreateRoleRequest;
import com.vju.club.dto.request.UpdateRoleRequest;
import com.vju.club.dto.response.ClubStructureResponse;
import com.vju.club.dto.response.RoleResponse;
import com.vju.club.dto.response.UserRoleResponse;
import com.vju.club.security.Actor;

import java.util.List;
import java.util.UUID;

public interface RoleService {
    List<RoleResponse> list(Actor actor);

    RoleResponse get(Actor actor, UUID roleId);

    RoleResponse create(Actor actor, CreateRoleRequest request);

    RoleResponse update(Actor actor, UUID roleId, UpdateRoleRequest request);

    List<UserRoleResponse> listAssignments(Actor actor, UUID userId);

    UserRoleResponse assign(Actor actor, UUID userId, AssignRoleRequest request);

    void revoke(Actor actor, UUID userId, UUID assignmentId);

    ClubStructureResponse getClubStructure(Actor actor, UUID clubId);

    UserRoleResponse assignClubPosition(Actor actor, UUID clubId, AssignClubPositionRequest request);

    void revokeClubPosition(Actor actor, UUID clubId, UUID assignmentId);
}
