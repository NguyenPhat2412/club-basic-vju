package com.vju.club.modules.task.service.impl;

import com.vju.club.common.OffsetLimitRequest;
import com.vju.club.common.dto.PageResponse;
import com.vju.club.error.ApiException;
import com.vju.club.modules.audit.enums.AuditAction;
import com.vju.club.modules.audit.service.AuditService;
import com.vju.club.modules.club.entity.Club;
import com.vju.club.modules.club.enums.ClubStatus;
import com.vju.club.modules.club.repository.ClubRepository;
import com.vju.club.modules.department.entity.Department;
import com.vju.club.modules.department.repository.DepartmentRepository;
import com.vju.club.modules.departmentmember.repository.DepartmentMemberRepository;
import com.vju.club.modules.event.entity.Event;
import com.vju.club.modules.event.repository.EventRepository;
import com.vju.club.modules.membership.enums.MembershipStatus;
import com.vju.club.modules.membership.repository.MembershipRepository;
import com.vju.club.modules.notification.service.NotificationService;
import com.vju.club.modules.task.common.TaskConstants;
import com.vju.club.modules.task.dto.request.CreateTaskRequest;
import com.vju.club.modules.task.dto.request.UpdateTaskProgressRequest;
import com.vju.club.modules.task.dto.response.TaskResponse;
import com.vju.club.modules.task.entity.Task;
import com.vju.club.modules.task.enums.TaskPriority;
import com.vju.club.modules.task.enums.TaskStatus;
import com.vju.club.modules.task.mapper.TaskMapper;
import com.vju.club.modules.task.repository.TaskRepository;
import com.vju.club.modules.task.service.TaskService;
import com.vju.club.modules.user.entity.User;
import com.vju.club.modules.user.enums.UserStatus;
import com.vju.club.modules.user.repository.UserRepository;
import com.vju.club.security.Actor;
import com.vju.club.security.PermissionAuthorizationService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.time.OffsetDateTime;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class TaskServiceImpl implements TaskService {
    private static final Sort DEFAULT_SORT = Sort.by(Sort.Order.asc("deadline"), Sort.Order.asc("id"));

    private final TaskRepository taskRepository;
    private final ClubRepository clubRepository;
    private final DepartmentRepository departmentRepository;
    private final DepartmentMemberRepository departmentMemberRepository;
    private final EventRepository eventRepository;
    private final MembershipRepository membershipRepository;
    private final UserRepository userRepository;
    private final PermissionAuthorizationService authorizationService;
    private final NotificationService notificationService;
    private final AuditService auditService;
    private final Clock clock;
    private final TaskMapper taskMapper;

    @Override
    @Transactional
    public TaskResponse create(Actor actor, UUID clubId, CreateTaskRequest request) {
        Club club = clubRepository.findById(clubId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "CLUB_NOT_FOUND", "Club not found"));
        if (club.getStatus() != ClubStatus.ACTIVE) {
            throw new ApiException(HttpStatus.CONFLICT, "CLUB_INACTIVE", "Club is inactive");
        }

        Department department = null;
        if (request.departmentId() != null) {
            department = departmentRepository.findById(request.departmentId())
                    .filter(d -> d.getClub().getId().equals(clubId))
                    .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "DEPARTMENT_NOT_FOUND", "Department not found in club"));
        }

        boolean hasClubCreate = authorizationService.hasPermission(actor, TaskConstants.PERMISSION_CREATE, clubId, null);
        boolean hasDeptCreate = department != null
                && authorizationService.hasPermission(actor, TaskConstants.PERMISSION_CREATE, clubId, department.getId());
        if (!hasClubCreate && !hasDeptCreate) {
            throw new ApiException(HttpStatus.FORBIDDEN, "PERMISSION_DENIED", "Permission denied");
        }

        OffsetDateTime now = OffsetDateTime.now(clock);
        if (!request.deadline().isAfter(now)) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "INVALID_TASK_DEADLINE", "Task deadline must be in the future");
        }

        User assigner = userRepository.findById(actor.id())
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "USER_NOT_FOUND", "User not found"));
        User assignee = userRepository.findById(request.assigneeId())
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "USER_NOT_FOUND", "Assignee not found"));
        if (assignee.getStatus() != UserStatus.ACTIVE) {
            throw new ApiException(HttpStatus.CONFLICT, "USER_INACTIVE", "Assignee account is inactive");
        }

        if (!hasClubCreate) {
            // Department Head can only assign tasks to active members inside their department (TC08 3a)
            if (department == null || !departmentMemberRepository.isUserInDepartment(department.getId(), assignee.getId())) {
                throw new ApiException(HttpStatus.FORBIDDEN, "PERMISSION_SCOPE_MISMATCH",
                        "Department head can only assign tasks to members of their department");
            }
        }

        Event event = null;
        if (request.eventId() != null) {
            event = eventRepository.findById(request.eventId())
                    .filter(e -> e.getClub().getId().equals(clubId))
                    .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "EVENT_NOT_FOUND", "Event not found in club"));
        }

        Task task = new Task();
        task.setClub(club);
        task.setDepartment(department);
        task.setEvent(event);
        task.setTitle(request.title().strip());
        task.setDescription(request.description() == null ? null : request.description().strip());
        task.setPriority(request.priority() == null ? TaskPriority.MEDIUM : request.priority());
        task.setStatus(TaskStatus.TODO);
        task.setProgressPercent(0);
        task.setDeadline(request.deadline());
        task.setAssignee(assignee);
        task.setAssigner(assigner);

        Task saved = taskRepository.save(task);
        notificationService.create(assignee.getId(),
                "Nhiệm vụ mới: " + saved.getTitle(),
                "Bạn được giao nhiệm vụ \"" + saved.getTitle() + "\" tại CLB " + club.getName(),
                saved.getId());

        Map<String, Object> auditValues = new LinkedHashMap<>();
        auditValues.put("title", saved.getTitle());
        auditValues.put("priority", saved.getPriority());
        auditValues.put("status", saved.getStatus());
        auditValues.put("assigneeId", assignee.getId());
        auditValues.put("departmentId", department == null ? null : department.getId());
        auditService.record(actor.id(), AuditAction.TASK_CREATED, saved.getId(), club.getId(), null, auditValues);

        return taskMapper.toResponse(saved);
    }

    @Override
    @Transactional(readOnly = true)
    public PageResponse<TaskResponse> listForClub(Actor actor, UUID clubId, UUID departmentId, TaskStatus status,
                                                  UUID assigneeId, int offset, int limit) {
        Club club = clubRepository.findById(clubId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "CLUB_NOT_FOUND", "Club not found"));
        boolean allowed = authorizationService.hasPermission(actor, TaskConstants.PERMISSION_VIEW, club.getId(), departmentId)
                || membershipRepository.existsByUser_IdAndClub_IdAndStatus(actor.id(), club.getId(), MembershipStatus.ACTIVE);
        if (!allowed) {
            throw new ApiException(HttpStatus.FORBIDDEN, "PERMISSION_DENIED", "Permission denied");
        }
        var page = taskRepository.findByClub(club.getId(), departmentId, status, assigneeId,
                new OffsetLimitRequest(offset, limit, DEFAULT_SORT));
        return new PageResponse<>(page.getContent().stream().map(taskMapper::toResponse).toList(),
                page.getTotalElements(), offset, limit);
    }

    @Override
    @Transactional(readOnly = true)
    public PageResponse<TaskResponse> listMine(Actor actor, TaskStatus status, int offset, int limit) {
        var page = taskRepository.findByAssignee(actor.id(), status, new OffsetLimitRequest(offset, limit, DEFAULT_SORT));
        return new PageResponse<>(page.getContent().stream().map(taskMapper::toResponse).toList(),
                page.getTotalElements(), offset, limit);
    }

    @Override
    @Transactional
    public TaskResponse updateProgress(Actor actor, UUID taskId, UpdateTaskProgressRequest request) {
        Task task = taskRepository.findWithRelationsById(taskId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "TASK_NOT_FOUND", "Task not found"));
        if (!task.getAssignee().getId().equals(actor.id())) {
            throw new ApiException(HttpStatus.FORBIDDEN, "PERMISSION_DENIED", "Only the assignee can update task progress");
        }
        if (task.getStatus() == TaskStatus.COMPLETED) {
            throw new ApiException(HttpStatus.CONFLICT, "TASK_ALREADY_COMPLETED", "Task is already verified and completed");
        }

        Map<String, Object> before = snapshot(task);
        if (request.status() != null) {
            if (request.status() == TaskStatus.COMPLETED || request.status() == TaskStatus.OVERDUE) {
                throw new ApiException(HttpStatus.BAD_REQUEST, "INVALID_TASK_STATUS",
                        "Assignee can only set status to TODO, IN_PROGRESS, or DONE");
            }
            task.setStatus(request.status());
            if (request.status() == TaskStatus.DONE && request.progressPercent() == null) {
                task.setProgressPercent(100);
            }
        }
        if (request.progressPercent() != null) {
            task.setProgressPercent(request.progressPercent());
            if (request.progressPercent() == 100 && request.status() == null) {
                task.setStatus(TaskStatus.DONE);
            } else if (request.progressPercent() > 0 && task.getStatus() == TaskStatus.TODO && request.status() == null) {
                task.setStatus(TaskStatus.IN_PROGRESS);
            }
        }
        if (request.progressNote() != null) {
            task.setProgressNote(request.progressNote().strip());
        }
        if (request.reportLink() != null) {
            task.setReportLink(request.reportLink().strip());
        }

        Task saved = taskRepository.save(task);
        notificationService.create(saved.getAssigner().getId(),
                "Cập nhật tiến độ: " + saved.getTitle(),
                "Nhiệm vụ \"" + saved.getTitle() + "\" đã cập nhật trạng thái " + saved.getStatus()
                        + " (" + saved.getProgressPercent() + "%)",
                saved.getId());
        auditService.recordChange(actor.id(), AuditAction.TASK_PROGRESS_UPDATED, saved.getId(),
                saved.getClub().getId(), before, snapshot(saved));
        return taskMapper.toResponse(saved);
    }

    @Override
    @Transactional
    public TaskResponse verify(Actor actor, UUID taskId) {
        Task task = taskRepository.findWithRelationsById(taskId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "TASK_NOT_FOUND", "Task not found"));
        UUID deptId = task.getDepartment() == null ? null : task.getDepartment().getId();
        authorizationService.require(actor, TaskConstants.PERMISSION_VERIFY, task.getClub().getId(), deptId);
        if (task.getStatus() != TaskStatus.DONE) {
            throw new ApiException(HttpStatus.CONFLICT, "TASK_NOT_DONE", "Task must be in DONE state before verification");
        }
        User verifier = userRepository.findById(actor.id())
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "USER_NOT_FOUND", "User not found"));

        Map<String, Object> before = snapshot(task);
        task.setStatus(TaskStatus.COMPLETED);
        task.setProgressPercent(100);
        task.setVerifiedBy(verifier);
        task.setVerifiedAt(OffsetDateTime.now(clock));

        Task saved = taskRepository.save(task);
        notificationService.create(saved.getAssignee().getId(),
                "Nhiệm vụ hoàn tất: " + saved.getTitle(),
                "Nhiệm vụ \"" + saved.getTitle() + "\" đã được xác nhận hoàn thành.",
                saved.getId());
        auditService.recordChange(actor.id(), AuditAction.TASK_VERIFIED, saved.getId(),
                saved.getClub().getId(), before, snapshot(saved));
        return taskMapper.toResponse(saved);
    }

    @Override
    @Scheduled(fixedDelayString = "${app.tasks.overdue-check-interval:300000}")
    @Transactional
    public int markOverdueTasks() {
        OffsetDateTime now = OffsetDateTime.now(clock);
        List<Task> overdueTasks = taskRepository.findOverdueCandidates(
                List.of(TaskStatus.TODO, TaskStatus.IN_PROGRESS), now);
        for (Task task : overdueTasks) {
            Map<String, Object> before = snapshot(task);
            task.setStatus(TaskStatus.OVERDUE);
            Task saved = taskRepository.save(task);
            String title = "Task quá hạn: " + saved.getTitle();
            String message = "Nhiệm vụ \"" + saved.getTitle() + "\" đã vượt quá hạn hoàn thành.";
            notificationService.create(saved.getAssignee().getId(), title, message, saved.getId());
            if (!saved.getAssigner().getId().equals(saved.getAssignee().getId())) {
                notificationService.create(saved.getAssigner().getId(), title, message, saved.getId());
            }
            auditService.recordChange(null, AuditAction.TASK_OVERDUE_MARKED, saved.getId(),
                    saved.getClub().getId(), before, snapshot(saved));
        }
        return overdueTasks.size();
    }

    private static Map<String, Object> snapshot(Task task) {
        Map<String, Object> values = new LinkedHashMap<>();
        values.put("status", task.getStatus());
        values.put("progressPercent", task.getProgressPercent());
        values.put("progressNote", task.getProgressNote());
        values.put("reportLink", task.getReportLink());
        return values;
    }
}
