package com.vju.club.repository;

import com.vju.club.entity.DepartmentMember;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface DepartmentMemberRepository extends JpaRepository<DepartmentMember, UUID> {
    List<DepartmentMember> findByDepartment_IdOrderByJoinedAtAsc(UUID departmentId);
    Optional<DepartmentMember> findByDepartment_IdAndMembership_Id(UUID departmentId, UUID membershipId);
    long countByDepartment_Id(UUID departmentId);
}
