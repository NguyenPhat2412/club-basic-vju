package com.vju.club.repository;

import com.vju.club.entity.Event;
import com.vju.club.enums.EventStatus;
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
    @EntityGraph(attributePaths = {"club", "department", "parentEvent", "coHosts"})
    Optional<Event> findWithRelationsById(UUID id);

    @EntityGraph(attributePaths = {"club", "department", "parentEvent"})
    @Query("SELECT e FROM Event e WHERE e.club.id = :clubId "
            + "AND (:status IS NULL OR e.status = :status) "
            + "AND (:departmentId IS NULL OR e.department.id = :departmentId) "
            + "AND (:publicOnly = false OR e.allowCtv = true OR e.allowPublicAttendees = true)")
    Page<Event> findByClub(@Param("clubId") UUID clubId,
                           @Param("status") EventStatus status,
                           @Param("departmentId") UUID departmentId,
                           @Param("publicOnly") boolean publicOnly,
                           Pageable pageable);

    default Page<Event> findByClub(UUID clubId, EventStatus status, UUID departmentId, Pageable pageable) {
        return findByClub(clubId, status, departmentId, false, pageable);
    }

    @EntityGraph(attributePaths = {"club", "department", "parentEvent"})
    @Query("SELECT e FROM Event e WHERE e.club.status = com.vju.club.enums.ClubStatus.ACTIVE "
            + "AND (e.allowCtv = true OR e.allowPublicAttendees = true) "
            + "AND e.status IN (com.vju.club.enums.EventStatus.OPEN_REGISTRATION, "
            + "com.vju.club.enums.EventStatus.CLOSED_REGISTRATION, "
            + "com.vju.club.enums.EventStatus.COMPLETED)")
    Page<Event> findPublicEvents(Pageable pageable);

    @EntityGraph(attributePaths = {"club", "department", "parentEvent"})
    @Query("SELECT e FROM Event e WHERE e.club.status = com.vju.club.enums.ClubStatus.ACTIVE "
            + "AND e.status IN (com.vju.club.enums.EventStatus.OPEN_REGISTRATION, "
            + "com.vju.club.enums.EventStatus.CLOSED_REGISTRATION, "
            + "com.vju.club.enums.EventStatus.COMPLETED)")
    Page<Event> findAllDiscoverableEvents(Pageable pageable);

    @EntityGraph(attributePaths = {"club", "department", "parentEvent"})
    @Query("SELECT e FROM Event e WHERE e.club.status = com.vju.club.enums.ClubStatus.ACTIVE "
            + "AND (e.allowCtv = true OR e.allowPublicAttendees = true OR e.club.id IN :clubIds) "
            + "AND e.status IN (com.vju.club.enums.EventStatus.OPEN_REGISTRATION, "
            + "com.vju.club.enums.EventStatus.CLOSED_REGISTRATION, "
            + "com.vju.club.enums.EventStatus.COMPLETED)")
    Page<Event> findDiscoverableEvents(@Param("clubIds") Collection<UUID> clubIds, Pageable pageable);

    @EntityGraph(attributePaths = {"club", "department"})
    @Query("SELECT DISTINCT e FROM Event e WHERE "
            + "(e.club.id IN :clubIds OR e.id IN :registeredEventIds) "
            + "AND e.status <> com.vju.club.enums.EventStatus.CANCELLED "
            + "AND e.endTime >= :from AND e.startTime <= :to "
            + "ORDER BY e.startTime ASC, e.id ASC")
    List<Event> findCalendarEvents(@Param("clubIds") Collection<UUID> clubIds,
                                   @Param("registeredEventIds") Collection<UUID> registeredEventIds,
                                   @Param("from") OffsetDateTime from,
                                   @Param("to") OffsetDateTime to);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT e FROM Event e WHERE e.id = :id")
    Optional<Event> lockById(@Param("id") UUID id);

    long countByClub_IdAndStatusNotIn(UUID clubId, Collection<EventStatus> statuses);

    @EntityGraph(attributePaths = {"club", "department", "parentEvent", "coHosts"})
    @Query("SELECT e FROM Event e WHERE e.parentEvent.id = :parentEventId "
            + "AND e.club.status = com.vju.club.enums.ClubStatus.ACTIVE "
            + "AND (e.allowCtv = true OR e.allowPublicAttendees = true) "
            + "AND e.status IN (com.vju.club.enums.EventStatus.OPEN_REGISTRATION, "
            + "com.vju.club.enums.EventStatus.CLOSED_REGISTRATION, "
            + "com.vju.club.enums.EventStatus.COMPLETED) "
            + "ORDER BY CASE WHEN e.boothCode IS NULL OR e.boothCode = '' THEN 1 ELSE 0 END ASC, "
            + "e.boothCode ASC, e.startTime ASC, e.id ASC")
    List<Event> findPublicBoothsByParentId(@Param("parentEventId") UUID parentEventId);

    @Query("SELECT COUNT(e) FROM Event e WHERE e.parentEvent.id = :parentEventId "
            + "AND e.status <> com.vju.club.enums.EventStatus.CANCELLED "
            + "AND UPPER(TRIM(e.boothCode)) = UPPER(TRIM(:boothCode)) "
            + "AND (:excludeEventId IS NULL OR e.id <> :excludeEventId)")
    long countConflictingBoothCode(@Param("parentEventId") UUID parentEventId,
                                   @Param("boothCode") String boothCode,
                                   @Param("excludeEventId") UUID excludeEventId);

    @Query("SELECT e.parentEvent.id, COUNT(e) FROM Event e "
            + "WHERE e.parentEvent.id IN :parentIds "
            + "AND e.club.status = com.vju.club.enums.ClubStatus.ACTIVE "
            + "AND (e.allowCtv = true OR e.allowPublicAttendees = true) "
            + "AND e.status IN (com.vju.club.enums.EventStatus.OPEN_REGISTRATION, "
            + "com.vju.club.enums.EventStatus.CLOSED_REGISTRATION, "
            + "com.vju.club.enums.EventStatus.COMPLETED) "
            + "GROUP BY e.parentEvent.id")
    List<Object[]> countPublicBoothsByParentIds(@Param("parentIds") Collection<UUID> parentIds);
}
