package com.vju.club.service.impl;

import com.vju.club.common.AcademicTermUtil;
import com.vju.club.common.EventConstants;
import com.vju.club.common.UserConstants;
import com.vju.club.dto.response.EventsTimelineResponse;
import com.vju.club.dto.response.EventsTimelineResponse.TimelineEventItem;
import com.vju.club.dto.response.EventsTimelineResponse.TimelineUnitSummary;
import com.vju.club.entity.Club;
import com.vju.club.error.ApiException;
import com.vju.club.repository.ClubRepository;
import com.vju.club.repository.UserPermissionRepository;
import com.vju.club.security.Actor;
import jakarta.persistence.EntityManager;
import jakarta.persistence.Query;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.sql.Timestamp;
import java.time.Clock;
import java.time.Instant;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class EventsTimelineServiceImpl {
    private static final String DOAN_VJU_CODE = "DOANVJU";
    private static final Set<String> OFFICER_KEYS = Set.of(
            EventConstants.PERMISSION_ATTENDANCE,
            EventConstants.PERMISSION_ATTENDANCE_EDIT,
            EventConstants.PERMISSION_UPDATE,
            EventConstants.PERMISSION_CREATE,
            "club.update"
    );

    private final EntityManager entityManager;
    private final ClubRepository clubRepository;
    private final UserPermissionRepository userPermissionRepository;
    private final Clock clock;

    @Transactional(readOnly = true)
    public EventsTimelineResponse getTimeline(
            Actor actor,
            UUID clubId,
            String academicTerm,
            OffsetDateTime from,
            OffsetDateTime to
    ) {
        if (actor == null) {
            throw new ApiException(HttpStatus.UNAUTHORIZED, "UNAUTHORIZED", "Authentication required");
        }
        if (from != null && to != null && from.isAfter(to)) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "INVALID_TIME_RANGE", "Start time must not be after end time");
        }

        List<UserPermissionRepository.EffectivePermissionRow> effective = userPermissionRepository.findEffective(actor.id());
        boolean isGlobal = effective.stream().anyMatch(row ->
                "GLOBAL".equals(row.getScope())
                        && (OFFICER_KEYS.contains(row.getPermissionKey()) || UserConstants.PERMISSION_VIEW.equals(row.getPermissionKey()))
        );
        Set<UUID> permittedClubIds = new LinkedHashSet<>();
        for (UserPermissionRepository.EffectivePermissionRow row : effective) {
            if (OFFICER_KEYS.contains(row.getPermissionKey()) && row.getClubId() != null) {
                permittedClubIds.add(row.getClubId());
            }
        }
        boolean isDoanVjuOfficer = clubRepository.findByCodeIgnoreCase(DOAN_VJU_CODE)
                .map(c -> permittedClubIds.contains(c.getId()))
                .orElse(false);
        boolean crossUnitAccess = isGlobal || isDoanVjuOfficer;

        if (!crossUnitAccess && permittedClubIds.isEmpty()) {
            throw new ApiException(HttpStatus.FORBIDDEN, "PERMISSION_DENIED", "Permission denied");
        }

        Set<UUID> scopedClubIds;
        if (clubId != null) {
            if (!crossUnitAccess && !permittedClubIds.contains(clubId)) {
                throw new ApiException(HttpStatus.FORBIDDEN, "PERMISSION_DENIED", "Permission denied");
            }
            Club targetClub = clubRepository.findById(clubId)
                    .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "CLUB_NOT_FOUND", "Club not found"));
            scopedClubIds = Set.of(targetClub.getId());
        } else {
            scopedClubIds = crossUnitAccess ? null : permittedClubIds;
        }

        String termFilter = AcademicTermUtil.normalizeAndValidate(academicTerm);

        StringBuilder unitSql = new StringBuilder("""
                SELECT c.id, c.code, c.name
                FROM clubs c
                WHERE c.status = 'ACTIVE'
                """);
        if (scopedClubIds != null) {
            unitSql.append(" AND c.id IN (:scopedClubIds)");
        }
        unitSql.append(" ORDER BY CASE WHEN UPPER(c.code) = 'DOANVJU' THEN 0 ELSE 1 END, c.name ASC");

        Query unitQuery = entityManager.createNativeQuery(unitSql.toString());
        if (scopedClubIds != null) {
            unitQuery.setParameter("scopedClubIds", scopedClubIds);
        }

        @SuppressWarnings("unchecked")
        List<Object[]> unitRows = unitQuery.getResultList();

        Map<UUID, UnitAccumulator> unitsByClubId = new LinkedHashMap<>();
        for (Object[] row : unitRows) {
            UUID unitId = asUuid(row[0]);
            unitsByClubId.put(unitId, new UnitAccumulator(unitId, asString(row[1]), asString(row[2])));
        }

        StringBuilder eventSql = new StringBuilder("""
                SELECT e.id,
                       e.club_id,
                       c.code AS club_code,
                       c.name AS club_name,
                       e.title,
                       e.event_type,
                       e.status,
                       e.location,
                       e.academic_term,
                       e.start_time,
                       e.end_time,
                       e.max_participants,
                       e.attendance_locked_at,
                       e.attendance_signature_sha256,
                       (SELECT COUNT(*) FROM event_registrations r
                        WHERE r.event_id = e.id AND r.status = 'REGISTERED') AS registration_count,
                       (SELECT COUNT(*) FROM event_attendances a
                        LEFT JOIN event_registrations r ON r.event_id = a.event_id AND r.user_id = a.user_id
                        WHERE a.event_id = e.id
                          AND a.status IN ('PRESENT', 'LATE')
                          AND (r.id IS NULL OR r.status = 'REGISTERED')) AS present_count
                FROM events e
                JOIN clubs c ON c.id = e.club_id
                WHERE c.status = 'ACTIVE'
                  AND e.status <> 'CANCELLED'
                """);

        if (scopedClubIds != null) {
            eventSql.append(" AND e.club_id IN (:scopedClubIds)");
        }
        if (termFilter != null) {
            eventSql.append(" AND e.academic_term = :academicTerm");
        }
        if (from != null) {
            eventSql.append(" AND e.end_time >= :fromTime");
        }
        if (to != null) {
            eventSql.append(" AND e.start_time <= :toTime");
        }
        eventSql.append(" ORDER BY e.start_time ASC, e.id ASC");

        Query eventQuery = entityManager.createNativeQuery(eventSql.toString());
        if (scopedClubIds != null) {
            eventQuery.setParameter("scopedClubIds", scopedClubIds);
        }
        if (termFilter != null) {
            eventQuery.setParameter("academicTerm", termFilter);
        }
        if (from != null) {
            eventQuery.setParameter("fromTime", from);
        }
        if (to != null) {
            eventQuery.setParameter("toTime", to);
        }

        @SuppressWarnings("unchecked")
        List<Object[]> eventRows = eventQuery.getResultList();

        int totalEvents = 0;
        for (Object[] row : eventRows) {
            UUID eventId = asUuid(row[0]);
            UUID eventClubId = asUuid(row[1]);
            String clubCode = asString(row[2]);
            String clubName = asString(row[3]);
            String title = asString(row[4]);
            String eventType = asString(row[5]);
            String status = asString(row[6]);
            String location = asString(row[7]);
            String eventTerm = asString(row[8]);
            OffsetDateTime startTime = asOffsetDateTime(row[9]);
            OffsetDateTime endTime = asOffsetDateTime(row[10]);
            Integer maxParticipants = asInteger(row[11]);
            OffsetDateTime lockedAt = asOffsetDateTime(row[12]);
            String signature = asString(row[13]);
            long regCount = asLong(row[14]);
            long presentCount = asLong(row[15]);
            double rate = computeRate(presentCount, regCount);

            UnitAccumulator unitAcc = unitsByClubId.computeIfAbsent(
                    eventClubId,
                    id -> new UnitAccumulator(id, clubCode, clubName)
            );
            unitAcc.totalRegistrations += regCount;
            unitAcc.totalPresent += presentCount;
            unitAcc.events.add(new TimelineEventItem(
                    eventId,
                    eventClubId,
                    clubCode,
                    clubName,
                    title,
                    eventType,
                    status,
                    location,
                    eventTerm,
                    startTime,
                    endTime,
                    regCount,
                    presentCount,
                    maxParticipants,
                    rate,
                    lockedAt != null && signature != null && !signature.isBlank(),
                    signature
            ));
            totalEvents++;
        }

        List<TimelineUnitSummary> units = unitsByClubId.values().stream()
                .map(u -> new TimelineUnitSummary(
                        u.clubId,
                        u.clubCode,
                        u.clubName,
                        u.events.size(),
                        u.totalRegistrations,
                        u.totalPresent,
                        computeRate(u.totalPresent, u.totalRegistrations),
                        List.copyOf(u.events)
                ))
                .toList();

        return new EventsTimelineResponse(
                OffsetDateTime.now(clock),
                termFilter,
                from,
                to,
                units.size(),
                totalEvents,
                units
        );
    }

    private static double computeRate(long present, long registrations) {
        if (registrations <= 0 || present <= 0) {
            return 0.0;
        }
        return Math.round((present * 1000.0) / registrations) / 10.0;
    }

    private static UUID asUuid(Object val) {
        if (val == null) return null;
        return val instanceof UUID u ? u : UUID.fromString(val.toString());
    }

    private static String asString(Object val) {
        return val == null ? null : val.toString();
    }

    private static long asLong(Object val) {
        return val instanceof Number n ? n.longValue() : 0L;
    }

    private static Integer asInteger(Object val) {
        return val instanceof Number n ? n.intValue() : null;
    }

    private static OffsetDateTime asOffsetDateTime(Object val) {
        if (val == null) return null;
        if (val instanceof OffsetDateTime odt) return odt;
        if (val instanceof Instant inst) return inst.atOffset(ZoneOffset.UTC);
        if (val instanceof Timestamp ts) return ts.toInstant().atOffset(ZoneOffset.UTC);
        if (val instanceof java.util.Date d) return d.toInstant().atOffset(ZoneOffset.UTC);
        return OffsetDateTime.parse(val.toString());
    }

    private static final class UnitAccumulator {
        final UUID clubId;
        final String clubCode;
        final String clubName;
        final List<TimelineEventItem> events = new ArrayList<>();
        long totalRegistrations;
        long totalPresent;

        UnitAccumulator(UUID clubId, String clubCode, String clubName) {
            this.clubId = clubId;
            this.clubCode = clubCode;
            this.clubName = clubName;
        }
    }
}
