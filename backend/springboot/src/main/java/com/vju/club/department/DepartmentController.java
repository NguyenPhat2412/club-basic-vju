package com.vju.club.department;

import com.vju.club.common.dto.PageResponse;
import com.vju.club.department.dto.DepartmentPatchRequest;
import com.vju.club.department.dto.DepartmentRequest;
import com.vju.club.department.dto.DepartmentResponse;
import com.vju.club.department.dto.DepartmentStatusRequest;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
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
public class DepartmentController {
    private final DepartmentService departmentService;

    public DepartmentController(DepartmentService departmentService) { this.departmentService = departmentService; }

    @GetMapping("/clubs/{clubId}/departments")
    public PageResponse<DepartmentResponse> list(Authentication authentication, @PathVariable UUID clubId,
                                                 @RequestParam(defaultValue = "0") @Min(0) int offset,
                                                 @RequestParam(defaultValue = "20") @Min(1) @Max(100) int limit) {
        return departmentService.list(authentication, clubId, offset, limit);
    }

    @GetMapping("/departments/{departmentId}")
    public DepartmentResponse get(Authentication authentication, @PathVariable UUID departmentId) {
        return departmentService.get(authentication, departmentId);
    }

    @PostMapping("/clubs/{clubId}/departments")
    public ResponseEntity<DepartmentResponse> create(Authentication authentication, @PathVariable UUID clubId,
                                                      @Valid @RequestBody DepartmentRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(departmentService.create(authentication, clubId, request));
    }

    @PatchMapping("/departments/{departmentId}")
    public DepartmentResponse update(Authentication authentication, @PathVariable UUID departmentId,
                                     @Valid @RequestBody DepartmentPatchRequest request) {
        return departmentService.update(authentication, departmentId, request);
    }

    @PatchMapping("/departments/{departmentId}/status")
    public DepartmentResponse updateStatus(Authentication authentication, @PathVariable UUID departmentId,
                                           @Valid @RequestBody DepartmentStatusRequest request) {
        return departmentService.updateStatus(authentication, departmentId, request);
    }
}
