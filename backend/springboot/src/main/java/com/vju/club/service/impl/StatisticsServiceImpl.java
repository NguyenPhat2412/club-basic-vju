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
                       (SELECT COUNT(*) FROM departments d WHERE d.club_id = :clubId AND d.status = 'ACTIVE') AS active_departments,
                       (SELECT COUNT(*) FROM club_applications a WHERE a.club_id = :clubId AND a.status = 'PENDING') AS pending_applications
                """, params);

        Map<String, Object> eventCounts = jdbc.queryForMap("""
                SELECT COUNT(*) AS total_events,
                       COUNT(*) FILTER (WHERE e.status = 'OPEN_REGISTRATION') AS open_events,
                       COUNT(*) FILTER (WHERE e.status = 'COMPLETED') AS completed_events,
                       COUNT(*) FILTER (WHERE e.status = 'CANCELLED') AS cancelled_events
                FROM events e
                WHERE e.club_id = :clubId
                  AND (:hasFrom = FALSE OR e.start_time >= :fromTime)
                  AND (:hasTo = FALSE OR e.start_time <= :toTime)
                """, params);

        Map<String, Object> registrationCounts = jdbc.queryForMap("""
                SELECT COUNT(DISTINCT r.user_id) FILTER (WHERE r.status = 'REGISTERED' AND e.status <> 'CANCELLED') AS unique_participants,
                       COUNT(r.id) FILTER (WHERE r.status = 'REGISTERED' AND e.status <> 'CANCELLED') AS active_registrations,
                       COUNT(r.id) FILTER (WHERE r.status = 'CANCELLED') AS cancelled_registrations
                FROM events e
                LEFT JOIN event_registrations r ON r.event_id = e.id
                WHERE e.club_id = :clubId
                  AND (:hasFrom = FALSE OR e.start_time >= :fromTime)
                  AND (:hasTo = FALSE OR e.start_time <= :toTime)
                """, params);

        Map<String, Object> attendanceCounts = jdbc.queryForMap("""
                SELECT COUNT(a.id) FILTER (
                           WHERE e.status <> 'CANCELLED'
                             AND a.status IN ('PRESENT', 'LATE')
                             AND (r.id IS NULL OR r.status = 'REGISTERED')
                       ) AS attended_count,
                       COUNT(a.id) FILTER (
                           WHERE e.status <> 'CANCELLED'
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
                SELECT COUNT(*) FILTER (WHERE t.status IN ('TODO', 'IN_PROGRESS')) AS open_tasks,
                       COUNT(*) FILTER (WHERE t.status IN ('TODO', 'IN_PROGRESS') AND t.deadline < :now) AS overdue_tasks,
                       COUNT(*) FILTER (WHERE t.status = 'COMPLETED') AS completed_tasks
                FROM tasks t
                WHERE t.club_id = :clubId
                  AND (:hasFrom = FALSE OR t.created_at >= :fromTime)
                  AND (:hasTo = FALSE OR t.created_at <= :toTime)
                """, params);

        return new ClubStatisticsResponse(
                club.getId(),
                club.getCode(),
                club.getName(),
                from,
                to,
                asLong(clubBase.get("active_members")),
                asLong(clubBase.get("active_departments")),
                asLong(clubBase.get("pending_applications")),
                asLong(eventCounts.get("total_events")),
                asLong(eventCounts.get("open_events")),
                asLong(eventCounts.get("completed_events")),
                asLong(eventCounts.get("cancelled_events")),
                asLong(registrationCounts.get("unique_participants")),
                asLong(registrationCounts.get("active_registrations")),
                asLong(registrationCounts.get("cancelled_registrations")),
                asLong(attendanceCounts.get("attended_count")),
                asLong(attendanceCounts.get("absent_or_excused_count")),
                asLong(taskCounts.get("open_tasks")),
                asLong(taskCounts.get("overdue_tasks")),
                asLong(taskCounts.get("completed_tasks")),
                now
        );
    }

    private static long asLong(Object value) {
        return value instanceof Number n ? n.longValue() : 0L;
    }
}
