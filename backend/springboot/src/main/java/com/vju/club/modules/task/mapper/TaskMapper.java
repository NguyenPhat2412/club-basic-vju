package com.vju.club.modules.task.mapper;

import com.vju.club.modules.task.dto.response.TaskResponse;
import com.vju.club.modules.task.entity.Task;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

@Mapper
public interface TaskMapper {
    @Mapping(target = "clubId", source = "club.id")
    @Mapping(target = "clubCode", source = "club.code")
    @Mapping(target = "clubName", source = "club.name")
    @Mapping(target = "departmentId", source = "department.id")
    @Mapping(target = "departmentName", source = "department.name")
    @Mapping(target = "eventId", source = "event.id")
    @Mapping(target = "eventTitle", source = "event.title")
    @Mapping(target = "assigneeId", source = "assignee.id")
    @Mapping(target = "assigneeFullName", source = "assignee.fullName")
    @Mapping(target = "assigneeEmail", source = "assignee.email")
    @Mapping(target = "assignerId", source = "assigner.id")
    @Mapping(target = "assignerFullName", source = "assigner.fullName")
    @Mapping(target = "verifiedBy", source = "verifiedBy.id")
    TaskResponse toResponse(Task task);
}
