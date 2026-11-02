package com.vju.club.mapper;

import com.vju.club.dto.record.DepartmentRecord;
import com.vju.club.dto.response.DepartmentResponse;
import com.vju.club.entity.Department;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

@Mapper
public interface DepartmentMapper {
    @Mapping(target = "clubId", source = "club.id")
    DepartmentResponse toResponse(Department department);

    @Mapping(target = "clubId", source = "club.id")
    DepartmentRecord toRecord(Department department);
}
