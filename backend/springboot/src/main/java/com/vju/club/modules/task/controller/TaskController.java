package com.vju.club.modules.task.controller;

import com.vju.club.common.dto.PageResponse;
import com.vju.club.modules.task.dto.request.CreateTaskRequest;
import com.vju.club.modules.task.dto.request.UpdateTaskProgressRequest;
import com.vju.club.modules.task.dto.response.TaskResponse;
import com.vju.club.modules.task.enums.TaskStatus;
import com.vju.club.modules.task.service.TaskService;
import com.vju.club.security.Actor;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

@RestController
@RequestMapping("/api/v1")
@RequiredArgsConstructor
@Tag(name = "Tasks", description = "Giao việc, cập nhật tiến độ, nghiệm thu công việc và cảnh báo quá hạn (TC08–TC10)")
public class TaskController {
    private final TaskService taskService;

    @PostMapping("/clubs/{clubId}/tasks")
    @Operation(summary = "Tạo và giao công việc cho thành viên (TC08)",
            description = "Quyền: task.create tại CLB hoặc Ban. Trưởng ban chỉ được giao việc cho thành viên thuộc ban mình (TC08 3a).")
    public ResponseEntity<TaskResponse> create(Actor actor,
                                               @PathVariable UUID clubId,
                                               @Valid @RequestBody CreateTaskRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(taskService.create(actor, clubId, request));
    }

    @GetMapping("/clubs/{clubId}/tasks")
    @Operation(summary = "Danh sách công việc trong CLB / Ban")
    public PageResponse<TaskResponse> listForClub(Actor actor,
                                                  @PathVariable UUID clubId,
                                                  @RequestParam(required = false) UUID departmentId,
                                                  @RequestParam(required = false) TaskStatus status,
                                                  @RequestParam(required = false) UUID assigneeId,
                                                  @RequestParam(defaultValue = "0") @Min(0) int offset,
                                                  @RequestParam(defaultValue = "20") @Min(1) @Max(100) int limit) {
        return taskService.listForClub(actor, clubId, departmentId, status, assigneeId, offset, limit);
    }

    @GetMapping("/users/me/tasks")
    @Operation(summary = "Danh sách công việc được giao cho tôi")
    public PageResponse<TaskResponse> listMine(Actor actor,
                                               @RequestParam(required = false) TaskStatus status,
                                               @RequestParam(defaultValue = "0") @Min(0) int offset,
                                               @RequestParam(defaultValue = "20") @Min(1) @Max(100) int limit) {
        return taskService.listMine(actor, status, offset, limit);
    }

    @PatchMapping("/tasks/{taskId}/progress")
    @Operation(summary = "Cập nhật tiến độ công việc bởi người được giao (TC09)",
            description = "Chỉ người nhận việc (assignee) được phép cập nhật progressPercent (0..100), status (TODO, IN_PROGRESS, DONE), progressNote, reportLink.")
    public TaskResponse updateProgress(Actor actor,
                                       @PathVariable UUID taskId,
                                       @Valid @RequestBody UpdateTaskProgressRequest request) {
        return taskService.updateProgress(actor, taskId, request);
    }

    @PatchMapping("/tasks/{taskId}/verify")
    @Operation(summary = "Nghiệm thu hoàn thành công việc (TC10)",
            description = "Quyền: task.verify tại CLB hoặc Ban. Chuyển công việc từ DONE sang COMPLETED.")
    public TaskResponse verify(Actor actor, @PathVariable UUID taskId) {
        return taskService.verify(actor, taskId);
    }
}
