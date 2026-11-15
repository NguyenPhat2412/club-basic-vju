package com.vju.club.service.impl;

import com.vju.club.annotation.RequirePermission;
import com.vju.club.common.UserConstants;
import com.vju.club.dto.response.ClubStatisticsResponse;
import com.vju.club.dto.response.SystemStatisticsResponse;
import com.vju.club.entity.Club;
import com.vju.club.error.ApiException;
import com.vju.club.repository.ClubRepository;
import com.vju.club.security.Actor;
import com.vju.club.security.PermissionAuthorizationService;
import com.vju.club.service.StatisticsService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.sql.Types;
import java.time.Clock;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class StatisticsServiceImpl implements StatisticsService {
    private final NamedParameterJdbcTemplate jdbc;
    private final ClubRepository clubRepository;
    private final PermissionAuthorizationService authorizationService;
    private final Clock clock;

    @Override
    @Transactional(readOnly = true)
    @RequirePermission(UserConstants.PERMISSION_VIEW)
    public SystemStatisticsResponse getSystemStatistics(Actor actor) {
        OffsetDateTime now = OffsetDateTime.now(clock);

        Map<String, Object> userCounts = jdbc.getJdbcOperations().queryForMap("""
                SELECT COUNT(*) AS total_users,
                       COUNT(*) FILTER (WHERE status = 'ACTIVE') AS active_users,
                       COUNT(*) FILTER (WHERE status = 'LOCKED') AS locked_users,
                       COUNT(*) FILTER (WHERE status = 'INACTIVE') AS inactive_users,
                       COUNT(*) FILTER (WHERE anonymized_at IS NOT NULL) AS anonymized_users
                FROM users
                """);

        Map<String, Object> clubCounts = jdbc.getJdbcOperations().queryForMap("""
                SELECT COUNT(*) AS total_clubs,
                       COUNT(*) FILTER (WHERE status = 'ACTIVE') AS active_clubs,
                       COUNT(*) FILTER (WHERE status = 'INACTIVE') AS inactive_clubs
                FROM clubs
                """);

        List<SystemStatisticsResponse.RoleCountItem> roleBreakdown = jdbc.getJdbcOperations().query("""
                SELECT r.code AS role_code,
                       r.name AS role_name,
                       r.scope AS role_scope,
                       COUNT(ur.id) AS assignment_count,
                       COUNT(DISTINCT ur.user_id) AS distinct_users
                FROM roles r
                LEFT JOIN user_roles ur ON ur.role_id = r.id AND ur.revoked_at IS NULL
                WHERE r.active = TRUE
                GROUP BY r.id, r.code, r.name, r.scope
                ORDER BY r.system DESC, r.code ASC
                """, (rs, rowNum) -> new SystemStatisticsResponse.RoleCountItem(
                rs.getString("role_code"),
                rs.getString("role_name"),
                rs.getString("role_scope"),
                rs.getLong("assignment_count"),
                rs.getLong("distinct_users")
        ));

        return new SystemStatisticsResponse(
                asLong(userCounts.get("total_users")),
                asLong(userCounts.get("active_users")),
                asLong(userCounts.get("locked_users")),
                asLong(userCounts.get("inactive_users")),
                asLong(userCounts.get("anonymized_users")),
                asLong(clubCounts.get("total_clubs")),
                asLong(clubCounts.get("active_clubs")),
                asLong(clubCounts.get("inactive_clubs")),
                roleBreakdown,
                now
        );
    }

    @Override
    @Transactional(readOnly = true)
    public ClubStatisticsResponse getClubStatistics(Actor actor, UUID clubId, OffsetDateTime from, OffsetDateTime to) {
        Club club = clubRepository.findById(clubId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "CLUB_NOT_FOUND", "Club not found"));
        boolean allowed = authorizationService.hasPermission(actor, "club.view", clubId, null)
                || authorizationService.hasPermission(actor, "member.view", clubId, null);
        if (!allowed) {
            throw new ApiException(HttpStatus.FORBIDDEN, "PERMISSION_DENIED", "Permission denied");
        }
        if (from != null && to != null && from.isAfter(to)) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "INVALID_TIME_RANGE", "Start time must not be after end time");
        }

        OffsetDateTime now = OffsetDateTime.now(clock);
        MapSqlParameterSource params = new MapSqlParameterSource()
                .addValue("clubId", clubId, Types.OTHER)
                .addValue("hasFrom", from != null, Types.BOOLEAN)
                .addValue("fromTime", from != null ? from : now, Types.TIMESTAMP_WITH_TIMEZONE)
                .addValue("hasTo", to != null, Types.BOOLEAN)
                .addValue("toTime", to != null ? to : now, Types.TIMESTAMP_WITH_TIMEZONE)
                .addValue("now", now, Types.TIMESTAMP_WITH_TIMEZONE);

        Map<String, Object> clubBase = jdbc.queryForMap("""
                SELECT (SELECT COUNT(*) FROM memberships m WHERE m.club_id = :clubId AND m.status = 'ACTIVE') AS active_members,
                       (SELECT COUNT(*) FROM memberships m WHERE m.club_id = :clubId AND m.status = 'SUSPENDED') AS suspended_members,
                       (SELECT COUNT(*) FROM memberships m WHERE m.club_id = :clubId AND m.status = 'LEFT') AS left_members,
                       (SELECT COUNT(*) FROM departments d WHERE d.club_id = :clubId AND d.status = 'ACTIVE') AS active_departments,
                       (SELECT COUNT(*) FROM club_applications a WHERE a.club_id = :clubId AND a.status = 'PENDING') AS pending_applications,
                       (SELECT COUNT(*) FROM documents doc WHERE doc.club_id = :clubId AND doc.deleted = FALSE) AS live_documents,
                       (SELECT COALESCE(SUM(doc.size_bytes), 0) FROM documents doc WHERE doc.club_id = :clubId AND doc.deleted = FALSE) AS total_document_bytes,
                       (SELECT COUNT(*) FROM chat_channels ch WHERE ch.club_id = :clubId) AS chat_channels
                """, params);

        Map<String, Object> applicationCounts = jdbc.queryForMap("""
                SELECT COUNT(*) AS applications_submitted,
                       COUNT(*) FILTER (WHERE a.status = 'PENDING') AS period_pending,
                       COUNT(*) FILTER (WHERE a.status = 'APPROVED') AS approved_applications,
                       COUNT(*) FILTER (WHERE a.status = 'REJECTED') AS rejected_applications,
                       COUNT(*) FILTER (WHERE a.status = 'CANCELLED') AS cancelled_applications
                FROM club_applications a
                WHERE a.club_id = :clubId
                  AND (:hasFrom = FALSE OR a.created_at >= :fromTime)
                  AND (:hasTo = FALSE OR a.created_at <= :toTime)
                """, params);

        Map<String, Object> eventCounts = jdbc.queryForMap("""
                SELECT COUNT(*) FILTER (WHERE e.status <> 'DRAFT') AS total_events,
                       COUNT(*) FILTER (WHERE e.status = 'DRAFT') AS draft_events,
                       COUNT(*) FILTER (WHERE e.status = 'OPEN_REGISTRATION') AS open_events,
                       COUNT(*) FILTER (WHERE e.status = 'CLOSED_REGISTRATION') AS closed_registration_events,
                       COUNT(*) FILTER (WHERE e.status = 'COMPLETED') AS completed_events,
                       COUNT(*) FILTER (WHERE e.status = 'CANCELLED') AS cancelled_events
                FROM events e
                WHERE e.club_id = :clubId
                  AND (:hasFrom = FALSE OR e.start_time >= :fromTime)
                  AND (:hasTo = FALSE OR e.start_time <= :toTime)
                """, params);

        Map<String, Object> registrationCounts = jdbc.queryForMap("""
                SELECT COUNT(DISTINCT r.user_id) FILTER (WHERE r.status = 'REGISTERED' AND e.status NOT IN ('DRAFT', 'CANCELLED')) AS unique_participants,
                       COUNT(r.id) FILTER (WHERE r.status = 'REGISTERED' AND e.status NOT IN ('DRAFT', 'CANCELLED')) AS active_registrations,
                       COUNT(r.id) FILTER (WHERE r.status = 'REGISTERED' AND r.participant_type = 'MEMBER' AND e.status NOT IN ('DRAFT', 'CANCELLED')) AS member_registrations,
                       COUNT(r.id) FILTER (WHERE r.status = 'REGISTERED' AND r.participant_type = 'CTV' AND e.status NOT IN ('DRAFT', 'CANCELLED')) AS ctv_registrations,
                       COUNT(r.id) FILTER (WHERE r.status = 'CANCELLED' AND e.status <> 'DRAFT') AS cancelled_registrations
                FROM events e
                LEFT JOIN event_registrations r ON r.event_id = e.id
                WHERE e.club_id = :clubId
                  AND (:hasFrom = FALSE OR e.start_time >= :fromTime)
                  AND (:hasTo = FALSE OR e.start_time <= :toTime)
                """, params);

        Map<String, Object> attendanceCounts = jdbc.queryForMap("""
                SELECT COUNT(a.id) FILTER (
                           WHERE e.status NOT IN ('DRAFT', 'CANCELLED')
                             AND a.status IN ('PRESENT', 'LATE')
                             AND (r.id IS NULL OR r.status = 'REGISTERED')
                       ) AS attended_count,
                       COUNT(a.id) FILTER (
                           WHERE e.status NOT IN ('DRAFT', 'CANCELLED')
                             AND a.status IN ('PRESENT', 'LATE')
                             AND (r.id IS NULL OR (r.status = 'REGISTERED' AND r.participant_type = 'MEMBER'))
                       ) AS member_attended,
                       COUNT(a.id) FILTER (
                           WHERE e.status NOT IN ('DRAFT', 'CANCELLED')
                             AND a.status IN ('PRESENT', 'LATE')
                             AND r.status = 'REGISTERED'
                             AND r.participant_type = 'CTV'
                       ) AS ctv_attended,
                       COUNT(a.id) FILTER (
                           WHERE e.status NOT IN ('DRAFT', 'CANCELLED')
                             AND a.status IN ('ABSENT', 'EXCUSED')
                             AND (r.id IS NULL OR r.status = 'REGISTERED')
                       ) AS absent_or_excused_count
                FROM events e
                LEFT JOIN event_attendances a ON a.event_id = e.id
                LEFT JOIN event_registrations r ON r.event_id = a.event_id AND r.user_id = a.user_id
                WHERE e.club_id = :clubId
                  AND (:hasFrom = FALSE OR e.start_time >= :fromTime)
                  AND (:hasTo = FALSE OR e.start_time <= :toTime)
                """, params);

        Map<String, Object> taskCounts = jdbc.queryForMap("""
                SELECT COUNT(*) FILTER (WHERE t.status IN ('TODO', 'IN_PROGRESS', 'DONE', 'OVERDUE')) AS open_tasks,
                       COUNT(*) FILTER (WHERE t.status = 'TODO') AS todo_tasks,
                       COUNT(*) FILTER (WHERE t.status = 'IN_PROGRESS') AS in_progress_tasks,
                       COUNT(*) FILTER (WHERE t.status = 'DONE') AS review_pending_tasks,
                       COUNT(*) FILTER (
                           WHERE t.status = 'OVERDUE'
                              OR (t.status IN ('TODO', 'IN_PROGRESS') AND t.deadline < :now)
                       ) AS overdue_tasks,
                       COUNT(*) FILTER (WHERE t.status = 'COMPLETED') AS completed_tasks,
                       COUNT(*) FILTER (WHERE t.status = 'CANCELLED') AS cancelled_tasks
                FROM tasks t
                WHERE t.club_id = :clubId
                  AND (:hasFrom = FALSE OR t.created_at >= :fromTime)
                  AND (:hasTo = FALSE OR t.created_at <= :toTime)
                """, params);

        List<ClubStatisticsResponse.DepartmentStatsItem> departmentBreakdown = jdbc.query("""
                SELECT d.id AS department_id,
                       d.name AS department_name,
                       d.status AS department_status,
                       (SELECT COUNT(*)
                        FROM department_members dm
                        JOIN memberships m ON m.id = dm.membership_id AND m.club_id = dm.club_id
                        WHERE dm.department_id = d.id AND m.status = 'ACTIVE') AS active_members,
                       (SELECT COUNT(*)
                        FROM club_applications ca
                        WHERE ca.club_id = :clubId
                          AND ca.preferred_department_id = d.id
                          AND (:hasFrom = FALSE OR ca.created_at >= :fromTime)
                          AND (:hasTo = FALSE OR ca.created_at <= :toTime)) AS first_choice_applications,
                       (SELECT COUNT(*)
                        FROM club_applications ca
                        WHERE ca.club_id = :clubId
                          AND ca.secondary_department_id = d.id
                          AND (:hasFrom = FALSE OR ca.created_at >= :fromTime)
                          AND (:hasTo = FALSE OR ca.created_at <= :toTime)) AS second_choice_applications,
                       (SELECT COUNT(*)
                        FROM tasks t
                        WHERE t.club_id = :clubId
                          AND t.department_id = d.id
                          AND t.status IN ('TODO', 'IN_PROGRESS', 'DONE', 'OVERDUE')
                          AND (:hasFrom = FALSE OR t.created_at >= :fromTime)
                          AND (:hasTo = FALSE OR t.created_at <= :toTime)) AS open_tasks,
                       (SELECT COUNT(*)
                        FROM tasks t
                        WHERE t.club_id = :clubId
                          AND t.department_id = d.id
                          AND t.status = 'COMPLETED'
                          AND (:hasFrom = FALSE OR t.created_at >= :fromTime)
                          AND (:hasTo = FALSE OR t.created_at <= :toTime)) AS completed_tasks
                FROM departments d
                WHERE d.club_id = :clubId
                ORDER BY (d.status = 'ACTIVE') DESC, active_members DESC, d.name ASC
                """, params, (rs, rowNum) -> new ClubStatisticsResponse.DepartmentStatsItem(
                UUID.fromString(rs.getString("department_id")),
                rs.getString("department_name"),
                rs.getString("department_status"),
                rs.getLong("active_members"),
                rs.getLong("first_choice_applications"),
                rs.getLong("second_choice_applications"),
                rs.getLong("open_tasks"),
                rs.getLong("completed_tasks")
        ));

        long approvedApps = asLong(applicationCounts.get("approved_applications"));
        long rejectedApps = asLong(applicationCounts.get("rejected_applications"));
        int approvalRate = percent(approvedApps, approvedApps + rejectedApps);

        long attendedCount = asLong(attendanceCounts.get("attended_count"));
        long absentOrExcusedCount = asLong(attendanceCounts.get("absent_or_excused_count"));
        int attendanceRate = percent(attendedCount, attendedCount + absentOrExcusedCount);

        long openTasks = asLong(taskCounts.get("open_tasks"));
        long completedTasks = asLong(taskCounts.get("completed_tasks"));
        int taskCompletionRate = percent(completedTasks, openTasks + completedTasks);

        return new ClubStatisticsResponse(
                club.getId(),
                club.getCode(),
                club.getName(),
                from,
                to,
                asLong(clubBase.get("active_members")),
                asLong(clubBase.get("suspended_members")),
                asLong(clubBase.get("left_members")),
                asLong(clubBase.get("active_departments")),
                asLong(clubBase.get("pending_applications")),
                asLong(applicationCounts.get("applications_submitted")),
                asLong(applicationCounts.get("period_pending")),
                approvedApps,
                rejectedApps,
                asLong(applicationCounts.get("cancelled_applications")),
                approvalRate,
                asLong(eventCounts.get("total_events")),
                asLong(eventCounts.get("draft_events")),
                asLong(eventCounts.get("open_events")),
                asLong(eventCounts.get("closed_registration_events")),
                asLong(eventCounts.get("completed_events")),
                asLong(eventCounts.get("cancelled_events")),
                asLong(registrationCounts.get("unique_participants")),
                asLong(registrationCounts.get("active_registrations")),
                asLong(registrationCounts.get("member_registrations")),
                asLong(registrationCounts.get("ctv_registrations")),
                asLong(registrationCounts.get("cancelled_registrations")),
                attendedCount,
                asLong(attendanceCounts.get("member_attended")),
                asLong(attendanceCounts.get("ctv_attended")),
                absentOrExcusedCount,
                attendanceRate,
                openTasks,
                asLong(taskCounts.get("todo_tasks")),
                asLong(taskCounts.get("in_progress_tasks")),
                asLong(taskCounts.get("review_pending_tasks")),
                asLong(taskCounts.get("overdue_tasks")),
                completedTasks,
                asLong(taskCounts.get("cancelled_tasks")),
                taskCompletionRate,
                asLong(clubBase.get("live_documents")),
                asLong(clubBase.get("total_document_bytes")),
                asLong(clubBase.get("chat_channels")),
                departmentBreakdown,
                now
        );
    }

    private static long asLong(Object value) {
        return value instanceof Number n ? n.longValue() : 0L;
    }

    private static int percent(long numerator, long denominator) {
        if (denominator <= 0 || numerator <= 0) return 0;
        return (int) Math.round(numerator * 100.0 / denominator);
    }
}
