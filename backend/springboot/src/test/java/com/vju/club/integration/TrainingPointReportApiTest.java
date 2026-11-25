package com.vju.club.integration;

import com.fasterxml.jackson.databind.JsonNode;
import com.vju.club.common.ApiPaths;
import org.junit.jupiter.api.Test;

import java.sql.Timestamp;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;

class TrainingPointReportApiTest extends ApiIntegrationTest {
    private static final String REPORT_PATH = ApiPaths.API_V1 + ApiPaths.REPORTS_TRAINING_POINTS;
    private static final String TIMELINE_PATH = ApiPaths.API_V1 + ApiPaths.EVENTS_TIMELINE;

    @Test
    void requiresAuthenticationOnReportAndTimelineEndpoints() throws Exception {
        call(get(REPORT_PATH), null, null, 401);
        call(get(TIMELINE_PATH), null, null, 401);
    }

    @Test
    void rejectsPlainClubMemberTier4EvenWithClubAndEventViewPermissions() throws Exception {
        membership(member, clubA);
        UUID clubMemberRole = db.queryForObject("SELECT id FROM roles WHERE code = 'CLUB_MEMBER'", UUID.class);
        db.update(
                "INSERT INTO user_roles(user_id, role_id, scope, club_id, granted_by) VALUES (?, ?, 'CLUB', ?, ?)",
                member, clubMemberRole, clubA, admin
        );
        grant(member, "event.view", "CLUB", clubA, null);

        problem(get(REPORT_PATH), memberToken, null, 403, "PERMISSION_DENIED");
        problem(get(TIMELINE_PATH), memberToken, null, 403, "PERMISSION_DENIED");
    }

