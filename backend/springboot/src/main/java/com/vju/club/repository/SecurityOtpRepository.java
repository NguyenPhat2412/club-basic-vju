package com.vju.club.repository;

import com.vju.club.entity.SecurityOtp;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.OffsetDateTime;
import java.util.Optional;
import java.util.UUID;

public interface SecurityOtpRepository extends JpaRepository<SecurityOtp, UUID> {
    Optional<SecurityOtp> findFirstByUser_IdAndPurposeOrderByCreatedAtDesc(UUID userId, String purpose);

    Optional<SecurityOtp> findFirstByUser_IdAndPurposeAndConsumedAtIsNullAndInvalidatedAtIsNullOrderByCreatedAtDesc(
            UUID userId, String purpose);

    long countByUser_IdAndPurposeAndCreatedAtAfter(UUID userId, String purpose, OffsetDateTime since);

    @Modifying
    @Query("UPDATE SecurityOtp o SET o.invalidatedAt = :now "
            + "WHERE o.user.id = :userId AND o.purpose = :purpose AND o.consumedAt IS NULL AND o.invalidatedAt IS NULL")
    int invalidateActiveForUserAndPurpose(@Param("userId") UUID userId,
                                          @Param("purpose") String purpose,
                                          @Param("now") OffsetDateTime now);
}
