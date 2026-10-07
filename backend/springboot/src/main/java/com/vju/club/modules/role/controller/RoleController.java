package com.vju.club.modules.role.controller;

import com.vju.club.modules.role.service.RoleService;

import com.vju.club.security.Actor;
import com.vju.club.modules.role.config.request.AssignRoleRequest;
import com.vju.club.modules.role.config.request.CreateRoleRequest;
import com.vju.club.modules.role.config.response.RoleResponse;
import com.vju.club.modules.role.config.request.UpdateRoleRequest;
import com.vju.club.modules.role.config.response.UserRoleResponse;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1")
public class RoleController {

    private final RoleService roleService;

    public RoleController(RoleService roleService) {
        this.roleService = roleService;
    }

    @GetMapping("/roles")
    public List<RoleResponse> list(Actor actor) {
        return roleService.list(actor);
    }

    @GetMapping("/roles/{roleId}")
    public RoleResponse get(Actor actor, @PathVariable UUID roleId) {
        return roleService.get(actor, roleId);
    }

    @PostMapping("/roles")
    public ResponseEntity<RoleResponse> create(Actor actor, @Valid @RequestBody CreateRoleRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(roleService.create(actor, request));
    }

    @PatchMapping("/roles/{roleId}")
    public RoleResponse update(Actor actor, @PathVariable UUID roleId,
                               @Valid @RequestBody UpdateRoleRequest request) {
        return roleService.update(actor, roleId, request);
    }

    @GetMapping("/users/me/roles")
    public List<UserRoleResponse> listOwn(Actor actor) {
        return roleService.listAssignments(actor, actor.id());
    }

    @GetMapping("/users/{userId}/roles")
    public List<UserRoleResponse> listForUser(Actor actor, @PathVariable UUID userId) {
        return roleService.listAssignments(actor, userId);
    }

    @PostMapping("/users/{userId}/roles")
    public ResponseEntity<UserRoleResponse> assign(Actor actor, @PathVariable UUID userId,
                                                   @Valid @RequestBody AssignRoleRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(roleService.assign(actor, userId, request));
    }

    @DeleteMapping("/users/{userId}/roles/{assignmentId}")
    public ResponseEntity<Void> revoke(Actor actor, @PathVariable UUID userId,
                                       @PathVariable UUID assignmentId) {
        roleService.revoke(actor, userId, assignmentId);
        return ResponseEntity.noContent().build();
    }
}
