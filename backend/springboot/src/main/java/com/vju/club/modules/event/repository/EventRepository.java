package com.vju.club.modules.event.repository;

import com.vju.club.modules.event.entity.Event;
import com.vju.club.modules.event.enums.EventStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.OffsetDateTime;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface EventRepository extends JpaRepository<Event, UUID> {
    @EntityGraph(attributePaths = {"club", "department"})
    Optional<Event> findWithRelationsById(UUID id);

    @EntityGraph(attributePaths = {"club", "department"})
    @Query("SELECT e FROM Event e WHERE e.club.id = :clubId "
            + "AND (:status IS NULL OR e.status = :status) "
            + "AND (:departmentId IS NULL OR e.department.id = :departmentId)")
    Page<Event> findByClub(@Param("clubId") UUID clubId,
                           @Param("status") EventStatus status,
                           @Param("departmentId") UUID departmentId,
                           Pageable pageable);

    @EntityGraph(attributePaths = {"club", "department"})
    @Query("SELECT e FROM Event e WHERE e.club.status = com.vju.club.modules.club.enums.ClubStatus.ACTIVE "
            + "AND e.status IN (com.vju.club.modules.event.enums.EventStatus.OPEN_REGISTRATION, "
            + "com.vju.club.modules.event.enums.EventStatus.CLOSED_REGISTRATION, "
            + "com.vju.club.modules.event.enums.EventStatus.COMPLETED)")
    Page<Event> findPublicEvents(Pageable pageable);

    @EntityGraph(attributePaths = {"club", "department"})
    @Query("SELECT DISTINCT e FROM Event e WHERE "
            + "(e.club.id IN :clubIds OR e.id IN :registeredEventIds) "
            + "AND e.status <> com.vju.club.modules.event.enums.EventStatus.CANCELLED "
            + "AND e.endTime >= :from AND e.startTime <= :to "
            + "ORDER BY e.startTime ASC, e.id ASC")
    List<Event> findCalendarEvents(@Param("clubIds") Collection<UUID> clubIds,
                                   @Param("registeredEventIds") Collection<UUID> registeredEventIds,
                                   @Param("from") OffsetDateTime from,
                                   @Param("to") OffsetDateTime to);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT e FROM Event e WHERE e.id = :id")
    Optional<Event> lockById(@Param("id") UUID id);
}
