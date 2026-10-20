package com.vju.club.modules.department.mapper;

import com.vju.club.modules.department.dto.record.DepartmentRecord;
import com.vju.club.modules.department.dto.response.DepartmentResponse;
import com.vju.club.modules.department.entity.Department;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

@Mapper
public interface DepartmentMapper {
    @Mapping(target = "clubId", source = "club.id")
    DepartmentResponse toResponse(Department department);

    @Mapping(target = "clubId", source = "club.id")
    DepartmentRecord toRecord(Department department);
}
