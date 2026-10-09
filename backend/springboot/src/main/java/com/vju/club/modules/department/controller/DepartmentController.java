package com.vju.club.modules.department.controller;

import lombok.RequiredArgsConstructor;
import com.vju.club.modules.department.service.DepartmentService;

import com.vju.club.security.Actor;
import com.vju.club.common.dto.PageResponse;
import com.vju.club.modules.department.dto.request.DepartmentPatchRequest;
import com.vju.club.modules.department.dto.request.DepartmentRequest;
import com.vju.club.modules.department.dto.response.DepartmentResponse;
import com.vju.club.modules.department.dto.request.DepartmentStatusRequest;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
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
@RequestMapping("/api/v1")
@RequiredArgsConstructor
public class DepartmentController {
    private final DepartmentService departmentService;

    @GetMapping("/clubs/{clubId}/departments")
    public PageResponse<DepartmentResponse> list(Actor actor, @PathVariable UUID clubId,
                                                 @RequestParam(defaultValue = "0") @Min(0) int offset,
                                                 @RequestParam(defaultValue = "20") @Min(1) @Max(100) int limit) {
        return departmentService.list(actor, clubId, offset, limit);
    }

    @GetMapping("/departments/{departmentId}")
    public DepartmentResponse get(Actor actor, @PathVariable UUID departmentId) {
        return departmentService.get(actor, departmentId);
    }

    @PostMapping("/clubs/{clubId}/departments")
    public ResponseEntity<DepartmentResponse> create(Actor actor, @PathVariable UUID clubId,
                                                      @Valid @RequestBody DepartmentRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(departmentService.create(actor, clubId, request));
    }

    @PatchMapping("/departments/{departmentId}")
    public DepartmentResponse update(Actor actor, @PathVariable UUID departmentId,
                                     @Valid @RequestBody DepartmentPatchRequest request) {
        return departmentService.update(actor, departmentId, request);
    }

    @PatchMapping("/departments/{departmentId}/status")
    public DepartmentResponse updateStatus(Actor actor, @PathVariable UUID departmentId,
                                           @Valid @RequestBody DepartmentStatusRequest request) {
        return departmentService.updateStatus(actor, departmentId, request);
    }
}
