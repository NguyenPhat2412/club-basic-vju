package com.vju.club.modules.audit.repository;

import com.vju.club.modules.audit.entity.AuditLog;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.UUID;

public interface AuditLogRepository extends JpaRepository<AuditLog, UUID> {

    String FILTER = "FROM AuditLog a WHERE (:resourceType IS NULL OR a.resourceType = :resourceType) "
            + "AND (:resourceId IS NULL OR a.resourceId = :resourceId) "
            + "AND (:actorUserId IS NULL OR a.actorUserId = :actorUserId) "
            + "AND (:clubId IS NULL OR a.clubId = :clubId) "
            + "AND (:action IS NULL OR a.action = :action)";

    /** Newest first; every filter is optional. */
    @Query("SELECT a " + FILTER + " ORDER BY a.createdAt DESC, a.id DESC")
    List<AuditLog> search(@Param("resourceType") String resourceType, @Param("resourceId") UUID resourceId,
                          @Param("actorUserId") UUID actorUserId, @Param("clubId") UUID clubId,
                          @Param("action") String action, Pageable pageable);

    @Query("SELECT count(a) " + FILTER)
    long countSearch(@Param("resourceType") String resourceType, @Param("resourceId") UUID resourceId,
                     @Param("actorUserId") UUID actorUserId, @Param("clubId") UUID clubId,
                     @Param("action") String action);
}
