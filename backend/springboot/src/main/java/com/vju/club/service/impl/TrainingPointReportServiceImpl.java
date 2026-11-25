package com.vju.club.service.impl;

import com.vju.club.common.AcademicTermUtil;
import com.vju.club.common.EventConstants;
import com.vju.club.common.UserConstants;
import com.vju.club.dto.response.TrainingPointReportResponse;
import com.vju.club.dto.response.TrainingPointReportResponse.AttendedEventItem;
import com.vju.club.dto.response.TrainingPointReportResponse.StudentTrainingPointItem;
import com.vju.club.entity.Club;
import com.vju.club.error.ApiException;
import com.vju.club.repository.ClubRepository;
import com.vju.club.repository.UserPermissionRepository;
import com.vju.club.security.Actor;
import com.vju.club.service.TrainingPointReportService;
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
import java.util.Comparator;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class TrainingPointReportServiceImpl implements TrainingPointReportService {
    private static final String DOAN_VJU_CODE = "DOANVJU";
    private static final Set<String> OFFICER_KEYS = Set.of(
            EventConstants.PERMISSION_ATTENDANCE,
            EventConstants.PERMISSION_ATTENDANCE_EDIT,
            EventConstants.PERMISSION_UPDATE
    );

    private final EntityManager entityManager;
    private final ClubRepository clubRepository;
    private final UserPermissionRepository userPermissionRepository;
    private final Clock clock;

    @Override
    @Transactional(readOnly = true)
    public TrainingPointReportResponse getReport(
            Actor actor,
            UUID clubId,
            String academicTerm,
            String search,
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
        String resolvedClubName;
        if (clubId != null) {
            if (!crossUnitAccess && !permittedClubIds.contains(clubId)) {
                throw new ApiException(HttpStatus.FORBIDDEN, "PERMISSION_DENIED", "Permission denied");
            }
            Club targetClub = clubRepository.findById(clubId)
                    .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "CLUB_NOT_FOUND", "Club not found"));
            scopedClubIds = Set.of(clubId);
            resolvedClubName = targetClub.getName();
        } else if (crossUnitAccess) {
            scopedClubIds = null;
            resolvedClubName = isDoanVjuOfficer && !isGlobal
                    ? "Tất cả đơn vị (Đoàn TN VJU)"
                    : "Tất cả CLB / Đơn vị";
        } else {
            scopedClubIds = permittedClubIds;
            if (permittedClubIds.size() == 1) {
                UUID onlyId = permittedClubIds.iterator().next();
                resolvedClubName = clubRepository.findById(onlyId).map(Club::getName).orElse("CLB được phân quyền");
            } else {
                resolvedClubName = "Các CLB được phân quyền";
            }
        }

        String termFilter = AcademicTermUtil.normalizeAndValidate(academicTerm);
        String searchPattern = buildSearchPattern(search);

        StringBuilder sql = new StringBuilder("""
                SELECT u.id AS user_id,
                       u.full_name,
                       u.student_code,
                       u.email,
                       e.id AS event_id,
                       e.club_id,
                       c.code AS club_code,
                       c.name AS club_name,
                       e.title AS event_title,
                       e.academic_term,
                       e.start_time,
                       a.status AS attendance_status,
                       e.attendance_locked_at,
                       e.attendance_signature_sha256
                FROM event_attendances a
                JOIN events e ON e.id = a.event_id
                JOIN clubs c ON c.id = e.club_id
                JOIN users u ON u.id = a.user_id
                LEFT JOIN event_registrations r ON r.event_id = a.event_id AND r.user_id = a.user_id
                WHERE e.status NOT IN ('DRAFT', 'CANCELLED')
                  AND a.status IN ('PRESENT', 'LATE')
                  AND (r.id IS NULL OR r.status = 'REGISTERED')
                  AND u.anonymized_at IS NULL
                """);

        if (scopedClubIds != null) {
            sql.append(" AND e.club_id IN (:scopedClubIds)");
        }
        if (termFilter != null) {
            sql.append(" AND e.academic_term = :academicTerm");
        }
        if (from != null) {
            sql.append(" AND e.start_time >= :fromTime");
        }
        if (to != null) {
            sql.append(" AND e.start_time <= :toTime");
        }
        if (searchPattern != null) {
            sql.append(" AND (LOWER(u.full_name) LIKE :searchPattern ESCAPE '!'"
                    + " OR LOWER(u.email) LIKE :searchPattern ESCAPE '!'"
                    + " OR LOWER(COALESCE(u.student_code, '')) LIKE :searchPattern ESCAPE '!')");
        }
        sql.append(" ORDER BY u.student_code ASC NULLS LAST, u.full_name ASC, e.start_time DESC, e.id ASC");

        Query query = entityManager.createNativeQuery(sql.toString());
        if (scopedClubIds != null) {
            query.setParameter("scopedClubIds", scopedClubIds);
        }
        if (termFilter != null) {
            query.setParameter("academicTerm", termFilter);
        }
        if (from != null) {
            query.setParameter("fromTime", from);
        }
        if (to != null) {
            query.setParameter("toTime", to);
        }
        if (searchPattern != null) {
            query.setParameter("searchPattern", searchPattern);
        }

        @SuppressWarnings("unchecked")
        List<Object[]> rows = query.getResultList();

        Map<UUID, StudentAccumulator> accumulators = new LinkedHashMap<>();
        for (Object[] row : rows) {
            UUID userId = asUuid(row[0]);
            String fullName = asString(row[1]);
            String studentCode = asString(row[2]);
            String email = asString(row[3]);
            UUID eventId = asUuid(row[4]);
            UUID eventClubId = asUuid(row[5]);
            String clubCode = asString(row[6]);
            String clubName = asString(row[7]);
            String eventTitle = asString(row[8]);
            String eventTerm = asString(row[9]);
            OffsetDateTime startTime = asOffsetDateTime(row[10]);
            String attendanceStatus = asString(row[11]);
            OffsetDateTime lockedAt = asOffsetDateTime(row[12]);
            String signature = asString(row[13]);

            StudentAccumulator acc = accumulators.computeIfAbsent(
                    userId,
                    id -> new StudentAccumulator(id, fullName, studentCode, email)
            );
            acc.eventsById.putIfAbsent(
                    eventId,
                    new AttendedEventItem(
                            eventId,
                            eventClubId,
                            clubCode,
                            clubName,
                            eventTitle,
                            eventTerm,
                            startTime,
                            attendanceStatus,
                            lockedAt != null && signature != null && !signature.isBlank(),
                            lockedAt,
                            signature
                    )
            );
        }

        Map<UUID, List<String>> activeClubsByUser = fetchActiveClubs(accumulators.keySet());

        List<StudentTrainingPointItem> items = accumulators.values().stream()
                .map(acc -> {
                    List<AttendedEventItem> attendedEvents = List.copyOf(acc.eventsById.values());
                    List<String> titles = attendedEvents.stream().map(AttendedEventItem::title).toList();
                    List<String> activeClubs = activeClubsByUser.getOrDefault(acc.userId, List.of());
                    return new StudentTrainingPointItem(
                            acc.userId,
                            acc.fullName,
                            acc.studentCode,
                            acc.email,
                            activeClubs,
                            attendedEvents.size(),
                            titles,
                            attendedEvents
                    );
                })
                .sorted(Comparator
                        .comparingInt(StudentTrainingPointItem::presentEventCount).reversed()
                        .thenComparing(StudentTrainingPointItem::studentCode,
                                Comparator.nullsLast(String.CASE_INSENSITIVE_ORDER))
                        .thenComparing(StudentTrainingPointItem::fullName,
                                Comparator.nullsLast(String.CASE_INSENSITIVE_ORDER)))
                .toList();

        int totalPresentCheckIns = items.stream().mapToInt(StudentTrainingPointItem::presentEventCount).sum();

        return new TrainingPointReportResponse(
                OffsetDateTime.now(clock),
                clubId,
                resolvedClubName,
                termFilter,
                from,
                to,
                items.size(),
                totalPresentCheckIns,
                items
        );
    }

    private Map<UUID, List<String>> fetchActiveClubs(Set<UUID> userIds) {
        if (userIds.isEmpty()) {
            return Map.of();
        }
        Query query = entityManager.createNativeQuery("""
                SELECT m.user_id, c.name
                FROM memberships m
                JOIN clubs c ON c.id = m.club_id
                WHERE m.user_id IN (:userIds)
                  AND m.status = 'ACTIVE'
                  AND c.status = 'ACTIVE'
                ORDER BY c.name ASC
                """);
        query.setParameter("userIds", userIds);

        @SuppressWarnings("unchecked")
        List<Object[]> rows = query.getResultList();
        Map<UUID, List<String>> byUser = new HashMap<>();
        for (Object[] row : rows) {
            UUID userId = asUuid(row[0]);
            String clubName = asString(row[1]);
            if (clubName != null) {
                byUser.computeIfAbsent(userId, k -> new ArrayList<>()).add(clubName);
            }
        }
        return byUser;
    }

    private static String blankToNull(String value) {
        if (value == null) return null;
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }

    private static String buildSearchPattern(String search) {
        String trimmed = blankToNull(search);
        if (trimmed == null) return null;
        String escaped = trimmed.toLowerCase(Locale.ROOT)
                .replace("!", "!!")
                .replace("%", "!%")
                .replace("_", "!_");
        return "%" + escaped + "%";
    }

    private static UUID asUuid(Object val) {
        if (val == null) return null;
        return val instanceof UUID u ? u : UUID.fromString(val.toString());
    }

    private static String asString(Object val) {
        return val == null ? null : val.toString();
    }

    private static OffsetDateTime asOffsetDateTime(Object val) {
        if (val == null) return null;
        if (val instanceof OffsetDateTime odt) return odt;
        if (val instanceof Instant inst) return inst.atOffset(ZoneOffset.UTC);
        if (val instanceof Timestamp ts) return ts.toInstant().atOffset(ZoneOffset.UTC);
        if (val instanceof java.util.Date d) return d.toInstant().atOffset(ZoneOffset.UTC);
        return OffsetDateTime.parse(val.toString());
    }

    private static final class StudentAccumulator {
        final UUID userId;
        final String fullName;
        final String studentCode;
        final String email;
        final Map<UUID, AttendedEventItem> eventsById = new LinkedHashMap<>();

        StudentAccumulator(UUID userId, String fullName, String studentCode, String email) {
            this.userId = userId;
            this.fullName = fullName;
            this.studentCode = studentCode;
            this.email = email;
        }
    }
}
