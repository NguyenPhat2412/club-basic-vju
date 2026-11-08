package com.vju.club.controller;

import com.vju.club.common.ApiPaths;
import com.vju.club.dto.request.CreateTaskRequest;
import com.vju.club.dto.request.UpdateTaskProgressRequest;
import com.vju.club.dto.request.UpdateTaskRequest;
import com.vju.club.dto.response.PageResponse;
import com.vju.club.dto.response.TaskResponse;
import com.vju.club.dto.response.TaskSummaryResponse;
import com.vju.club.enums.TaskStatus;
import com.vju.club.security.Actor;
import com.vju.club.service.TaskService;
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
@RequestMapping(ApiPaths.API_V1)
@RequiredArgsConstructor
@Tag(name = "Tasks", description = "Giao việc, task con, giao việc CTV sự kiện, cập nhật tiến độ, nghiệm thu và cảnh báo quá hạn (TC08–TC10)")
public class TaskController {
    private final TaskService taskService;

    @PostMapping(ApiPaths.CLUB_TASKS)
    @Operation(summary = "Tạo và giao công việc hoặc task con cho thành viên / CTV sự kiện (TC08, PB-26.2, PB-27.1)",
            description = "Quyền: task.create tại CLB hoặc Ban. Trưởng ban chỉ được giao việc cho thành viên thuộc ban mình.")
    public ResponseEntity<TaskResponse> create(Actor actor,
                                               @PathVariable UUID clubId,
                                               @Valid @RequestBody CreateTaskRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(taskService.create(actor, clubId, request));
    }

    @GetMapping(ApiPaths.CLUB_TASKS)
    @Operation(summary = "Danh sách công việc trong CLB / Ban")
    public PageResponse<TaskResponse> listForClub(Actor actor,
                                                  @PathVariable UUID clubId,
                                                  @RequestParam(required = false) UUID departmentId,
                                                  @RequestParam(required = false) TaskStatus status,
                                                  @RequestParam(required = false) UUID assigneeId,
                                                  @RequestParam(required = false) Boolean overdue,
                                                  @RequestParam(defaultValue = "0") @Min(0) int offset,
                                                  @RequestParam(defaultValue = "20") @Min(1) @Max(100) int limit) {
        return taskService.listForClub(actor, clubId, departmentId, status, assigneeId, overdue, offset, limit);
    }

    @GetMapping(ApiPaths.CLUB_TASKS_SUMMARY)
    @Operation(summary = "Tổng hợp số lượng công việc theo trạng thái và quá hạn khớp bộ lọc (PB-29)")
    public TaskSummaryResponse summarizeForClub(Actor actor,
                                                @PathVariable UUID clubId,
                                                @RequestParam(required = false) UUID departmentId,
                                                @RequestParam(required = false) TaskStatus status,
                                                @RequestParam(required = false) UUID assigneeId,
                                                @RequestParam(required = false) Boolean overdue) {
        return taskService.summarizeForClub(actor, clubId, departmentId, status, assigneeId, overdue);
    }

    @GetMapping(ApiPaths.MY_TASKS)
    @Operation(summary = "Danh sách công việc được giao cho tôi")
    public PageResponse<TaskResponse> listMine(Actor actor,
                                               @RequestParam(required = false) TaskStatus status,
                                               @RequestParam(required = false) Boolean overdue,
                                               @RequestParam(defaultValue = "0") @Min(0) int offset,
                                               @RequestParam(defaultValue = "20") @Min(1) @Max(100) int limit) {
        return taskService.listMine(actor, status, overdue, offset, limit);
    }

    @GetMapping(ApiPaths.TASK_BY_ID)
    @Operation(summary = "Chi tiết một công việc (kiểm tra quyền xem theo người nhận / CLB / CTV sự kiện)")
    public TaskResponse get(Actor actor, @PathVariable UUID taskId) {
        return taskService.get(actor, taskId);
    }

    @PatchMapping(ApiPaths.TASK_BY_ID)
    @Operation(summary = "Đổi người phụ trách, điều chỉnh hạn, mức ưu tiên hoặc mở lại công việc (PB-27.1, PB-27.2)")
    public TaskResponse update(Actor actor,
                               @PathVariable UUID taskId,
                               @Valid @RequestBody UpdateTaskRequest request) {
        return taskService.update(actor, taskId, request);
    }

    @PatchMapping(ApiPaths.TASK_PROGRESS)
    @Operation(summary = "Cập nhật tiến độ công việc bởi người được giao (TC09)",
            description = "Chỉ người nhận việc (assignee) được phép cập nhật progressPercent (0..100), status (TODO, IN_PROGRESS, DONE), progressNote, reportLink.")
    public TaskResponse updateProgress(Actor actor,
                                       @PathVariable UUID taskId,
                                       @Valid @RequestBody UpdateTaskProgressRequest request) {
        return taskService.updateProgress(actor, taskId, request);
    }

    @PatchMapping(ApiPaths.TASK_VERIFY)
    @Operation(summary = "Nghiệm thu hoàn thành công việc (TC10)",
            description = "Quyền: task.verify tại CLB hoặc Ban. Chuyển công việc từ DONE sang COMPLETED.")
    public TaskResponse verify(Actor actor, @PathVariable UUID taskId) {
        return taskService.verify(actor, taskId);
    }
}
