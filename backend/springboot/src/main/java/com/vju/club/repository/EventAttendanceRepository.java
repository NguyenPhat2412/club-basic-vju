package com.vju.club.repository;

import com.vju.club.entity.EventAttendance;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface EventAttendanceRepository extends JpaRepository<EventAttendance, UUID> {
    @EntityGraph(attributePaths = {"event", "user", "checkedBy"})
    List<EventAttendance> findByEvent_IdOrderByCheckedAtAsc(UUID eventId);

    @EntityGraph(attributePaths = {"event", "user", "checkedBy"})
    Optional<EventAttendance> findByEvent_IdAndUser_Id(UUID eventId, UUID userId);

    @EntityGraph(attributePaths = {"event", "user", "checkedBy"})
    List<EventAttendance> findByUser_IdAndEvent_IdIn(UUID userId, Collection<UUID> eventIds);

    boolean existsByUser_Id(UUID userId);
}
