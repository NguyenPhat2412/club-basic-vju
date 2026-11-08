package com.vju.club.mapper;

import com.vju.club.dto.record.TaskRecord;
import com.vju.club.dto.response.TaskResponse;
import com.vju.club.entity.Task;
import com.vju.club.enums.TaskStatus;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

import java.time.OffsetDateTime;

@Mapper
public interface TaskMapper {
    @Mapping(target = "clubId", source = "task.club.id")
    @Mapping(target = "clubCode", source = "task.club.code")
    @Mapping(target = "clubName", source = "task.club.name")
    @Mapping(target = "departmentId", source = "task.department.id")
    @Mapping(target = "departmentName", source = "task.department.name")
    @Mapping(target = "eventId", source = "task.event.id")
    @Mapping(target = "eventTitle", source = "task.event.title")
    @Mapping(target = "parentTaskId", source = "task.parentTask.id")
    @Mapping(target = "parentTaskTitle", source = "task.parentTask.title")
    @Mapping(target = "assigneeId", source = "task.assignee.id")
    @Mapping(target = "assigneeFullName", source = "task.assignee.fullName")
    @Mapping(target = "assignerId", source = "task.assigner.id")
    @Mapping(target = "assignerFullName", source = "task.assigner.fullName")
    @Mapping(target = "verifiedBy", source = "task.verifiedBy.id")
    @Mapping(target = "overdue", expression = "java(isOverdue(task, now))")
    TaskResponse toResponse(Task task, OffsetDateTime now);

    default TaskResponse toResponse(Task task) {
        return toResponse(task, OffsetDateTime.now());
    }

    default boolean isOverdue(Task task, OffsetDateTime now) {
        if (task == null || task.getDeadline() == null || now == null) {
            return false;
        }
        return (task.getStatus() == TaskStatus.TODO || task.getStatus() == TaskStatus.IN_PROGRESS)
                && task.getDeadline().isBefore(now);
    }

    @Mapping(target = "clubId", source = "club.id")
    @Mapping(target = "departmentId", source = "department.id")
    @Mapping(target = "eventId", source = "event.id")
    @Mapping(target = "assigneeId", source = "assignee.id")
    @Mapping(target = "assignerId", source = "assigner.id")
    @Mapping(target = "verifiedBy", source = "verifiedBy.id")
    TaskRecord toRecord(Task task);
}
