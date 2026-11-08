package com.vju.club.service.impl;

import com.vju.club.common.OffsetLimitRequest;
import com.vju.club.common.TaskConstants;
import com.vju.club.dto.request.CreateTaskRequest;
import com.vju.club.dto.request.UpdateTaskProgressRequest;
import com.vju.club.dto.request.UpdateTaskRequest;
import com.vju.club.dto.response.PageResponse;
import com.vju.club.dto.response.TaskResponse;
import com.vju.club.dto.response.TaskSummaryResponse;
import com.vju.club.entity.Club;
import com.vju.club.entity.Department;
import com.vju.club.entity.Event;
import com.vju.club.entity.Task;
import com.vju.club.entity.User;
import com.vju.club.enums.AuditAction;
import com.vju.club.enums.ClubStatus;
import com.vju.club.enums.EventRegistrationStatus;
import com.vju.club.enums.EventStatus;
import com.vju.club.enums.MembershipStatus;
import com.vju.club.enums.TaskPriority;
import com.vju.club.enums.TaskStatus;
import com.vju.club.enums.UserStatus;
import com.vju.club.error.ApiException;
import com.vju.club.mapper.TaskMapper;
import com.vju.club.repository.ClubRepository;
import com.vju.club.repository.DepartmentMemberRepository;
import com.vju.club.repository.DepartmentRepository;
import com.vju.club.repository.EventRegistrationRepository;
import com.vju.club.repository.EventRepository;
import com.vju.club.repository.MembershipRepository;
import com.vju.club.repository.TaskRepository;
import com.vju.club.repository.UserRepository;
import com.vju.club.security.Actor;
import com.vju.club.security.PermissionAuthorizationService;
import com.vju.club.service.AuditService;
import com.vju.club.service.NotificationService;
import com.vju.club.service.TaskService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.time.Duration;
import java.time.OffsetDateTime;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class TaskServiceImpl implements TaskService {
    private static final Sort DEFAULT_SORT = Sort.by(Sort.Order.asc("deadline"), Sort.Order.asc("id"));
    private static final Set<TaskStatus> OPEN_STATUSES = Set.of(TaskStatus.TODO, TaskStatus.IN_PROGRESS);
    private static final Duration EVENT_TASK_POST_END_BUFFER = Duration.ofDays(7);

    private final TaskRepository taskRepository;
    private final ClubRepository clubRepository;
    private final DepartmentRepository departmentRepository;
    private final DepartmentMemberRepository departmentMemberRepository;
    private final EventRepository eventRepository;
    private final EventRegistrationRepository registrationRepository;
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

        Task parentTask = null;
        if (request.parentTaskId() != null) {
            parentTask = taskRepository.findWithRelationsById(request.parentTaskId())
                    .filter(p -> p.getClub().getId().equals(clubId))
                    .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "PARENT_TASK_NOT_FOUND",
                            "Parent task not found in this club"));
            if (parentTask.getParentTask() != null) {
                throw new ApiException(HttpStatus.BAD_REQUEST, "TASK_INVALID_HIERARCHY",
                        "Subtasks cannot be nested more than one level deep");
            }
            if (parentTask.getStatus() == TaskStatus.COMPLETED || parentTask.getStatus() == TaskStatus.CANCELLED) {
                throw new ApiException(HttpStatus.CONFLICT, "PARENT_TASK_CLOSED",
                        "Cannot add subtasks to a completed or cancelled parent task");
            }
            if (request.deadline().isAfter(parentTask.getDeadline())) {
                throw new ApiException(HttpStatus.BAD_REQUEST, "SUBTASK_DEADLINE_EXCEEDS_PARENT",
                        "Subtask deadline must not exceed parent task deadline");
            }
        }

        boolean hasClubCreate = authorizationService.hasPermission(actor, TaskConstants.PERMISSION_CREATE, clubId, null);
        boolean hasDeptCreate = department != null
                && authorizationService.hasPermission(actor, TaskConstants.PERMISSION_CREATE, clubId, department.getId());
        if (!hasClubCreate && !hasDeptCreate) {
            throw new ApiException(HttpStatus.FORBIDDEN, "PERMISSION_DENIED", "Permission denied");
        }
        if (!hasClubCreate && parentTask != null) {
            boolean ownsParent = parentTask.getAssignee().getId().equals(actor.id())
                    || (parentTask.getDepartment() != null
                        && department != null
                        && parentTask.getDepartment().getId().equals(department.getId()));
            if (!ownsParent) {
                throw new ApiException(HttpStatus.FORBIDDEN, "PERMISSION_DENIED",
                        "Department head can only create subtasks under tasks assigned to them or within their department");
            }
        }

        OffsetDateTime now = OffsetDateTime.now(clock);
        if (!request.deadline().isAfter(now)) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "INVALID_TASK_DEADLINE", "Task deadline must be in the future");
        }

        Event event = null;
        if (request.eventId() != null) {
            event = eventRepository.findById(request.eventId())
                    .filter(e -> e.getClub().getId().equals(clubId))
                    .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "EVENT_NOT_FOUND", "Event not found in club"));
            if (parentTask != null && parentTask.getEvent() != null && !parentTask.getEvent().getId().equals(event.getId())) {
                throw new ApiException(HttpStatus.BAD_REQUEST, "TASK_EVENT_MISMATCH",
                        "Subtask event must match parent task event");
            }
        } else if (parentTask != null && parentTask.getEvent() != null) {
            event = parentTask.getEvent();
        }
        validateEventDeadlineAndState(event, request.deadline());

        User assigner = userRepository.findById(actor.id())
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "USER_NOT_FOUND", "User not found"));
        User assignee = userRepository.findById(request.assigneeId())
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "USER_NOT_FOUND", "Assignee not found"));

        validateAssigneeEligibility(club, department, event, assignee, hasClubCreate);

        Task task = new Task();
        task.setClub(club);
        task.setDepartment(department);
        task.setEvent(event);
        task.setParentTask(parentTask);
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
                "TASK",
                saved.getId(),
                null);

        Map<String, Object> auditValues = new LinkedHashMap<>();
        auditValues.put("title", saved.getTitle());
        auditValues.put("priority", saved.getPriority());
        auditValues.put("status", saved.getStatus());
        auditValues.put("assigneeId", assignee.getId());
        auditValues.put("departmentId", department == null ? null : department.getId());
        auditValues.put("eventId", event == null ? null : event.getId());
        auditValues.put("parentTaskId", parentTask == null ? null : parentTask.getId());
        auditService.record(actor.id(), AuditAction.TASK_CREATED, saved.getId(), club.getId(), null, auditValues);

        return taskMapper.toResponse(saved, now);
    }

    @Override
    @Transactional(readOnly = true)
    public TaskResponse get(Actor actor, UUID taskId) {
        Task task = taskRepository.findWithRelationsById(taskId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "TASK_NOT_FOUND", "Task not found"));
        UUID clubId = task.getClub().getId();
        UUID deptId = task.getDepartment() == null ? null : task.getDepartment().getId();
        boolean isActiveMember = membershipRepository.existsByUser_IdAndClub_IdAndStatus(actor.id(), clubId, MembershipStatus.ACTIVE);
        boolean isEligibleAssignee = task.getAssignee().getId().equals(actor.id())
                && (isActiveMember || (task.getEvent() != null
                    && registrationRepository.findByEvent_IdAndUser_IdAndStatus(
                        task.getEvent().getId(), actor.id(), EventRegistrationStatus.REGISTERED).isPresent()));
        boolean canView = isEligibleAssignee
                || task.getAssigner().getId().equals(actor.id())
                || isActiveMember
                || authorizationService.hasPermission(actor, TaskConstants.PERMISSION_VIEW, clubId, deptId);
        if (!canView) {
            throw new ApiException(HttpStatus.FORBIDDEN, "PERMISSION_DENIED", "Permission denied");
        }
        return taskMapper.toResponse(task, OffsetDateTime.now(clock));
    }

    @Override
    @Transactional
    public TaskResponse update(Actor actor, UUID taskId, UpdateTaskRequest request) {
        Task task = taskRepository.findWithRelationsById(taskId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "TASK_NOT_FOUND", "Task not found"));
        if (task.getStatus() == TaskStatus.COMPLETED || task.getStatus() == TaskStatus.CANCELLED) {
            throw new ApiException(HttpStatus.CONFLICT, "TASK_CLOSED",
                    "Completed or cancelled tasks cannot be modified");
        }

        UUID clubId = task.getClub().getId();
        UUID deptId = task.getDepartment() == null ? null : task.getDepartment().getId();
        boolean hasClubScope = authorizationService.hasPermission(actor, TaskConstants.PERMISSION_UPDATE, clubId, null)
                || authorizationService.hasPermission(actor, TaskConstants.PERMISSION_CREATE, clubId, null);
        boolean hasDeptScope = deptId != null
                && (authorizationService.hasPermission(actor, TaskConstants.PERMISSION_UPDATE, clubId, deptId)
                    || authorizationService.hasPermission(actor, TaskConstants.PERMISSION_CREATE, clubId, deptId));
        if (!hasClubScope && !hasDeptScope) {
            throw new ApiException(HttpStatus.FORBIDDEN, "PERMISSION_DENIED", "Permission denied");
        }

        OffsetDateTime now = OffsetDateTime.now(clock);
        Map<String, Object> before = managementSnapshot(task);
        UUID previousAssigneeId = task.getAssignee().getId();

        if (request.title() != null) {
            String stripped = request.title().strip();
            if (stripped.isEmpty()) {
                throw new ApiException(HttpStatus.BAD_REQUEST, "INVALID_TASK_TITLE", "Task title cannot be blank");
            }
            task.setTitle(stripped);
        }
        if (request.description() != null) {
            task.setDescription(request.description().strip());
        }
        if (request.priority() != null) {
            task.setPriority(request.priority());
        }
        if (request.deadline() != null) {
            if (!request.deadline().isAfter(now)) {
                throw new ApiException(HttpStatus.BAD_REQUEST, "INVALID_TASK_DEADLINE", "Task deadline must be in the future");
            }
            if (task.getParentTask() != null && request.deadline().isAfter(task.getParentTask().getDeadline())) {
                throw new ApiException(HttpStatus.BAD_REQUEST, "SUBTASK_DEADLINE_EXCEEDS_PARENT",
                        "Subtask deadline must not exceed parent task deadline");
            }
            if (taskRepository.existsByParentTask_IdAndDeadlineAfter(task.getId(), request.deadline())) {
                throw new ApiException(HttpStatus.BAD_REQUEST, "PARENT_DEADLINE_BEFORE_SUBTASK",
                        "Parent task deadline cannot be earlier than its subtask deadlines");
            }
            validateEventDeadlineAndState(task.getEvent(), request.deadline());
            task.setDeadline(request.deadline());
            task.setOverdueNotifiedAt(null);
        }
        if (request.assigneeId() != null && !request.assigneeId().equals(previousAssigneeId)) {
            User newAssignee = userRepository.findById(request.assigneeId())
                    .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "USER_NOT_FOUND", "Assignee not found"));
            validateAssigneeEligibility(task.getClub(), task.getDepartment(), task.getEvent(), newAssignee, hasClubScope);
            task.setAssignee(newAssignee);
        }
        if (request.status() != null && request.status() != task.getStatus()) {
            if (request.status() != TaskStatus.TODO
                    && request.status() != TaskStatus.IN_PROGRESS
                    && request.status() != TaskStatus.CANCELLED) {
                throw new ApiException(HttpStatus.BAD_REQUEST, "INVALID_TASK_STATUS",
                        "Manager update can only transition open/done tasks to TODO, IN_PROGRESS, or CANCELLED");
            }
            task.setStatus(request.status());
            if (request.status() == TaskStatus.TODO) {
                task.setProgressPercent(0);
            } else if (request.status() == TaskStatus.IN_PROGRESS && task.getProgressPercent() == 100) {
                task.setProgressPercent(80);
            }
        }

        Task saved = taskRepository.save(task);
        if (!saved.getAssignee().getId().equals(previousAssigneeId)) {
            notificationService.create(saved.getAssignee().getId(),
                    "Nhiệm vụ được phân công: " + saved.getTitle(),
                    "Bạn vừa được phân công phụ trách nhiệm vụ \"" + saved.getTitle() + "\".",
                    "TASK",
                    saved.getId(),
                    null);
        }
        auditService.recordChange(actor.id(), AuditAction.TASK_UPDATED, saved.getId(), clubId,
                before, managementSnapshot(saved));
        return taskMapper.toResponse(saved, now);
    }

    @Override
    @Transactional(readOnly = true)
    public PageResponse<TaskResponse> listForClub(Actor actor, UUID clubId, UUID departmentId, TaskStatus status,
                                                  UUID assigneeId, Boolean overdue, int offset, int limit) {
        Club club = validateClubTaskReadAccess(actor, clubId, departmentId);
        OffsetDateTime now = OffsetDateTime.now(clock);
        TaskStatus effectiveStatus = status == TaskStatus.OVERDUE ? null : status;
        Boolean effectiveOverdue = status == TaskStatus.OVERDUE ? Boolean.TRUE : overdue;

        var page = taskRepository.findByClubFiltered(
                club.getId(),
                departmentId,
                effectiveStatus,
                assigneeId,
                effectiveOverdue != null,
                Boolean.TRUE.equals(effectiveOverdue),
                now,
                new OffsetLimitRequest(offset, limit, DEFAULT_SORT));
        return new PageResponse<>(page.getContent().stream().map(t -> taskMapper.toResponse(t, now)).toList(),
                page.getTotalElements(), offset, limit);
    }

    @Override
    @Transactional(readOnly = true)
    public TaskSummaryResponse summarizeForClub(Actor actor, UUID clubId, UUID departmentId, TaskStatus status,
                                                UUID assigneeId, Boolean overdue) {
        Club club = validateClubTaskReadAccess(actor, clubId, departmentId);
        OffsetDateTime now = OffsetDateTime.now(clock);
        TaskStatus effectiveStatus = status == TaskStatus.OVERDUE ? null : status;
        Boolean effectiveOverdue = status == TaskStatus.OVERDUE ? Boolean.TRUE : overdue;

        List<Task> matching = taskRepository.findAllByClubFiltered(
                club.getId(),
                departmentId,
                effectiveStatus,
                assigneeId,
                effectiveOverdue != null,
                Boolean.TRUE.equals(effectiveOverdue),
                now);

        long todo = 0;
        long inProgress = 0;
        long done = 0;
        long completed = 0;
        long cancelled = 0;
        long overdueCount = 0;
        for (Task t : matching) {
            switch (t.getStatus()) {
                case TODO -> todo++;
                case IN_PROGRESS -> inProgress++;
                case DONE -> done++;
                case COMPLETED -> completed++;
                case CANCELLED -> cancelled++;
                case OVERDUE -> inProgress++;
            }
            if (taskMapper.isOverdue(t, now)) {
                overdueCount++;
            }
        }
        return new TaskSummaryResponse(matching.size(), todo, inProgress, done, completed, cancelled, overdueCount, now);
    }

    @Override
    @Transactional(readOnly = true)
    public PageResponse<TaskResponse> listMine(Actor actor, TaskStatus status, Boolean overdue, int offset, int limit) {
        OffsetDateTime now = OffsetDateTime.now(clock);
        TaskStatus effectiveStatus = status == TaskStatus.OVERDUE ? null : status;
        Boolean effectiveOverdue = status == TaskStatus.OVERDUE ? Boolean.TRUE : overdue;
        var page = taskRepository.findByAssigneeFiltered(
                actor.id(),
                effectiveStatus,
                effectiveOverdue != null,
                Boolean.TRUE.equals(effectiveOverdue),
                now,
                new OffsetLimitRequest(offset, limit, DEFAULT_SORT));
        return new PageResponse<>(page.getContent().stream().map(t -> taskMapper.toResponse(t, now)).toList(),
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
        if (task.getStatus() == TaskStatus.CANCELLED) {
            throw new ApiException(HttpStatus.CONFLICT, "TASK_CANCELLED", "Cancelled task cannot be updated");
        }
        if (task.getStatus() == TaskStatus.OVERDUE && request.status() != TaskStatus.DONE) {
            throw new ApiException(HttpStatus.CONFLICT, "TASK_OVERDUE",
                    "Overdue status task can only be marked DONE or reopened by a manager");
        }

        boolean isActiveMember = membershipRepository.existsByUser_IdAndClub_IdAndStatus(
                actor.id(), task.getClub().getId(), MembershipStatus.ACTIVE);
        boolean isEligibleEventCtv = task.getEvent() != null
                && registrationRepository.findByEvent_IdAndUser_IdAndStatus(
                        task.getEvent().getId(), actor.id(), EventRegistrationStatus.REGISTERED).isPresent();
        if (!isActiveMember && !isEligibleEventCtv) {
            throw new ApiException(HttpStatus.FORBIDDEN, "PERMISSION_DENIED",
                    "You are no longer an active club member or registered event participant");
        }

        OffsetDateTime now = OffsetDateTime.now(clock);
        Map<String, Object> before = snapshot(task);
        if (request.status() != null) {
            if (request.status() != TaskStatus.TODO
                    && request.status() != TaskStatus.IN_PROGRESS
                    && request.status() != TaskStatus.DONE) {
                throw new ApiException(HttpStatus.BAD_REQUEST, "INVALID_TASK_STATUS",
                        "Assignee can only set status to TODO, IN_PROGRESS, or DONE");
            }
            task.setStatus(request.status());
            if (request.status() == TaskStatus.DONE && request.progressPercent() == null) {
                task.setProgressPercent(100);
            } else if (request.status() == TaskStatus.IN_PROGRESS
                    && task.getProgressPercent() == 100
                    && request.progressPercent() == null) {
                task.setProgressPercent(90);
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
        if (task.getStatus() == TaskStatus.DONE) {
            task.setProgressPercent(100);
        } else if (task.getStatus() == TaskStatus.TODO) {
            task.setProgressPercent(0);
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
                "TASK",
                saved.getId(),
                null);
        auditService.recordChange(actor.id(), AuditAction.TASK_PROGRESS_UPDATED, saved.getId(),
                saved.getClub().getId(), before, snapshot(saved));
        return taskMapper.toResponse(saved, now);
    }

    @Override
    @Transactional
    public TaskResponse verify(Actor actor, UUID taskId) {
        Task task = taskRepository.findWithRelationsById(taskId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "TASK_NOT_FOUND", "Task not found"));
        UUID deptId = task.getDepartment() == null ? null : task.getDepartment().getId();
        authorizationService.require(actor, TaskConstants.PERMISSION_VERIFY, task.getClub().getId(), deptId);
        if (task.getAssignee().getId().equals(actor.id())) {
            throw new ApiException(HttpStatus.FORBIDDEN, "SELF_VERIFICATION", "You cannot verify a task assigned to yourself");
        }
        if (task.getStatus() != TaskStatus.DONE) {
            throw new ApiException(HttpStatus.CONFLICT, "TASK_NOT_DONE", "Task must be in DONE state before verification");
        }
        if (taskRepository.existsByParentTask_IdAndStatusIn(task.getId(), OPEN_STATUSES)) {
            throw new ApiException(HttpStatus.CONFLICT, "SUBTASKS_INCOMPLETE",
                    "Cannot verify parent task while open subtasks remain");
        }
        User verifier = userRepository.findById(actor.id())
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "USER_NOT_FOUND", "User not found"));

        OffsetDateTime now = OffsetDateTime.now(clock);
        Map<String, Object> before = snapshot(task);
        task.setStatus(TaskStatus.COMPLETED);
        task.setProgressPercent(100);
        task.setVerifiedBy(verifier);
        task.setVerifiedAt(now);

        Task saved = taskRepository.save(task);
        notificationService.create(saved.getAssignee().getId(),
                "Nhiệm vụ hoàn tất: " + saved.getTitle(),
                "Nhiệm vụ \"" + saved.getTitle() + "\" đã được xác nhận hoàn thành.",
                "TASK",
                saved.getId(),
                null);
        auditService.recordChange(actor.id(), AuditAction.TASK_VERIFIED, saved.getId(),
                saved.getClub().getId(), before, snapshot(saved));
        return taskMapper.toResponse(saved, now);
    }

    @Override
    @Scheduled(fixedDelayString = "${app.tasks.overdue-check-interval:300000}")
    @Transactional
    public int markOverdueTasks() {
        OffsetDateTime now = OffsetDateTime.now(clock);
        List<Task> overdueTasks = taskRepository.findUnnotifiedOverdueCandidates(OPEN_STATUSES, now);
        for (Task task : overdueTasks) {
            Map<String, Object> before = Map.of(
                    "status", task.getStatus(),
                    "overdue", false,
                    "overdueNotifiedAt", String.valueOf(task.getOverdueNotifiedAt()));
            task.setOverdueNotifiedAt(now);
            Task saved = taskRepository.save(task);
            String title = "Task quá hạn: " + saved.getTitle();
            String message = "Nhiệm vụ \"" + saved.getTitle() + "\" đã vượt quá hạn hoàn thành (trạng thái hiện tại: "
                    + saved.getStatus() + ").";
            String eventKey = "TASK_OVERDUE:" + saved.getId() + ":" + saved.getDeadline().toEpochSecond();
            notificationService.create(saved.getAssignee().getId(), title, message, "TASK", saved.getId(), eventKey);
            if (!saved.getAssigner().getId().equals(saved.getAssignee().getId())) {
                notificationService.create(saved.getAssigner().getId(), title, message, "TASK", saved.getId(), eventKey);
            }
            auditService.record(null, AuditAction.TASK_OVERDUE_MARKED, saved.getId(),
                    saved.getClub().getId(), before, Map.of(
                            "status", saved.getStatus(),
                            "overdue", true,
                            "overdueNotifiedAt", saved.getOverdueNotifiedAt()));
        }
        return overdueTasks.size();
    }

    private Club validateClubTaskReadAccess(Actor actor, UUID clubId, UUID departmentId) {
        Club club = clubRepository.findById(clubId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "CLUB_NOT_FOUND", "Club not found"));
        boolean allowed = authorizationService.hasPermission(actor, TaskConstants.PERMISSION_VIEW, club.getId(), departmentId)
                || membershipRepository.existsByUser_IdAndClub_IdAndStatus(actor.id(), club.getId(), MembershipStatus.ACTIVE);
        if (!allowed) {
            throw new ApiException(HttpStatus.FORBIDDEN, "PERMISSION_DENIED", "Permission denied");
        }
        return club;
    }

    private void validateEventDeadlineAndState(Event event, OffsetDateTime deadline) {
        if (event == null) {
            return;
        }
        if (event.getStatus() == EventStatus.CANCELLED || event.getStatus() == EventStatus.COMPLETED) {
            throw new ApiException(HttpStatus.CONFLICT, "EVENT_CLOSED_FOR_TASKS",
                    "Cannot create or reschedule tasks on a completed or cancelled event");
        }
        if (deadline.isAfter(event.getEndTime().plus(EVENT_TASK_POST_END_BUFFER))) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "TASK_DEADLINE_OUTSIDE_EVENT_WINDOW",
                    "Event task deadline cannot be more than 7 days after the event endTime");
        }
    }

    private void validateAssigneeEligibility(Club club, Department department, Event event,
                                             User assignee, boolean hasClubScope) {
        if (assignee.getStatus() != UserStatus.ACTIVE) {
            throw new ApiException(HttpStatus.CONFLICT, "USER_INACTIVE", "Assignee account is inactive");
        }
        if (!hasClubScope) {
            if (department == null || !departmentMemberRepository.isUserInDepartment(department.getId(), assignee.getId())) {
                throw new ApiException(HttpStatus.FORBIDDEN, "PERMISSION_SCOPE_MISMATCH",
                        "Department head can only assign tasks to members of their department");
            }
            return;
        }

        boolean isActiveMember = membershipRepository.existsByUser_IdAndClub_IdAndStatus(
                assignee.getId(), club.getId(), MembershipStatus.ACTIVE);
        if (isActiveMember) {
            if (department != null && !departmentMemberRepository.isUserInDepartment(department.getId(), assignee.getId())) {
                throw new ApiException(HttpStatus.CONFLICT, "ASSIGNEE_NOT_IN_DEPARTMENT",
                        "The assignee is not a member of this department");
            }
            return;
        }

        if (event == null) {
            throw new ApiException(HttpStatus.CONFLICT, "ASSIGNEE_NOT_MEMBER",
                    "The assignee is not an active member of this club");
        }
        boolean isRegisteredParticipant = registrationRepository.findByEvent_IdAndUser_IdAndStatus(
                event.getId(), assignee.getId(), EventRegistrationStatus.REGISTERED).isPresent();
        if (!isRegisteredParticipant) {
            throw new ApiException(HttpStatus.CONFLICT, "ASSIGNEE_NOT_ELIGIBLE_FOR_EVENT_TASK",
                    "Non-member CTV must have an active registration in the target event");
        }
    }

    private static Map<String, Object> snapshot(Task task) {
        Map<String, Object> values = new LinkedHashMap<>();
        values.put("status", task.getStatus());
        values.put("progressPercent", task.getProgressPercent());
        values.put("progressNote", task.getProgressNote());
        values.put("reportLink", task.getReportLink());
        return values;
    }

    private static Map<String, Object> managementSnapshot(Task task) {
        Map<String, Object> values = new LinkedHashMap<>();
        values.put("title", task.getTitle());
        values.put("priority", task.getPriority());
        values.put("status", task.getStatus());
        values.put("deadline", task.getDeadline());
        values.put("assigneeId", task.getAssignee().getId());
        return values;
    }
}
