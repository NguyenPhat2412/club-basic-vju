package com.vju.club.modules.task.repository;

import com.vju.club.modules.task.entity.Task;
import com.vju.club.modules.task.enums.TaskStatus;
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
    @EntityGraph(attributePaths = {"club", "department", "event", "assignee", "assigner", "verifiedBy"})
    Optional<Task> findWithRelationsById(UUID id);

    @EntityGraph(attributePaths = {"club", "department", "event", "assignee", "assigner", "verifiedBy"})
    @Query("SELECT t FROM Task t WHERE t.club.id = :clubId "
            + "AND (:departmentId IS NULL OR t.department.id = :departmentId) "
            + "AND (:status IS NULL OR t.status = :status) "
            + "AND (:assigneeId IS NULL OR t.assignee.id = :assigneeId)")
    Page<Task> findByClub(@Param("clubId") UUID clubId,
                          @Param("departmentId") UUID departmentId,
                          @Param("status") TaskStatus status,
                          @Param("assigneeId") UUID assigneeId,
                          Pageable pageable);

    @EntityGraph(attributePaths = {"club", "department", "event", "assignee", "assigner", "verifiedBy"})
    @Query("SELECT t FROM Task t WHERE t.assignee.id = :assigneeId "
            + "AND (:status IS NULL OR t.status = :status)")
    Page<Task> findByAssignee(@Param("assigneeId") UUID assigneeId,
                              @Param("status") TaskStatus status,
                              Pageable pageable);

    @EntityGraph(attributePaths = {"club", "department", "event", "assignee", "assigner"})
    @Query("SELECT t FROM Task t WHERE t.assignee.id = :assigneeId "
            + "AND t.deadline >= :from AND t.deadline <= :to "
            + "ORDER BY t.deadline ASC, t.id ASC")
    List<Task> findCalendarTasks(@Param("assigneeId") UUID assigneeId,
                                 @Param("from") OffsetDateTime from,
                                 @Param("to") OffsetDateTime to);

    @EntityGraph(attributePaths = {"club", "assignee", "assigner"})
    @Query("SELECT t FROM Task t WHERE t.status IN :statuses AND t.deadline < :now")
    List<Task> findOverdueCandidates(@Param("statuses") Collection<TaskStatus> statuses,
                                     @Param("now") OffsetDateTime now);
}
