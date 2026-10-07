package com.vju.club.modules.permission.controller;

import com.vju.club.modules.permission.service.PermissionService;

import com.vju.club.security.Actor;
import com.vju.club.modules.permission.config.response.EffectivePermissionResponse;
import com.vju.club.modules.permission.config.request.GrantPermissionRequest;
import com.vju.club.modules.permission.config.response.PermissionGroupResponse;
import com.vju.club.modules.permission.config.request.ReplacePermissionsRequest;
import com.vju.club.modules.permission.config.response.PermissionResponse;
import com.vju.club.modules.permission.config.response.UserPermissionResponse;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;
import com.vju.club.modules.permission.entity.PermissionScope;

@RestController
@RequestMapping("/api/v1")
public class PermissionController {

    private final PermissionService permissionService;

    public PermissionController(PermissionService permissionService) {
        this.permissionService = permissionService;
    }

    @GetMapping("/permissions")
    public List<PermissionResponse> list(Actor actor) {
        return permissionService.list(actor);
    }

    @GetMapping("/permissions/groups")
    public List<PermissionGroupResponse> listGroups(Actor actor) {
        return permissionService.listGroups(actor);
    }

    @PutMapping("/users/{userId}/permissions")
    public List<UserPermissionResponse> replace(Actor actor, @PathVariable UUID userId,
                                                @Valid @RequestBody ReplacePermissionsRequest request) {
        return permissionService.replace(actor, userId, request);
    }

    @PostMapping("/users/{userId}/permissions")
    public ResponseEntity<UserPermissionResponse> grant(
            Actor actor,
            @PathVariable UUID userId,
            @Valid @RequestBody GrantPermissionRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(permissionService.grant(actor, userId, request));
    }

    @GetMapping("/users/{userId}/permissions")
    public List<UserPermissionResponse> listUserPermissions(Actor actor, @PathVariable UUID userId) {
        return permissionService.listUserPermissions(actor, userId);
    }

    @GetMapping("/users/me/permissions")
    public List<UserPermissionResponse> listOwnPermissions(Actor actor) {
        return permissionService.listUserPermissions(actor, actor.id());
    }

    @GetMapping("/users/me/effective-permissions")
    public List<EffectivePermissionResponse> listOwnEffective(Actor actor) {
        return permissionService.listEffective(actor, actor.id());
    }

    @GetMapping("/users/{userId}/effective-permissions")
    public List<EffectivePermissionResponse> listEffective(Actor actor, @PathVariable UUID userId) {
        return permissionService.listEffective(actor, userId);
    }

    @DeleteMapping("/users/{userId}/permissions/{permissionId}")
    public ResponseEntity<Void> revoke(
            Actor actor,
            @PathVariable UUID userId,
            @PathVariable UUID permissionId,
            @RequestParam(required = false) PermissionScope scope,
            @RequestParam(required = false) UUID clubId,
            @RequestParam(required = false) UUID departmentId) {
        permissionService.revoke(actor, userId, permissionId, scope, clubId, departmentId);
        return ResponseEntity.noContent().build();
    }
}
