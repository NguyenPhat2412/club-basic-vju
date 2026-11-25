package com.vju.club.repository;

import com.vju.club.entity.EventFeedback;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface EventFeedbackRepository extends JpaRepository<EventFeedback, UUID> {
    @EntityGraph(attributePaths = {"event", "user"})
    List<EventFeedback> findByEvent_IdOrderByCreatedAtDesc(UUID eventId);

    @EntityGraph(attributePaths = {"event", "user"})
    Optional<EventFeedback> findByEvent_IdAndUser_Id(UUID eventId, UUID userId);

    boolean existsByEvent_IdAndUser_Id(UUID eventId, UUID userId);

    long countByEvent_Id(UUID eventId);
}
