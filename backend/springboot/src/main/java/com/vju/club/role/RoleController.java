package com.vju.club.role;

import com.vju.club.role.dto.AssignRoleRequest;
import com.vju.club.role.dto.CreateRoleRequest;
import com.vju.club.role.dto.RoleResponse;
import com.vju.club.role.dto.UpdateRoleRequest;
import com.vju.club.role.dto.UserRoleResponse;
import com.vju.club.security.SecurityIdentity;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
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
    public List<RoleResponse> list(Authentication authentication) {
        return roleService.list(authentication);
    }

    @GetMapping("/roles/{roleId}")
    public RoleResponse get(Authentication authentication, @PathVariable UUID roleId) {
        return roleService.get(authentication, roleId);
    }

    @PostMapping("/roles")
    public ResponseEntity<RoleResponse> create(Authentication authentication, @Valid @RequestBody CreateRoleRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(roleService.create(authentication, request));
    }

    @PatchMapping("/roles/{roleId}")
    public RoleResponse update(Authentication authentication, @PathVariable UUID roleId,
                               @Valid @RequestBody UpdateRoleRequest request) {
        return roleService.update(authentication, roleId, request);
    }

    @GetMapping("/users/me/roles")
    public List<UserRoleResponse> listOwn(Authentication authentication) {
        return roleService.listAssignments(authentication, SecurityIdentity.userId(authentication));
    }

    @GetMapping("/users/{userId}/roles")
    public List<UserRoleResponse> listForUser(Authentication authentication, @PathVariable UUID userId) {
        return roleService.listAssignments(authentication, userId);
    }

    @PostMapping("/users/{userId}/roles")
    public ResponseEntity<UserRoleResponse> assign(Authentication authentication, @PathVariable UUID userId,
                                                   @Valid @RequestBody AssignRoleRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(roleService.assign(authentication, userId, request));
    }

    @DeleteMapping("/users/{userId}/roles/{assignmentId}")
    public ResponseEntity<Void> revoke(Authentication authentication, @PathVariable UUID userId,
                                       @PathVariable UUID assignmentId) {
        roleService.revoke(authentication, userId, assignmentId);
        return ResponseEntity.noContent().build();
    }
}
