package com.vju.club.permission;

import com.vju.club.permission.dto.GrantPermissionRequest;
import com.vju.club.permission.dto.PermissionResponse;
import com.vju.club.permission.dto.UserPermissionResponse;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;
import com.vju.club.entity.PermissionScope;

@RestController
@RequestMapping("/api/v1")
public class PermissionController {

    private final PermissionService permissionService;

    public PermissionController(PermissionService permissionService) {
        this.permissionService = permissionService;
    }

    @GetMapping("/permissions")
    @PreAuthorize("@permissionAuthorizationService.hasPermission(authentication, 'permission.view', null, null)")
    public List<PermissionResponse> list() {
        return permissionService.list();
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
        return permissionService.listUserPermissions(authentication, com.vju.club.security.SecurityIdentity.userId(authentication));
    }

    @DeleteMapping("/users/{userId}/permissions/{permissionId}")
    public ResponseEntity<Void> revoke(
            Authentication authentication,
            @PathVariable UUID userId,
            @PathVariable UUID permissionId,
            @org.springframework.web.bind.annotation.RequestParam(required = false) PermissionScope scope,
            @org.springframework.web.bind.annotation.RequestParam(required = false) UUID clubId,
            @org.springframework.web.bind.annotation.RequestParam(required = false) UUID departmentId) {
        permissionService.revoke(authentication, userId, permissionId, scope, clubId, departmentId);
        return ResponseEntity.noContent().build();
    }
}
