package com.vju.club.permission;

import com.vju.club.permission.dto.GrantPermissionRequest;
import com.vju.club.permission.dto.PermissionResponse;
import com.vju.club.permission.dto.UserPermissionResponse;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;
import com.vju.club.entity.PermissionScope;
import com.vju.club.security.SecurityIdentity;

@RestController
@RequestMapping("/api/v1")
public class PermissionController {

    private final PermissionService permissionService;

    public PermissionController(PermissionService permissionService) {
        this.permissionService = permissionService;
    }

    @GetMapping("/permissions")
    public List<PermissionResponse> list(Authentication authentication) {
        return permissionService.list(authentication);
    }

    @PostMapping("/users/{userId}/permissions")
    public ResponseEntity<UserPermissionResponse> grant(
            Authentication authentication,
            @PathVariable UUID userId,
            @Valid @RequestBody GrantPermissionRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(permissionService.grant(authentication, userId, request));
    }

    @GetMapping("/users/{userId}/permissions")
    public List<UserPermissionResponse> listUserPermissions(Authentication authentication, @PathVariable UUID userId) {
        return permissionService.listUserPermissions(authentication, userId);
    }

    @GetMapping("/users/me/permissions")
    public List<UserPermissionResponse> listOwnPermissions(Authentication authentication) {
        return permissionService.listUserPermissions(authentication, SecurityIdentity.userId(authentication));
    }

    @DeleteMapping("/users/{userId}/permissions/{permissionId}")
    public ResponseEntity<Void> revoke(
            Authentication authentication,
            @PathVariable UUID userId,
            @PathVariable UUID permissionId,
            @RequestParam(required = false) PermissionScope scope,
            @RequestParam(required = false) UUID clubId,
            @RequestParam(required = false) UUID departmentId) {
        permissionService.revoke(authentication, userId, permissionId, scope, clubId, departmentId);
        return ResponseEntity.noContent().build();
    }
}
