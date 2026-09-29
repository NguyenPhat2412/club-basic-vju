package com.vju.club.repository;

import com.vju.club.entity.Department;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface DepartmentRepository extends JpaRepository<Department, UUID> {
    List<Department> findByClub_IdOrderByNameAsc(UUID clubId);
    boolean existsByClub_IdAndNameIgnoreCase(UUID clubId, String name);
    long countByClub_Id(UUID clubId);
}
