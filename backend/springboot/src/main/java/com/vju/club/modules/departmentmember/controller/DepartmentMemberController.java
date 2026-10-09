package com.vju.club.modules.departmentmember.controller;

import lombok.RequiredArgsConstructor;
import com.vju.club.modules.departmentmember.service.DepartmentMemberService;

import com.vju.club.security.Actor;
import com.vju.club.common.dto.PageResponse;
import com.vju.club.modules.departmentmember.dto.request.AddDepartmentMemberRequest;
import com.vju.club.modules.departmentmember.dto.response.DepartmentMemberResponse;
import com.vju.club.modules.departmentmember.dto.request.MoveDepartmentMemberRequest;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
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
@RequiredArgsConstructor
public class DepartmentMemberController {
    private final DepartmentMemberService service;
    @GetMapping
    public PageResponse<DepartmentMemberResponse> list(Actor actor, @PathVariable UUID departmentId,
                                                       @RequestParam(defaultValue = "0") @Min(0) int offset,
                                                       @RequestParam(defaultValue = "20") @Min(1) @Max(100) int limit) {
        return service.list(actor, departmentId, offset, limit);
    }
    @PostMapping
    public ResponseEntity<DepartmentMemberResponse> add(Actor actor, @PathVariable UUID departmentId,
                                                        @Valid @RequestBody AddDepartmentMemberRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(service.add(actor, departmentId, request));
    }
    @DeleteMapping("/{membershipId}")
    public ResponseEntity<Void> remove(Actor actor, @PathVariable UUID departmentId,
                                       @PathVariable UUID membershipId) {
        service.remove(actor, departmentId, membershipId);
        return ResponseEntity.noContent().build();
    }
    @PatchMapping("/{membershipId}")
    public DepartmentMemberResponse move(Actor actor, @PathVariable UUID departmentId,
                                         @PathVariable UUID membershipId,
                                         @Valid @RequestBody MoveDepartmentMemberRequest request) {
        return service.move(actor, departmentId, membershipId, request);
    }
}
