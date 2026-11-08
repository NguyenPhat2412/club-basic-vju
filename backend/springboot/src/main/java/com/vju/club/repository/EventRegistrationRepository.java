package com.vju.club.repository;

import com.vju.club.entity.EventRegistration;
import com.vju.club.enums.EventParticipantType;
import com.vju.club.enums.EventRegistrationStatus;
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

    @EntityGraph(attributePaths = {"event", "event.club", "user"})
    Optional<EventRegistration> findWithRelationsByIdAndEvent_Id(UUID id, UUID eventId);

    boolean existsByEvent_IdAndUser_Id(UUID eventId, UUID userId);

    boolean existsByUser_Id(UUID userId);

    List<EventRegistration> findByUser_IdAndStatus(UUID userId, EventRegistrationStatus status);

    long countByEvent_IdAndStatus(UUID eventId, EventRegistrationStatus status);

    @EntityGraph(attributePaths = {"event", "user"})
    Page<EventRegistration> findByEvent_IdOrderByRegisteredAtAsc(UUID eventId, Pageable pageable);

    @EntityGraph(attributePaths = {"event", "event.club", "user"})
    @Query("SELECT r FROM EventRegistration r WHERE r.user.id = :userId "
            + "AND (:status IS NULL OR r.status = :status) "
            + "AND (:participantType IS NULL OR r.participantType = :participantType)")
    Page<EventRegistration> findByUser(@Param("userId") UUID userId,
                                       @Param("status") EventRegistrationStatus status,
                                       @Param("participantType") EventParticipantType participantType,
                                       Pageable pageable);

    @Query("SELECT r.event.id FROM EventRegistration r WHERE r.user.id = :userId "
            + "AND r.status = com.vju.club.enums.EventRegistrationStatus.REGISTERED")
    List<UUID> findRegisteredEventIdsByUserId(@Param("userId") UUID userId);

    @Query("SELECT r.user.id FROM EventRegistration r WHERE r.event.id = :eventId "
            + "AND r.status = com.vju.club.enums.EventRegistrationStatus.REGISTERED")
    List<UUID> findRegisteredUserIds(@Param("eventId") UUID eventId);
}