    @Test
    void enforcesTier3ScopingAndSupportsFilteringAndSha256Proofs() throws Exception {
        UUID officerA = user("officerA@vju.ac.vn");
        membership(officerA, clubA);
        grant(officerA, "event.attendance", "CLUB", clubA, null);
        String officerAToken = token(officerA);

        UUID student1 = createStudent("sv01@vju.ac.vn", "Nguyen Van An", "23010001");
        UUID student2 = createStudent("sv02@vju.ac.vn", "Tran Thi Binh", "23010002");
        membership(student1, clubA);
        membership(student1, clubB);
        membership(student2, clubA);

        OffsetDateTime t1 = OffsetDateTime.of(2026, 10, 10, 9, 0, 0, 0, ZoneOffset.UTC);
        OffsetDateTime t2 = OffsetDateTime.of(2026, 10, 20, 9, 0, 0, 0, ZoneOffset.UTC);
        OffsetDateTime t3 = OffsetDateTime.of(2026, 2, 15, 9, 0, 0, 0, ZoneOffset.UTC);

        String sig1 = "a".repeat(64);
        UUID evA1 = insertEvent(clubA, "Hội thảo AI", "COMPLETED", "2026-1", t1, t1.plusHours(2), t1, sig1);
        UUID evA2 = insertEvent(clubA, "Workshop Git", "OPEN_REGISTRATION", "2026-1", t2, t2.plusHours(2), null, null);
        UUID evA3Draft = insertEvent(clubA, "Sự kiện nháp", "DRAFT", "2026-1", t2, t2.plusHours(2), null, null);
        UUID evA4Cancelled = insertEvent(clubA, "Sự kiện huỷ", "CANCELLED", "2026-1", t2, t2.plusHours(2), null, null);
        UUID evB1 = insertEvent(clubB, "Ngày hội CLB B", "COMPLETED", "2025-2", t3, t3.plusHours(2), null, null);

        // student1: PRESENT at evA1 (locked), LATE at evA2, ABSENT at evA3Draft, CANCELLED reg at evA4Cancelled, PRESENT at evB1
        registerEvent(evA1, student1, "REGISTERED");
        markAttendance(evA1, student1, "PRESENT");
        registerEvent(evA2, student1, "REGISTERED");
        markAttendance(evA2, student1, "LATE");
        registerEvent(evA3Draft, student1, "REGISTERED");
        markAttendance(evA3Draft, student1, "PRESENT");
        registerEvent(evA4Cancelled, student1, "CANCELLED");
        markAttendance(evA4Cancelled, student1, "PRESENT");
        registerEvent(evB1, student1, "REGISTERED");
        markAttendance(evB1, student1, "PRESENT");

        // student2: ABSENT at evA1 (must NOT count), PRESENT at evA2 with CANCELLED registration (must NOT count)
        registerEvent(evA1, student2, "REGISTERED");
        markAttendance(evA1, student2, "ABSENT");
        registerEvent(evA2, student2, "CANCELLED");
        markAttendance(evA2, student2, "PRESENT");

        // Tier 3 officer requesting clubB -> 403
        problem(get(REPORT_PATH).param("clubId", clubB.toString()), officerAToken, null, 403, "PERMISSION_DENIED");
        problem(get(TIMELINE_PATH).param("clubId", clubB.toString()), officerAToken, null, 403, "PERMISSION_DENIED");

        // Tier 3 officer omitting clubId -> auto-scoped to clubA only (2 check-ins for student1, excludes student2)
        JsonNode reportA = call(get(REPORT_PATH), officerAToken, null, 200);
        assertThat(reportA.path("totalStudents").asInt()).isEqualTo(1);
        assertThat(reportA.path("totalPresentCheckIns").asInt()).isEqualTo(2);
        JsonNode item1 = reportA.path("items").get(0);
        assertThat(item1.path("studentCode").asText()).isEqualTo("23010001");
        assertThat(item1.path("presentEventCount").asInt()).isEqualTo(2);
        assertThat(item1.path("activeClubs")).hasSize(2);
        assertThat(item1.path("attendedEvents")).hasSize(2);
        assertThat(item1.path("attendedEvents").get(0).path("attendanceLocked").asBoolean()).isFalse();
        assertThat(item1.path("attendedEvents").get(1).path("attendanceLocked").asBoolean()).isTrue();
        assertThat(item1.path("attendedEvents").get(1).path("attendanceSignatureSha256").asText()).isEqualTo(sig1);

        // Search filter by studentCode & invalid range & unknown clubId
        JsonNode searchRes = call(get(REPORT_PATH).param("search", "23010001"), officerAToken, null, 200);
        assertThat(searchRes.path("totalStudents").asInt()).isEqualTo(1);
        JsonNode emptySearch = call(get(REPORT_PATH).param("search", "NO_MATCH"), officerAToken, null, 200);
        assertThat(emptySearch.path("totalStudents").asInt()).isEqualTo(0);

        problem(
                get(REPORT_PATH)
                        .param("from", t2.toString())
                        .param("to", t1.toString()),
                officerAToken,
                null,
                400,
                "INVALID_TIME_RANGE"
        );
        problem(get(REPORT_PATH).param("academicTerm", "2026-4"), officerAToken, null, 400, "INVALID_ACADEMIC_TERM");
        problem(get(TIMELINE_PATH).param("academicTerm", "BAD-TERM"), officerAToken, null, 400, "INVALID_ACADEMIC_TERM");
        problem(get(REPORT_PATH).param("clubId", UUID.randomUUID().toString()), adminToken, null, 404, "CLUB_NOT_FOUND");
    }

