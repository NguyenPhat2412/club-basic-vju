package com.vju.club.repository;

import com.vju.club.entity.Task;
import com.vju.club.enums.TaskStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.OffsetDateTime;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface TaskRepository extends JpaRepository<Task, UUID> {
    @EntityGraph(attributePaths = {"club", "department", "event", "parentTask", "assignee", "assigner", "verifiedBy"})
    Optional<Task> findWithRelationsById(UUID id);

    @EntityGraph(attributePaths = {"club", "department", "event", "parentTask", "assignee", "assigner", "verifiedBy"})
    @Query("SELECT t FROM Task t WHERE t.club.id = :clubId "
            + "AND (:departmentId IS NULL OR t.department.id = :departmentId) "
            + "AND (:status IS NULL OR t.status = :status) "
            + "AND (:assigneeId IS NULL OR t.assignee.id = :assigneeId) "
            + "AND (:filterOverdue = false "
            + "  OR (:wantOverdue = true AND t.status IN (com.vju.club.enums.TaskStatus.TODO, com.vju.club.enums.TaskStatus.IN_PROGRESS) AND t.deadline < :now) "
            + "  OR (:wantOverdue = false AND (t.status NOT IN (com.vju.club.enums.TaskStatus.TODO, com.vju.club.enums.TaskStatus.IN_PROGRESS) OR t.deadline >= :now)))")
    Page<Task> findByClubFiltered(@Param("clubId") UUID clubId,
                                  @Param("departmentId") UUID departmentId,
                                  @Param("status") TaskStatus status,
                                  @Param("assigneeId") UUID assigneeId,
                                  @Param("filterOverdue") boolean filterOverdue,
                                  @Param("wantOverdue") boolean wantOverdue,
                                  @Param("now") OffsetDateTime now,
                                  Pageable pageable);

    @Query("SELECT t FROM Task t WHERE t.club.id = :clubId "
            + "AND (:departmentId IS NULL OR t.department.id = :departmentId) "
            + "AND (:status IS NULL OR t.status = :status) "
            + "AND (:assigneeId IS NULL OR t.assignee.id = :assigneeId) "
            + "AND (:filterOverdue = false "
            + "  OR (:wantOverdue = true AND t.status IN (com.vju.club.enums.TaskStatus.TODO, com.vju.club.enums.TaskStatus.IN_PROGRESS) AND t.deadline < :now) "
            + "  OR (:wantOverdue = false AND (t.status NOT IN (com.vju.club.enums.TaskStatus.TODO, com.vju.club.enums.TaskStatus.IN_PROGRESS) OR t.deadline >= :now)))")
    List<Task> findAllByClubFiltered(@Param("clubId") UUID clubId,
                                     @Param("departmentId") UUID departmentId,
                                     @Param("status") TaskStatus status,
                                     @Param("assigneeId") UUID assigneeId,
                                     @Param("filterOverdue") boolean filterOverdue,
                                     @Param("wantOverdue") boolean wantOverdue,
                                     @Param("now") OffsetDateTime now);

    @EntityGraph(attributePaths = {"club", "department", "event", "parentTask", "assignee", "assigner", "verifiedBy"})
    @Query("SELECT t FROM Task t WHERE t.assignee.id = :assigneeId "
            + "AND (:status IS NULL OR t.status = :status) "
            + "AND (:filterOverdue = false "
            + "  OR (:wantOverdue = true AND t.status IN (com.vju.club.enums.TaskStatus.TODO, com.vju.club.enums.TaskStatus.IN_PROGRESS) AND t.deadline < :now) "
            + "  OR (:wantOverdue = false AND (t.status NOT IN (com.vju.club.enums.TaskStatus.TODO, com.vju.club.enums.TaskStatus.IN_PROGRESS) OR t.deadline >= :now)))")
    Page<Task> findByAssigneeFiltered(@Param("assigneeId") UUID assigneeId,
                                      @Param("status") TaskStatus status,
                                      @Param("filterOverdue") boolean filterOverdue,
                                      @Param("wantOverdue") boolean wantOverdue,
                                      @Param("now") OffsetDateTime now,
                                      Pageable pageable);

    @EntityGraph(attributePaths = {"club", "department", "event", "parentTask", "assignee", "assigner"})
    @Query("SELECT t FROM Task t WHERE t.assignee.id = :assigneeId "
            + "AND t.deadline >= :from AND t.deadline <= :to "
            + "ORDER BY t.deadline ASC, t.id ASC")
    List<Task> findCalendarTasks(@Param("assigneeId") UUID assigneeId,
                                 @Param("from") OffsetDateTime from,
                                 @Param("to") OffsetDateTime to);

    @EntityGraph(attributePaths = {"club", "assignee", "assigner"})
    @Query("SELECT t FROM Task t WHERE t.status IN :statuses AND t.deadline < :now AND t.overdueNotifiedAt IS NULL")
    List<Task> findUnnotifiedOverdueCandidates(@Param("statuses") Collection<TaskStatus> statuses,
                                               @Param("now") OffsetDateTime now);

    @EntityGraph(attributePaths = {"club", "department", "event", "parentTask", "assignee", "assigner"})
    List<Task> findByEvent_IdAndStatusIn(UUID eventId, Collection<TaskStatus> statuses);

    @EntityGraph(attributePaths = {"club", "department", "event", "parentTask", "assignee", "assigner"})
    List<Task> findByEvent_IdAndAssignee_IdAndStatusIn(UUID eventId, UUID assigneeId, Collection<TaskStatus> statuses);

    @EntityGraph(attributePaths = {"assignee"})
    List<Task> findByParentTask_Id(UUID parentTaskId);

    boolean existsByParentTask_IdAndStatusIn(UUID parentTaskId, Collection<TaskStatus> statuses);

    boolean existsByParentTask_IdAndDeadlineAfter(UUID parentTaskId, OffsetDateTime deadline);

    boolean existsByAssignee_IdOrAssigner_Id(UUID assigneeId, UUID assignerId);

    @EntityGraph(attributePaths = {"club", "event", "assignee", "assigner"})
    List<Task> findByAssignee_IdAndStatusIn(UUID assigneeId, Collection<TaskStatus> statuses);
}
