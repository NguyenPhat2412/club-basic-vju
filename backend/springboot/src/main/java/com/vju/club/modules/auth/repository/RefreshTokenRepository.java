package com.vju.club.modules.auth.repository;

import com.vju.club.modules.auth.entity.RefreshToken;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.OffsetDateTime;
import java.util.Optional;
import java.util.UUID;

public interface RefreshTokenRepository extends JpaRepository<RefreshToken, UUID> {
    Optional<RefreshToken> findByTokenHash(String tokenHash);

    /**
     * Revokes the token only if it is still active. The row lock taken by UPDATE makes this the
     * single winner when two requests rotate the same refresh token concurrently.
     */
    @Modifying(flushAutomatically = true, clearAutomatically = true)
    @Query("UPDATE RefreshToken t SET t.revokedAt = :now "
            + "WHERE t.id = :id AND t.revokedAt IS NULL AND t.expiresAt > :now")
    int revokeIfActive(@Param("id") UUID id, @Param("now") OffsetDateTime now);

    /** Removes tokens that expired or were revoked before the cutoff; they can never be used again. */
    @Modifying
    @Query("DELETE FROM RefreshToken t WHERE t.expiresAt < :cutoff OR t.revokedAt < :cutoff")
    int deleteDeadBefore(@Param("cutoff") OffsetDateTime cutoff);

    @Modifying(flushAutomatically = true, clearAutomatically = true)
    @Query("UPDATE RefreshToken t SET t.revokedAt = :now WHERE t.user.id = :userId AND t.revokedAt IS NULL")
    int revokeAllForUser(@Param("userId") UUID userId, @Param("now") OffsetDateTime now);
}