    @Test
    void allowsTier1AndTier2DoanVjuCrossUnitAccessAcrossReportAndTimeline() throws Exception {
        UUID doanVju = club("DOANVJU");
        UUID doanVjuOfficer = user("bch.doan@vju.ac.vn");
        membership(doanVjuOfficer, doanVju);
        grant(doanVjuOfficer, "event.attendance", "CLUB", doanVju, null);
        String doanVjuToken = token(doanVjuOfficer);

        UUID student = createStudent("sv03@vju.ac.vn", "Le Minh Chau", "23010003");
        membership(student, clubA);

        OffsetDateTime term1Start = OffsetDateTime.of(2026, 10, 5, 8, 0, 0, 0, ZoneOffset.UTC);
        OffsetDateTime term2Start = OffsetDateTime.of(2027, 2, 10, 8, 0, 0, 0, ZoneOffset.UTC);

        UUID evTerm1 = insertEvent(clubA, "Chào tân SV", "COMPLETED", "2026-1", term1Start, term1Start.plusHours(3), null, null);
        UUID evTerm2 = insertEvent(clubB, "Ngày hội văn hoá", "OPEN_REGISTRATION", "2026-2", term2Start, term2Start.plusHours(4), null, null);

        registerEvent(evTerm1, student, "REGISTERED");
        markAttendance(evTerm1, student, "PRESENT");
        registerEvent(evTerm2, student, "REGISTERED");
        markAttendance(evTerm2, student, "PRESENT");

        // Tier 2 DOANVJU officer sees cross-unit report & filters by academicTerm
        JsonNode crossReport = call(get(REPORT_PATH), doanVjuToken, null, 200);
        assertThat(crossReport.path("totalStudents").asInt()).isEqualTo(1);
        assertThat(crossReport.path("totalPresentCheckIns").asInt()).isEqualTo(2);

        JsonNode term1Report = call(get(REPORT_PATH).param("academicTerm", "2026-1"), adminToken, null, 200);
        assertThat(term1Report.path("totalPresentCheckIns").asInt()).isEqualTo(1);
        assertThat(term1Report.path("items").get(0).path("attendedEventTitles")).hasSize(1);
        assertThat(term1Report.path("items").get(0).path("attendedEventTitles").get(0).asText()).isEqualTo("Chào tân SV");

        // Timeline shows all units (DOANVJU first, then clubA, clubB) even if DOANVJU has 0 events
        JsonNode timeline = call(get(TIMELINE_PATH), doanVjuToken, null, 200);
        assertThat(timeline.path("totalUnits").asInt()).isEqualTo(3);
        assertThat(timeline.path("totalEvents").asInt()).isEqualTo(2);
        JsonNode units = timeline.path("units");
        assertThat(units.get(0).path("clubCode").asText()).isEqualTo("DOANVJU");
        assertThat(units.get(0).path("eventCount").asInt()).isEqualTo(0);

        List<String> unitCodes = List.of(
                units.get(0).path("clubCode").asText(),
                units.get(1).path("clubCode").asText(),
                units.get(2).path("clubCode").asText()
        );
        assertThat(unitCodes).containsExactly("DOANVJU", "A", "B");

        // Term filter on timeline keeps all 3 active units, filtering events to 2026-2
        JsonNode term2Timeline = call(get(TIMELINE_PATH).param("academicTerm", "2026-2"), adminToken, null, 200);
        assertThat(term2Timeline.path("totalUnits").asInt()).isEqualTo(3);
        assertThat(term2Timeline.path("totalEvents").asInt()).isEqualTo(1);
    }

    private UUID createStudent(String email, String fullName, String studentCode) {
        UUID id = UUID.randomUUID();
        db.update(
                "INSERT INTO users(id, email, password_hash, full_name, student_code, status) VALUES (?, ?, ?, ?, ?, 'ACTIVE')",
                id, email, passwords.encode(PASSWORD), fullName, studentCode
        );
        return id;
    }

    private UUID insertEvent(
            UUID clubId,
            String title,
            String status,
            String academicTerm,
            OffsetDateTime startTime,
            OffsetDateTime endTime,
            OffsetDateTime lockedAt,
            String sha256
    ) {
        UUID id = UUID.randomUUID();
        db.update(
                "INSERT INTO events(id, club_id, title, event_type, location, start_time, end_time, registration_deadline, status, academic_term, attendance_locked_at, attendance_locked_by, attendance_signature_sha256) "
                        + "VALUES (?, ?, ?, 'CLUB_EVENT', 'Hội trường VJU', ?, ?, ?, ?, ?, ?, ?, ?)",
                id,
                clubId,
                title,
                Timestamp.from(startTime.toInstant()),
                Timestamp.from(endTime.toInstant()),
                Timestamp.from(startTime.minusHours(1).toInstant()),
                status,
                academicTerm,
                lockedAt != null ? Timestamp.from(lockedAt.toInstant()) : null,
                lockedAt != null ? admin : null,
                sha256
        );
        return id;
    }

    private void registerEvent(UUID eventId, UUID userId, String status) {
        db.update(
                "INSERT INTO event_registrations(id, event_id, user_id, participant_type, status, cancelled_at) VALUES (?, ?, ?, 'MEMBER', ?, ?)",
                UUID.randomUUID(),
                eventId,
                userId,
                status,
                "CANCELLED".equals(status) ? Timestamp.from(OffsetDateTime.now(ZoneOffset.UTC).toInstant()) : null
        );
    }

    private void markAttendance(UUID eventId, UUID userId, String status) {
        db.update(
                "INSERT INTO event_attendances(id, event_id, user_id, status, checked_by) VALUES (?, ?, ?, ?, ?)",
                UUID.randomUUID(), eventId, userId, status, admin
        );
    }
}
