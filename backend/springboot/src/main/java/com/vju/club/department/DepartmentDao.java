package com.vju.club.department;

import com.vju.club.entity.Department;

import java.util.List;
import java.util.UUID;

public interface DepartmentDao {
    List<Department> findByClub(UUID clubId, int offset, int limit);
}
