package com.vju.club.repository;

import com.vju.club.entity.EventCertificate;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface EventCertificateRepository extends JpaRepository<EventCertificate, UUID> {
    @EntityGraph(attributePaths = {"event", "event.department", "club", "user"})
    Optional<EventCertificate> findWithRelationsById(UUID id);

    @EntityGraph(attributePaths = {"event", "club", "user"})
    List<EventCertificate> findByEvent_IdOrderByIssuedAtDesc(UUID eventId);

    @EntityGraph(attributePaths = {"event", "club", "user"})
    List<EventCertificate> findByUser_IdOrderByIssuedAtDesc(UUID userId);

    @EntityGraph(attributePaths = {"event", "club", "user"})
    List<EventCertificate> findAllByOrderByIssuedAtDesc();

    @EntityGraph(attributePaths = {"event", "club", "user"})
    List<EventCertificate> findByClub_IdOrderByIssuedAtDesc(UUID clubId);

    Optional<EventCertificate> findByCertificateCode(String certificateCode);

    boolean existsByCertificateCode(String certificateCode);
}
