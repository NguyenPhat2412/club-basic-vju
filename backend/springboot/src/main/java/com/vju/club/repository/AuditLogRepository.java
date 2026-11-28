package com.vju.club.repository;

import com.vju.club.entity.AuditLog;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

import java.time.OffsetDateTime;
import java.util.Collection;
import java.util.List;
import java.util.UUID;

public interface AuditLogRepository extends JpaRepository<AuditLog, UUID>, JpaSpecificationExecutor<AuditLog> {
    List<AuditLog> findByActionInAndCreatedAtAfterOrderByCreatedAtDesc(
            Collection<String> actions,
            OffsetDateTime createdAfter,
            Pageable pageable);

    long countByActionInAndCreatedAtAfter(Collection<String> actions, OffsetDateTime createdAfter);
}
