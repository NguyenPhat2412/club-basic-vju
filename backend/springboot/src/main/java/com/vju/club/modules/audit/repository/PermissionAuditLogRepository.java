package com.vju.club.modules.audit.repository;

import com.vju.club.modules.audit.entity.PermissionAuditLog;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface PermissionAuditLogRepository extends JpaRepository<PermissionAuditLog, UUID> { }
