package com.vju.club.controller;

import lombok.RequiredArgsConstructor;
import com.vju.club.common.ApiPaths;
import com.vju.club.service.PermissionService;

import com.vju.club.security.Actor;
import com.vju.club.dto.response.EffectivePermissionResponse;
import com.vju.club.dto.request.GrantPermissionRequest;
import com.vju.club.dto.response.PermissionGroupResponse;
import com.vju.club.dto.request.ReplacePermissionsRequest;
import com.vju.club.dto.response.PermissionResponse;
import com.vju.club.dto.response.UserPermissionResponse;
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
import com.vju.club.enums.PermissionScope;

@RestController
@RequestMapping(ApiPaths.API_V1)
@RequiredArgsConstructor
public class PermissionController {
    private final PermissionService permissionService;

    @GetMapping(ApiPaths.PERMISSIONS)
    public List<PermissionResponse> list(Actor actor) {
        return permissionService.list(actor);
    }

    @GetMapping(ApiPaths.PERMISSION_GROUPS)
    public List<PermissionGroupResponse> listGroups(Actor actor) {
        return permissionService.listGroups(actor);
    }

    @PutMapping(ApiPaths.USER_PERMISSIONS)
    public List<UserPermissionResponse> replace(Actor actor, @PathVariable UUID userId,
                                                @Valid @RequestBody ReplacePermissionsRequest request) {
        return permissionService.replace(actor, userId, request);
    }

    @PostMapping(ApiPaths.USER_PERMISSIONS)
    public ResponseEntity<UserPermissionResponse> grant(
            Actor actor,
            @PathVariable UUID userId,
            @Valid @RequestBody GrantPermissionRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(permissionService.grant(actor, userId, request));
    }

    @GetMapping(ApiPaths.USER_PERMISSIONS)
    public List<UserPermissionResponse> listUserPermissions(Actor actor, @PathVariable UUID userId) {
        return permissionService.listUserPermissions(actor, userId);
    }

    @GetMapping(ApiPaths.MY_PERMISSIONS)
    public List<UserPermissionResponse> listOwnPermissions(Actor actor) {
        return permissionService.listUserPermissions(actor, actor.id());
    }

    @GetMapping(ApiPaths.MY_EFFECTIVE_PERMISSIONS)
    public List<EffectivePermissionResponse> listOwnEffective(Actor actor) {
        return permissionService.listEffective(actor, actor.id());
    }

    @GetMapping(ApiPaths.USER_EFFECTIVE_PERMISSIONS)
    public List<EffectivePermissionResponse> listEffective(Actor actor, @PathVariable UUID userId) {
        return permissionService.listEffective(actor, userId);
    }

    @DeleteMapping(ApiPaths.USER_PERMISSION_BY_ID)
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

    @DeleteMapping(ApiPaths.USER_PERMISSION_BY_KEY)
    public ResponseEntity<Void> revokeByKey(
            Actor actor,
            @PathVariable UUID userId,
            @PathVariable String permissionKey,
            @RequestParam(required = false) PermissionScope scope,
            @RequestParam(required = false) UUID clubId,
            @RequestParam(required = false) UUID departmentId) {
        permissionService.revokeByKey(actor, userId, permissionKey, scope, clubId, departmentId);
        return ResponseEntity.noContent().build();
    }
}
