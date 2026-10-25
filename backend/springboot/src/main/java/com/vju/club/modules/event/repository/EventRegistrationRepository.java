package com.vju.club.modules.event.repository;

import com.vju.club.modules.event.entity.EventRegistration;
import com.vju.club.modules.event.enums.EventRegistrationStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface EventRegistrationRepository extends JpaRepository<EventRegistration, UUID> {
    @EntityGraph(attributePaths = {"event", "user"})
    Optional<EventRegistration> findByEvent_IdAndUser_IdAndStatus(UUID eventId, UUID userId, EventRegistrationStatus status);

    long countByEvent_IdAndStatus(UUID eventId, EventRegistrationStatus status);

    @EntityGraph(attributePaths = {"event", "user"})
    Page<EventRegistration> findByEvent_IdOrderByRegisteredAtAsc(UUID eventId, Pageable pageable);

    @Query("SELECT r.event.id FROM EventRegistration r WHERE r.user.id = :userId "
            + "AND r.status = com.vju.club.modules.event.enums.EventRegistrationStatus.REGISTERED")
    List<UUID> findRegisteredEventIdsByUserId(@Param("userId") UUID userId);

    @Query("SELECT r.user.id FROM EventRegistration r WHERE r.event.id = :eventId "
            + "AND r.status = com.vju.club.modules.event.enums.EventRegistrationStatus.REGISTERED")
    List<UUID> findRegisteredUserIds(@Param("eventId") UUID eventId);
}
