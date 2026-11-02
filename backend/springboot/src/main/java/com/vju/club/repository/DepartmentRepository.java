package com.vju.club.repository;

import com.vju.club.entity.Department;
import com.vju.club.enums.DepartmentStatus;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.UUID;

public interface DepartmentRepository extends JpaRepository<Department, UUID> {
    List<Department> findByClub_IdOrderByNameAscIdAsc(UUID clubId);
    List<Department> findByClub_IdOrderByNameAscIdAsc(UUID clubId, Pageable pageable);
    List<Department> findByClub_IdAndStatusOrderByNameAsc(UUID clubId, DepartmentStatus status);
    @Query("SELECT count(d) > 0 FROM Department d WHERE d.club.id = :clubId AND lower(d.name) = lower(:name)")
    boolean existsByClub_IdAndNameIgnoreCase(@Param("clubId") UUID clubId, @Param("name") String name);
    long countByClub_Id(UUID clubId);
}
