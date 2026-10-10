package com.vju.club.modules.departmentmember.repository;

import com.vju.club.modules.departmentmember.entity.DepartmentMember;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface DepartmentMemberRepository extends JpaRepository<DepartmentMember, UUID> {
    @Query("SELECT dm FROM DepartmentMember dm JOIN FETCH dm.department "
            + "WHERE dm.membership.id IN :membershipIds ORDER BY dm.department.name, dm.department.id")
    List<DepartmentMember> findForMemberships(@Param("membershipIds") List<UUID> membershipIds);
    @Query("SELECT dm FROM DepartmentMember dm JOIN FETCH dm.membership "
            + "WHERE dm.department.id = :departmentId ORDER BY dm.joinedAt ASC, dm.id ASC")
    List<DepartmentMember> findPageByDepartment(@Param("departmentId") UUID departmentId, Pageable pageable);

    Optional<DepartmentMember> findByDepartment_IdAndMembership_Id(UUID departmentId, UUID membershipId);
    long countByDepartment_Id(UUID departmentId);

    @Modifying(flushAutomatically = true)
    @Query("DELETE FROM DepartmentMember dm WHERE dm.membership.id = :membershipId")
    int deleteByMembershipId(@Param("membershipId") UUID membershipId);
}
