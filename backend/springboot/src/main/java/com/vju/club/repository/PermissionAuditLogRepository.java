package com.vju.club.repository;

import com.vju.club.entity.PermissionAuditLog;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface PermissionAuditLogRepository extends JpaRepository<PermissionAuditLog, UUID> { }
