package com.vju.club.service.impl;

import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

import java.time.Clock;
import java.time.OffsetDateTime;
import java.util.UUID;

/**
 * Checks operational/audit history for user accounts and cleans up active assignments/commitments
 * when an account with historical records is anonymized in-place per PB-38 / PB-59.
 */
@Component
@RequiredArgsConstructor
public class UserAccountPurgeSupport {
    private final JdbcTemplate jdbc;
    private final Clock clock;

    public OffsetDateTime now() {
        return OffsetDateTime.now(clock);
    }

    public boolean hasOperationalOrAuditHistory(UUID userId) {
        Boolean exists = jdbc.queryForObject("""
                SELECT EXISTS (SELECT 1 FROM club_applications WHERE applicant_id = ? OR reviewed_by = ?)
                    OR EXISTS (SELECT 1 FROM event_registrations WHERE user_id = ?)
                    OR EXISTS (SELECT 1 FROM event_attendances WHERE user_id = ? OR checked_by = ?)
                    OR EXISTS (SELECT 1 FROM tasks WHERE assignee_id = ? OR assigner_id = ? OR verified_by = ?)
                    OR EXISTS (SELECT 1 FROM documents WHERE owner_id = ?)
                    OR EXISTS (SELECT 1 FROM chat_messages WHERE sender_id = ?)
                    OR EXISTS (SELECT 1 FROM ai_summaries WHERE requested_by = ?)
                    OR EXISTS (SELECT 1 FROM permission_audit_logs WHERE actor_user_id = ? OR target_user_id = ?)
                    OR EXISTS (SELECT 1 FROM audit_logs WHERE actor_user_id = ?)
                """, Boolean.class,
                userId, userId,
                userId,
                userId, userId,
                userId, userId, userId,
                userId,
                userId,
                userId,
                userId, userId,
                userId);
        return Boolean.TRUE.equals(exists);
    }

    public void cleanupCommitmentsForAnonymizedUser(UUID userId, UUID actorId, OffsetDateTime timestamp) {
        jdbc.update("""
                UPDATE user_roles
                SET revoked_at = ?, revoked_by = ?
                WHERE user_id = ? AND revoked_at IS NULL
                """, timestamp, actorId, userId);

        jdbc.update("""
                UPDATE user_permissions
                SET revoked_at = ?, revoked_by = ?
                WHERE user_id = ? AND revoked_at IS NULL
                """, timestamp, actorId, userId);

        jdbc.update("""
                DELETE FROM department_members
                WHERE membership_id IN (SELECT id FROM memberships WHERE user_id = ? AND status <> 'LEFT')
                """, userId);

        jdbc.update("""
                UPDATE memberships
                SET status = 'LEFT', left_at = ?
                WHERE user_id = ? AND status <> 'LEFT'
                """, timestamp, userId);

        jdbc.update("""
                UPDATE club_applications
                SET status = 'CANCELLED', cancelled_at = ?
                WHERE applicant_id = ? AND status = 'PENDING'
                """, timestamp, userId);

        jdbc.update("""
                UPDATE event_registrations r
                SET status = 'CANCELLED', cancelled_at = ?
                FROM events e
                WHERE r.event_id = e.id
                  AND r.user_id = ?
                  AND r.status = 'REGISTERED'
                  AND e.status = 'OPEN_REGISTRATION'
                """, timestamp, userId);

        jdbc.update("""
                UPDATE tasks
                SET assignee_id = assigner_id,
                    status = 'TODO',
                    progress_percent = 0
                WHERE assignee_id = ?
                  AND assigner_id <> ?
                  AND status IN ('TODO', 'IN_PROGRESS')
                """, userId, userId);

        jdbc.update("""
                UPDATE tasks
                SET status = 'CANCELLED'
                WHERE assignee_id = ?
                  AND assigner_id = ?
                  AND status IN ('TODO', 'IN_PROGRESS')
                """, userId, userId);
    }
}
