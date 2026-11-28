package com.vju.club.repository;

import com.vju.club.entity.BlockedIp;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface BlockedIpRepository extends JpaRepository<BlockedIp, UUID> {
    Optional<BlockedIp> findByIpAddress(String ipAddress);

    @Query("SELECT b FROM BlockedIp b WHERE b.expiresAt IS NULL OR b.expiresAt > :now ORDER BY b.createdAt DESC")
    List<BlockedIp> findActive(@Param("now") OffsetDateTime now);
}
