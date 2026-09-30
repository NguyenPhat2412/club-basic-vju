package com.vju.club.department;

import com.vju.club.common.dto.PageResponse;
import com.vju.club.department.dto.DepartmentPatchRequest;
import com.vju.club.department.dto.DepartmentRequest;
import com.vju.club.department.dto.DepartmentResponse;
import com.vju.club.department.dto.DepartmentStatusRequest;
import com.vju.club.entity.Club;
import com.vju.club.entity.ClubStatus;
import com.vju.club.entity.Department;
import com.vju.club.entity.DepartmentStatus;
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
        if (!clubRepository.existsById(clubId)) throw notFound("CLUB_NOT_FOUND", "Club not found");
        var items = departmentDao.findByClub(clubId, offset, limit).stream().map(DepartmentResponse::from).toList();
        return new PageResponse<>(items, departmentRepository.countByClub_Id(clubId), offset, limit);
    }

    @Override
    @Transactional(readOnly = true)
    public DepartmentResponse get(Authentication authentication, UUID departmentId) {
        return DepartmentResponse.from(authorize(authentication, "department.view", departmentId));
    }

    @Override
    @Transactional
    public DepartmentResponse create(Authentication authentication, UUID clubId, DepartmentRequest request) {
        authorizationService.require(authentication, "department.create", clubId, null);
        Club club = clubRepository.findById(clubId).orElseThrow(() -> notFound("CLUB_NOT_FOUND", "Club not found"));
        if (club.getStatus() != ClubStatus.ACTIVE) {
            throw new ApiException(HttpStatus.CONFLICT, "CLUB_INACTIVE", "Club is inactive");
        }
        String name = request.name().trim();
        if (departmentRepository.existsByClub_IdAndNameIgnoreCase(clubId, name)) {
            throw nameTaken();
        }
        Department department = new Department();
        department.setClub(club);
        department.setName(name);
        department.setDescription(request.description());
        return DepartmentResponse.from(departmentRepository.saveAndFlush(department));
    }

    @Override
    @Transactional
    public DepartmentResponse update(Authentication authentication, UUID departmentId, DepartmentPatchRequest request) {
        Department department = authorize(authentication, "department.update", departmentId);
        if (request.name() != null) {
            String name = request.name().trim();
            if (name.isEmpty()) {
                throw new ApiException(HttpStatus.BAD_REQUEST, "INVALID_DEPARTMENT_NAME", "Department name cannot be blank");
            }
            if (!department.getName().equalsIgnoreCase(name)
                    && departmentRepository.existsByClub_IdAndNameIgnoreCase(department.getClub().getId(), name)) {
                throw nameTaken();
            }
            department.setName(name);
        }
        if (request.description() != null) department.setDescription(request.description());
        return DepartmentResponse.from(departmentRepository.saveAndFlush(department));
    }

    @Override
    @Transactional
    public DepartmentResponse updateStatus(Authentication authentication, UUID departmentId, DepartmentStatusRequest request) {
        String permission = request.status() == DepartmentStatus.ACTIVE ? "department.activate" : "department.inactive";
        Department department = authorize(authentication, permission, departmentId);
        department.setStatus(request.status());
        return DepartmentResponse.from(departmentRepository.saveAndFlush(department));
    }

    /** Checks the permission at department scope or at the scope of the department's club. */
    private Department authorize(Authentication authentication, String permissionKey, UUID departmentId) {
        Department department = departmentRepository.findById(departmentId).orElseThrow(() ->
                authorizationService.missingResource(authentication, permissionKey,
                        notFound("DEPARTMENT_NOT_FOUND", "Department not found")));
        authorizationService.require(authentication, permissionKey, department.getClub().getId(), department.getId());
        return department;
    }

    private ApiException nameTaken() {
        return new ApiException(HttpStatus.CONFLICT, "DEPARTMENT_NAME_ALREADY_EXISTS", "Department name is already used");
    }

    private ApiException notFound(String code, String message) { return new ApiException(HttpStatus.NOT_FOUND, code, message); }
}
