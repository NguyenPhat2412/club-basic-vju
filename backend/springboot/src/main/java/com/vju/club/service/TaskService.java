package com.vju.club.service;

import com.vju.club.dto.request.CreateTaskRequest;
import com.vju.club.dto.request.UpdateTaskProgressRequest;
import com.vju.club.dto.request.UpdateTaskRequest;
import com.vju.club.dto.response.PageResponse;
import com.vju.club.dto.response.TaskResponse;
import com.vju.club.dto.response.TaskSummaryResponse;
import com.vju.club.enums.TaskStatus;
import com.vju.club.security.Actor;

import java.util.UUID;

public interface TaskService {
    TaskResponse create(Actor actor, UUID clubId, CreateTaskRequest request);

    TaskResponse get(Actor actor, UUID taskId);

    TaskResponse update(Actor actor, UUID taskId, UpdateTaskRequest request);

    PageResponse<TaskResponse> listForClub(Actor actor, UUID clubId, UUID departmentId, TaskStatus status,
                                           UUID assigneeId, Boolean overdue, int offset, int limit);

    TaskSummaryResponse summarizeForClub(Actor actor, UUID clubId, UUID departmentId, TaskStatus status,
                                         UUID assigneeId, Boolean overdue);

    PageResponse<TaskResponse> listMine(Actor actor, TaskStatus status, Boolean overdue, int offset, int limit);

    TaskResponse updateProgress(Actor actor, UUID taskId, UpdateTaskProgressRequest request);

    TaskResponse verify(Actor actor, UUID taskId);

    int markOverdueTasks();
}
