package com.vju.club.department;

import com.vju.club.club.dto.ClubResponse;
import com.vju.club.common.dto.PageResponse;
import com.vju.club.department.dto.DepartmentPatchRequest;
import com.vju.club.department.dto.DepartmentRequest;
import com.vju.club.department.dto.DepartmentResponse;
import com.vju.club.department.dto.DepartmentStatusRequest;
import com.vju.club.entity.Club;
import com.vju.club.entity.Department;
import com.vju.club.error.ApiException;
import com.vju.club.repository.ClubRepository;
import com.vju.club.repository.DepartmentRepository;
import com.vju.club.security.PermissionAuthorizationService;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Service
public class DepartmentServiceImpl implements DepartmentService {
    private final DepartmentRepository departmentRepository;
    private final DepartmentDao departmentDao;
    private final ClubRepository clubRepository;
    private final PermissionAuthorizationService authorizationService;

    public DepartmentServiceImpl(DepartmentRepository departmentRepository, DepartmentDao departmentDao,
                                 ClubRepository clubRepository, PermissionAuthorizationService authorizationService) {
        this.departmentRepository = departmentRepository;
        this.departmentDao = departmentDao;
        this.clubRepository = clubRepository;
        this.authorizationService = authorizationService;
    }

    @Override
    @Transactional(readOnly = true)
    public PageResponse<DepartmentResponse> list(Authentication authentication, UUID clubId, int offset, int limit) {
        authorizationService.require(authentication, "department.view", clubId, null);
        var items = departmentDao.findByClub(clubId, offset, limit).stream().map(DepartmentResponse::from).toList();
        return new PageResponse<>(items, departmentRepository.countByClub_Id(clubId), Math.max(0, offset), Math.max(1, Math.min(limit, 100)));
    }

    @Override
    @Transactional(readOnly = true)
    public DepartmentResponse get(Authentication authentication, UUID departmentId) {
        Department department = findDepartment(departmentId);
        authorizationService.require(authentication, "department.view", department.getClub().getId(), null);
        return DepartmentResponse.from(department);
    }

    @Override
    @Transactional
    public DepartmentResponse create(Authentication authentication, UUID clubId, DepartmentRequest request) {
        authorizationService.require(authentication, "department.create", clubId, null);
        Club club = clubRepository.findById(clubId).orElseThrow(() -> notFound("CLUB_NOT_FOUND", "Club not found"));
        if (departmentRepository.existsByClub_IdAndNameIgnoreCase(clubId, request.name().trim())) {
            throw new ApiException(HttpStatus.CONFLICT, "DEPARTMENT_NAME_ALREADY_EXISTS", "Department name is already used");
        }
        Department department = new Department();
        department.setClub(club);
        department.setName(request.name().trim());
        department.setDescription(request.description());
        return DepartmentResponse.from(departmentRepository.save(department));
    }

    @Override
    @Transactional
    public DepartmentResponse update(Authentication authentication, UUID departmentId, DepartmentPatchRequest request) {
        Department department = findDepartment(departmentId);
        authorizationService.require(authentication, "department.update", null, departmentId);
        if (request.name() != null && !department.getName().equalsIgnoreCase(request.name().trim())
                && departmentRepository.existsByClub_IdAndNameIgnoreCase(department.getClub().getId(), request.name().trim())) {
            throw new ApiException(HttpStatus.CONFLICT, "DEPARTMENT_NAME_ALREADY_EXISTS", "Department name is already used");
        }
        if (request.name() != null) {
            if (request.name().isBlank()) throw new ApiException(HttpStatus.BAD_REQUEST, "INVALID_DEPARTMENT_NAME", "Department name cannot be blank");
            department.setName(request.name().trim());
        }
        if (request.description() != null) department.setDescription(request.description());
        return DepartmentResponse.from(departmentRepository.save(department));
    }

    @Override
    @Transactional
    public DepartmentResponse updateStatus(Authentication authentication, UUID departmentId, DepartmentStatusRequest request) {
        Department department = findDepartment(departmentId);
        authorizationService.require(authentication,
                request.status() == com.vju.club.entity.DepartmentStatus.ACTIVE ? "department.activate" : "department.inactive",
                null, departmentId);
        department.setStatus(request.status());
        return DepartmentResponse.from(departmentRepository.save(department));
    }

    private Department findDepartment(UUID id) {
        return departmentRepository.findById(id).orElseThrow(() -> notFound("DEPARTMENT_NOT_FOUND", "Department not found"));
    }

    private ApiException notFound(String code, String message) { return new ApiException(HttpStatus.NOT_FOUND, code, message); }
}
