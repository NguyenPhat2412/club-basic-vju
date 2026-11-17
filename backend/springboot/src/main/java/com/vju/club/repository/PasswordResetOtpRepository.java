package com.vju.club.repository;

import com.vju.club.entity.PasswordResetOtp;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.OffsetDateTime;
import java.util.Optional;
import java.util.UUID;

public interface PasswordResetOtpRepository extends JpaRepository<PasswordResetOtp, UUID> {
    Optional<PasswordResetOtp> findFirstByUser_IdOrderByCreatedAtDesc(UUID userId);

    Optional<PasswordResetOtp> findFirstByUser_IdAndConsumedAtIsNullAndInvalidatedAtIsNullOrderByCreatedAtDesc(UUID userId);

    long countByUser_IdAndCreatedAtAfter(UUID userId, OffsetDateTime since);

    @Modifying
    @Query("UPDATE PasswordResetOtp o SET o.invalidatedAt = :now "
            + "WHERE o.user.id = :userId AND o.consumedAt IS NULL AND o.invalidatedAt IS NULL")
    int invalidateActiveForUser(@Param("userId") UUID userId, @Param("now") OffsetDateTime now);
}
