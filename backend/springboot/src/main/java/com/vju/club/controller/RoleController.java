package com.vju.club.controller;

import lombok.RequiredArgsConstructor;
import com.vju.club.common.ApiPaths;
import com.vju.club.service.RoleService;

import com.vju.club.security.Actor;
import com.vju.club.dto.request.AssignClubPositionRequest;
import com.vju.club.dto.request.AssignRoleRequest;
import com.vju.club.dto.request.CreateRoleRequest;
import com.vju.club.dto.response.ClubStructureResponse;
import com.vju.club.dto.response.RoleResponse;
import com.vju.club.dto.request.UpdateRoleRequest;
import com.vju.club.dto.response.UserRoleResponse;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping(ApiPaths.API_V1)
@RequiredArgsConstructor
public class RoleController {
    private final RoleService roleService;

    @GetMapping(ApiPaths.ROLES)
    public List<RoleResponse> list(Actor actor) {
        return roleService.list(actor);
    }

    @GetMapping(ApiPaths.ROLE_BY_ID)
    public RoleResponse get(Actor actor, @PathVariable UUID roleId) {
        return roleService.get(actor, roleId);
    }

    @PostMapping(ApiPaths.ROLES)
    public ResponseEntity<RoleResponse> create(Actor actor, @Valid @RequestBody CreateRoleRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(roleService.create(actor, request));
    }

    @PatchMapping(ApiPaths.ROLE_BY_ID)
    public RoleResponse update(Actor actor, @PathVariable UUID roleId,
                               @Valid @RequestBody UpdateRoleRequest request) {
        return roleService.update(actor, roleId, request);
    }

    @GetMapping(ApiPaths.MY_ROLES)
    public List<UserRoleResponse> listOwn(Actor actor) {
        return roleService.listAssignments(actor, actor.id());
    }

    @GetMapping(ApiPaths.USER_ROLES)
    public List<UserRoleResponse> listForUser(Actor actor, @PathVariable UUID userId) {
        return roleService.listAssignments(actor, userId);
    }

    @PostMapping(ApiPaths.USER_ROLES)
    public ResponseEntity<UserRoleResponse> assign(Actor actor, @PathVariable UUID userId,
                                                   @Valid @RequestBody AssignRoleRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(roleService.assign(actor, userId, request));
    }

    @DeleteMapping(ApiPaths.USER_ROLE_BY_ID)
    public ResponseEntity<Void> revoke(Actor actor, @PathVariable UUID userId,
                                       @PathVariable UUID assignmentId) {
        roleService.revoke(actor, userId, assignmentId);
        return ResponseEntity.noContent().build();
    }

    @GetMapping(ApiPaths.CLUB_POSITIONS)
    public ClubStructureResponse getClubStructure(Actor actor, @PathVariable UUID clubId) {
        return roleService.getClubStructure(actor, clubId);
    }

    @PutMapping(ApiPaths.CLUB_POSITIONS)
    public UserRoleResponse assignClubPosition(Actor actor, @PathVariable UUID clubId,
                                               @Valid @RequestBody AssignClubPositionRequest request) {
        return roleService.assignClubPosition(actor, clubId, request);
    }

    @DeleteMapping(ApiPaths.CLUB_POSITION_BY_ID)
    public ResponseEntity<Void> revokeClubPosition(Actor actor, @PathVariable UUID clubId,
                                                   @PathVariable UUID assignmentId) {
        roleService.revokeClubPosition(actor, clubId, assignmentId);
        return ResponseEntity.noContent().build();
    }
}
