package com.vju.club.repository;

import com.vju.club.entity.CertificateShareLink;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface CertificateShareLinkRepository extends JpaRepository<CertificateShareLink, UUID> {

    List<CertificateShareLink> findByUser_IdOrderByCreatedAtDesc(UUID userId);

    Optional<CertificateShareLink> findByIdAndUser_Id(UUID id, UUID userId);

    @EntityGraph(attributePaths = {"user"})
    Optional<CertificateShareLink> findWithUserByToken(String token);

    @Query("""
            SELECT COUNT(l) FROM CertificateShareLink l
            WHERE l.user.id = :userId
              AND l.revokedAt IS NULL
              AND (l.expiresAt IS NULL OR l.expiresAt > :now)
            """)
    long countActiveByUserId(@Param("userId") UUID userId, @Param("now") OffsetDateTime now);

    @Modifying
    @Query("UPDATE CertificateShareLink l SET l.viewCount = l.viewCount + 1, l.lastViewedAt = :now WHERE l.id = :id")
    int incrementViewCount(@Param("id") UUID id, @Param("now") OffsetDateTime now);
}
