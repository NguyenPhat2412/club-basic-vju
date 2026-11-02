package com.vju.club.controller;

import lombok.RequiredArgsConstructor;
import com.vju.club.common.ApiPaths;
import com.vju.club.service.DepartmentService;

import com.vju.club.security.Actor;
import com.vju.club.dto.response.PageResponse;
import com.vju.club.dto.request.DepartmentPatchRequest;
import com.vju.club.dto.request.DepartmentRequest;
import com.vju.club.dto.response.DepartmentResponse;
import com.vju.club.dto.request.DepartmentStatusRequest;
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
@RequestMapping(ApiPaths.API_V1)
@RequiredArgsConstructor
public class DepartmentController {
    private final DepartmentService departmentService;

    @GetMapping(ApiPaths.CLUB_DEPARTMENTS)
    public PageResponse<DepartmentResponse> list(Actor actor, @PathVariable UUID clubId,
                                                 @RequestParam(defaultValue = "0") @Min(0) int offset,
                                                 @RequestParam(defaultValue = "20") @Min(1) @Max(100) int limit) {
        return departmentService.list(actor, clubId, offset, limit);
    }

    @GetMapping(ApiPaths.DEPARTMENT_BY_ID)
    public DepartmentResponse get(Actor actor, @PathVariable UUID departmentId) {
        return departmentService.get(actor, departmentId);
    }

    @PostMapping(ApiPaths.CLUB_DEPARTMENTS)
    public ResponseEntity<DepartmentResponse> create(Actor actor, @PathVariable UUID clubId,
                                                      @Valid @RequestBody DepartmentRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(departmentService.create(actor, clubId, request));
    }

    @PatchMapping(ApiPaths.DEPARTMENT_BY_ID)
    public DepartmentResponse update(Actor actor, @PathVariable UUID departmentId,
                                     @Valid @RequestBody DepartmentPatchRequest request) {
        return departmentService.update(actor, departmentId, request);
    }

    @PatchMapping(ApiPaths.DEPARTMENT_STATUS)
    public DepartmentResponse updateStatus(Actor actor, @PathVariable UUID departmentId,
                                           @Valid @RequestBody DepartmentStatusRequest request) {
        return departmentService.updateStatus(actor, departmentId, request);
    }
}
