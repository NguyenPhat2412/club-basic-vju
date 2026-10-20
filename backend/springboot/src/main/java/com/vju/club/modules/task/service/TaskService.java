package com.vju.club.modules.task.service;

import com.vju.club.common.dto.PageResponse;
import com.vju.club.modules.task.dto.request.CreateTaskRequest;
import com.vju.club.modules.task.dto.request.UpdateTaskProgressRequest;
import com.vju.club.modules.task.dto.response.TaskResponse;
import com.vju.club.modules.task.enums.TaskStatus;
import com.vju.club.security.Actor;

import java.util.UUID;

public interface TaskService {
    TaskResponse create(Actor actor, UUID clubId, CreateTaskRequest request);

    PageResponse<TaskResponse> listForClub(Actor actor, UUID clubId, UUID departmentId, TaskStatus status, UUID assigneeId, int offset, int limit);

    PageResponse<TaskResponse> listMine(Actor actor, TaskStatus status, int offset, int limit);

    TaskResponse updateProgress(Actor actor, UUID taskId, UpdateTaskProgressRequest request);

    TaskResponse verify(Actor actor, UUID taskId);

    int markOverdueTasks();
}
