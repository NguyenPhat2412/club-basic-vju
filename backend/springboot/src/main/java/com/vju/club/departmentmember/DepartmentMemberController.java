package com.vju.club.departmentmember;

import com.vju.club.common.dto.PageResponse;
import com.vju.club.departmentmember.dto.AddDepartmentMemberRequest;
import com.vju.club.departmentmember.dto.DepartmentMemberResponse;
import com.vju.club.departmentmember.dto.MoveDepartmentMemberRequest;
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
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

@RestController
@RequestMapping("/api/v1/departments/{departmentId}/members")
public class DepartmentMemberController {
    private final DepartmentMemberService service;
    public DepartmentMemberController(DepartmentMemberService service) { this.service = service; }

    @GetMapping
    public PageResponse<DepartmentMemberResponse> list(Authentication authentication, @PathVariable UUID departmentId,
                                                       @RequestParam(defaultValue = "0") int offset,
                                                       @RequestParam(defaultValue = "20") int limit) {
        return service.list(authentication, departmentId, offset, limit);
    }
    @PostMapping
    public ResponseEntity<DepartmentMemberResponse> add(Authentication authentication, @PathVariable UUID departmentId,
                                                        @Valid @RequestBody AddDepartmentMemberRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(service.add(authentication, departmentId, request));
    }
    @DeleteMapping("/{membershipId}")
    public ResponseEntity<Void> remove(Authentication authentication, @PathVariable UUID departmentId,
                                       @PathVariable UUID membershipId) {
        service.remove(authentication, departmentId, membershipId);
        return ResponseEntity.noContent().build();
    }
    @PatchMapping("/{membershipId}")
    public DepartmentMemberResponse move(Authentication authentication, @PathVariable UUID departmentId,
                                         @PathVariable UUID membershipId,
                                         @Valid @RequestBody MoveDepartmentMemberRequest request) {
        return service.move(authentication, departmentId, membershipId, request);
    }
}
