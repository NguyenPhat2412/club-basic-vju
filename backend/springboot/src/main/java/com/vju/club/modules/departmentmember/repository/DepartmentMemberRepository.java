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
    @Query("SELECT dm FROM DepartmentMember dm JOIN FETCH dm.membership m JOIN FETCH m.user "
            + "WHERE dm.department.id = :departmentId ORDER BY dm.joinedAt ASC, dm.id ASC")
    List<DepartmentMember> findPageByDepartment(@Param("departmentId") UUID departmentId, Pageable pageable);

    Optional<DepartmentMember> findByDepartment_IdAndMembership_Id(UUID departmentId, UUID membershipId);
    long countByDepartment_Id(UUID departmentId);

    @Modifying(flushAutomatically = true)
    @Query("DELETE FROM DepartmentMember dm WHERE dm.membership.id = :membershipId")
    int deleteByMembershipId(@Param("membershipId") UUID membershipId);

    @Query("SELECT COUNT(dm) > 0 FROM DepartmentMember dm WHERE dm.department.id = :departmentId "
            + "AND dm.membership.user.id = :userId "
            + "AND dm.membership.status = com.vju.club.modules.membership.enums.MembershipStatus.ACTIVE")
    boolean isUserInDepartment(@Param("departmentId") UUID departmentId, @Param("userId") UUID userId);

    @Query("SELECT dm.membership.user.id FROM DepartmentMember dm WHERE dm.department.id = :departmentId "
            + "AND dm.membership.status = com.vju.club.modules.membership.enums.MembershipStatus.ACTIVE")
    List<UUID> findActiveUserIdsByDepartmentId(@Param("departmentId") UUID departmentId);
}
