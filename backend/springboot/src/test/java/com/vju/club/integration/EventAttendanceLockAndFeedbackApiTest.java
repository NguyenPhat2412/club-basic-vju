package com.vju.club.integration;

import com.fasterxml.jackson.databind.JsonNode;
import com.vju.club.service.impl.UserAccountPurgeSupport;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Instant;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;
import java.util.Comparator;
import java.util.HexFormat;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;

class EventAttendanceLockAndFeedbackApiTest extends ApiIntegrationTest {
    @Autowired
    UserAccountPurgeSupport purgeSupport;

    @Test
    void attendanceSha256LockPreventsMutationAndEnforcesOptionalTwoFactor() throws Exception {
        UUID student1 = user("sv1@st.vju.ac.vn");
        UUID student2 = user("sv2@st.vju.ac.vn");
        db.update("UPDATE users SET student_code = ? WHERE id = ?", "24010001", student1);
        db.update("UPDATE users SET student_code = ? WHERE id = ?", "24010002", student2);
        String student1Token = token(student1);
        String student2Token = token(student2);

        OffsetDateTime start = OffsetDateTime.now().plusMinutes(30);
        OffsetDateTime end = start.plusHours(2);
        OffsetDateTime deadline = start.minusMinutes(5);

        JsonNode event = call(post("/api/v1/clubs/" + clubA + "/events"), adminToken, Map.of(
                "title", "Hội thảo An toàn Thông tin VJU",
                "eventType", "WORKSHOP",
                "location", "Phòng 305 Mỹ Đình",
                "startTime", start.toString(),
                "endTime", end.toString(),
                "registrationDeadline", deadline.toString(),
                "allowCtv", true,
                "status", "OPEN_REGISTRATION"
        ), 201);
        UUID eventId = id(event);

        call(post("/api/v1/events/" + eventId + "/registrations"), student1Token, Map.of(), 201);
        call(post("/api/v1/events/" + eventId + "/registrations"), student2Token, Map.of(), 201);

        // Mint QR token before locking so we can verify check-in rejects after lock
        JsonNode qr = call(post("/api/v1/events/" + eventId + "/attendances/qr-token"), adminToken, null, 201);
        String qrToken = qr.path("token").asText();

        call(put("/api/v1/events/" + eventId + "/attendances"), adminToken, Map.of(
                "items", List.of(
                        Map.of("userId", student1.toString(), "status", "PRESENT"),
                        Map.of("userId", student2.toString(), "status", "LATE")
                )
        ), 200);

        // Unprivileged student cannot lock attendance
        problem(post("/api/v1/events/" + eventId + "/attendances/lock"), student1Token, Map.of(), 403, "PERMISSION_DENIED");

        // Admin without 2FA enabled locks cleanly without OTP
        JsonNode locked = call(post("/api/v1/events/" + eventId + "/attendances/lock"), adminToken, Map.of(), 200);
        assertThat(locked.path("attendanceLockedAt").asText()).isNotBlank();
        assertThat(locked.path("attendanceLockedBy").asText()).isEqualTo(admin.toString());
        String actualHash = locked.path("attendanceSignatureSha256").asText();
        assertThat(actualHash).matches("^[a-f0-9]{64}$");

        // Verify deterministic SHA-256 matches canonical sorted DB records
        String expectedHash = computeExpectedSha256(eventId);
        assertThat(actualHash).isEqualTo(expectedHash);

        // Re-lock, manual edit, QR token mint, and QR check-in all return 409 ATTENDANCE_LOCKED
        problem(post("/api/v1/events/" + eventId + "/attendances/lock"), adminToken, Map.of(), 409, "ATTENDANCE_LOCKED");
        problem(put("/api/v1/events/" + eventId + "/attendances"), adminToken, Map.of(
                "items", List.of(Map.of("userId", student1.toString(), "status", "ABSENT")),
                "reason", "Cố gắng sửa sau khi chốt"
        ), 409, "ATTENDANCE_LOCKED");
        problem(post("/api/v1/events/" + eventId + "/attendances/qr-token"), adminToken, null, 409, "ATTENDANCE_LOCKED");
        problem(post("/api/v1/events/" + eventId + "/attendances/qr-check-in"), student1Token,
                Map.of("token", qrToken), 409, "ATTENDANCE_LOCKED");

        // Post-lock registration cancellation/mutation and event cancel/term/time mutation return 409 ATTENDANCE_LOCKED
        UUID student1RegId = db.queryForObject(
                "SELECT id FROM event_registrations WHERE event_id = ? AND user_id = ? AND status = 'REGISTERED'",
                UUID.class, eventId, student1);
        problem(patch("/api/v1/events/" + eventId + "/registrations/" + student1RegId), adminToken,
                Map.of("status", "CANCELLED"), 409, "ATTENDANCE_LOCKED");
        problem(patch("/api/v1/events/" + eventId + "/registrations/me/cancel"), student1Token,
                null, 409, "ATTENDANCE_LOCKED");
        problem(patch("/api/v1/clubs/" + clubA + "/events/" + eventId), adminToken,
                Map.of("status", "CANCELLED"), 409, "ATTENDANCE_LOCKED");
        problem(patch("/api/v1/clubs/" + clubA + "/events/" + eventId), adminToken,
                Map.of("academicTerm", "2028-3"), 409, "ATTENDANCE_LOCKED");
        problem(patch("/api/v1/clubs/" + clubA + "/events/" + eventId), adminToken,
                Map.of("startTime", start.plusMinutes(15).toString()), 409, "ATTENDANCE_LOCKED");
        // Completing or updating non-DRL metadata on a locked event still succeeds
        call(patch("/api/v1/clubs/" + clubA + "/events/" + eventId), adminToken,
                Map.of("location", "Hội trường lớn VJU", "status", "COMPLETED"), 200);

        // Second event: enable 2FA for admin and verify OTP challenge enforcement
        JsonNode event2 = call(post("/api/v1/clubs/" + clubA + "/events"), adminToken, Map.of(
                "title", "Sự kiện kiểm tra OTP 2FA",
                "eventType", "CLUB_EVENT",
                "startTime", start.toString(),
                "endTime", end.toString(),
                "registrationDeadline", deadline.toString(),
                "allowCtv", true,
                "status", "OPEN_REGISTRATION"
        ), 201);
        UUID event2Id = id(event2);
        db.update("UPDATE users SET two_factor_enabled = TRUE WHERE id = ?", admin);

        problem(post("/api/v1/events/" + event2Id + "/attendances/lock"), adminToken, Map.of(), 403, "TWO_FACTOR_REQUIRED");

        db.update("""
                INSERT INTO security_otps (id, user_id, purpose, action_context, otp_hash, expires_at, attempts, max_attempts)
                VALUES (?, ?, 'CRITICAL_ACTION', ?, ?, now() + interval '5 minutes', 0, 5)
                """, UUID.randomUUID(), admin, "EVENT_ATTENDANCE_LOCK:" + event2Id, passwords.encode("654321"));

        problem(post("/api/v1/events/" + event2Id + "/attendances/lock"), adminToken,
                Map.of("otpCode", "000000"), 400, "OTP_INVALID");

        JsonNode locked2 = call(post("/api/v1/events/" + event2Id + "/attendances/lock"), adminToken,
                Map.of("otpCode", "654321"), 200);
        assertThat(locked2.path("attendanceSignatureSha256").asText()).matches("^[a-f0-9]{64}$");
    }

    @Test
    void eventFeedbackRestrictsToPresentOrLateAndComputesSummary() throws Exception {
        UUID presentUser = user("present@st.vju.ac.vn");
        UUID lateUser = user("late@st.vju.ac.vn");
        UUID absentUser = user("absent@st.vju.ac.vn");
        UUID excusedUser = user("excused@st.vju.ac.vn");
        UUID outsider = user("outsider-fb@st.vju.ac.vn");
        String presentToken = token(presentUser);
        String lateToken = token(lateUser);
        String absentToken = token(absentUser);
        String excusedToken = token(excusedUser);
        String outsiderToken = token(outsider);

        OffsetDateTime start = OffsetDateTime.now().plusMinutes(30);
        OffsetDateTime end = start.plusHours(2);
        OffsetDateTime deadline = start.minusMinutes(5);

        JsonNode event = call(post("/api/v1/clubs/" + clubA + "/events"), adminToken, Map.of(
                "title", "Ngày hội Giao lưu Văn hoá Việt Nhật",
                "eventType", "CLUB_EVENT",
                "startTime", start.toString(),
                "endTime", end.toString(),
                "registrationDeadline", deadline.toString(),
                "allowCtv", true,
                "status", "OPEN_REGISTRATION"
        ), 201);
        UUID eventId = id(event);

        for (String tk : List.of(presentToken, lateToken, absentToken, excusedToken)) {
            call(post("/api/v1/events/" + eventId + "/registrations"), tk, Map.of(), 201);
        }
        call(put("/api/v1/events/" + eventId + "/attendances"), adminToken, Map.of(
                "items", List.of(
                        Map.of("userId", presentUser.toString(), "status", "PRESENT"),
                        Map.of("userId", lateUser.toString(), "status", "LATE"),
                        Map.of("userId", absentUser.toString(), "status", "ABSENT"),
                        Map.of("userId", excusedUser.toString(), "status", "EXCUSED")
                )
        ), 200);

        // Outsider, ABSENT, and EXCUSED cannot submit feedback
        problem(post("/api/v1/events/" + eventId + "/feedbacks"), outsiderToken,
                Map.of("rating", 5, "comment", "Chưa tham gia"), 403, "FEEDBACK_ATTENDANCE_REQUIRED");
        problem(post("/api/v1/events/" + eventId + "/feedbacks"), absentToken,
                Map.of("rating", 4, "comment", "Vắng mặt"), 403, "FEEDBACK_ATTENDANCE_REQUIRED");
        problem(post("/api/v1/events/" + eventId + "/feedbacks"), excusedToken,
                Map.of("rating", 4, "comment", "Vắng có phép"), 403, "FEEDBACK_ATTENDANCE_REQUIRED");

        // Invalid rating rejected with 400 VALIDATION_ERROR
        problem(post("/api/v1/events/" + eventId + "/feedbacks"), presentToken,
                Map.of("rating", 6, "comment", "Quá 5 sao"), 400, "VALIDATION_ERROR");
        problem(post("/api/v1/events/" + eventId + "/feedbacks"), presentToken,
                Map.of("rating", 0, "comment", "Dưới 1 sao"), 400, "VALIDATION_ERROR");

        // PRESENT and LATE succeed
        JsonNode fb1 = call(post("/api/v1/events/" + eventId + "/feedbacks"), presentToken,
                Map.of("rating", 5, "comment", "  Tổ chức rất chu đáo!  "), 201);
        assertThat(fb1.path("rating").asInt()).isEqualTo(5);
        assertThat(fb1.path("comment").asText()).isEqualTo("Tổ chức rất chu đáo!");

        JsonNode fb2 = call(post("/api/v1/events/" + eventId + "/feedbacks"), lateToken,
                Map.of("rating", 4, "comment", "Nội dung hay"), 201);
        assertThat(fb2.path("rating").asInt()).isEqualTo(4);

        // Duplicate rejected with 409 EVENT_FEEDBACK_ALREADY_SUBMITTED
        problem(post("/api/v1/events/" + eventId + "/feedbacks"), presentToken,
                Map.of("rating", 3, "comment", "Gửi lại"), 409, "EVENT_FEEDBACK_ALREADY_SUBMITTED");

        // Summary returns accurate count, average, and items
        JsonNode summary = call(get("/api/v1/events/" + eventId + "/feedbacks"), adminToken, null, 200);
        assertThat(summary.path("eventId").asText()).isEqualTo(eventId.toString());
        assertThat(summary.path("totalCount").asLong()).isEqualTo(2L);
        assertThat(summary.path("averageRating").asDouble()).isEqualTo(4.5);
        assertThat(summary.path("items").size()).isEqualTo(2);
    }

    @Test
    void feedbackRejectsCancelledRegistrationEvenWithPresentAttendanceAndAllowsMeetingMember() throws Exception {
        UUID cancelledPresentUser = user("cancelled-present@st.vju.ac.vn");
        UUID meetingMember = user("meeting-member@st.vju.ac.vn");
        membership(meetingMember, clubA);
        String cancelledPresentToken = token(cancelledPresentUser);
        String meetingMemberToken = token(meetingMember);

        OffsetDateTime start = OffsetDateTime.now().plusMinutes(30);
        OffsetDateTime end = start.plusHours(2);
        OffsetDateTime deadline = start.minusMinutes(5);

        JsonNode workshop = call(post("/api/v1/clubs/" + clubA + "/events"), adminToken, Map.of(
                "title", "Sự kiện kiểm tra huỷ ĐK sau điểm danh",
                "eventType", "WORKSHOP",
                "startTime", start.toString(),
                "endTime", end.toString(),
                "registrationDeadline", deadline.toString(),
                "allowCtv", true,
                "status", "OPEN_REGISTRATION"
        ), 201);
        UUID workshopId = id(workshop);
        JsonNode reg = call(post("/api/v1/events/" + workshopId + "/registrations"), cancelledPresentToken, Map.of(), 201);
        call(put("/api/v1/events/" + workshopId + "/attendances"), adminToken, Map.of(
                "items", List.of(Map.of("userId", cancelledPresentUser.toString(), "status", "PRESENT"))
        ), 200);
        call(patch("/api/v1/events/" + workshopId + "/registrations/" + id(reg)), adminToken,
                Map.of("status", "CANCELLED"), 200);

        problem(post("/api/v1/events/" + workshopId + "/feedbacks"), cancelledPresentToken,
                Map.of("rating", 5, "comment", "Đã huỷ ĐK"), 403, "FEEDBACK_ATTENDANCE_REQUIRED");
        JsonNode workshopSummary = call(get("/api/v1/events/" + workshopId + "/feedbacks"), cancelledPresentToken, null, 200);
        assertThat(workshopSummary.path("canSubmit").asBoolean()).isFalse();

        // Active club member attending a MEETING event without pre-registration can inspect canSubmit=true and submit feedback
        JsonNode meeting = call(post("/api/v1/clubs/" + clubA + "/events"), adminToken, Map.of(
                "title", "Sinh hoạt định kỳ CLB",
                "eventType", "MEETING",
                "startTime", start.toString(),
                "endTime", end.toString(),
                "registrationDeadline", deadline.toString(),
                "allowCtv", false,
                "status", "OPEN_REGISTRATION"
        ), 201);
        UUID meetingId = id(meeting);
        call(put("/api/v1/events/" + meetingId + "/attendances"), adminToken, Map.of(
                "items", List.of(Map.of("userId", meetingMember.toString(), "status", "PRESENT"))
        ), 200);
        JsonNode meetingSummary = call(get("/api/v1/events/" + meetingId + "/feedbacks"), meetingMemberToken, null, 200);
        assertThat(meetingSummary.path("canSubmit").asBoolean()).isTrue();
        JsonNode meetingFb = call(post("/api/v1/events/" + meetingId + "/feedbacks"), meetingMemberToken,
                Map.of("rating", 5, "comment", "Buổi sinh hoạt rất bổ ích"), 201);
        assertThat(meetingFb.path("rating").asInt()).isEqualTo(5);
    }

    @Test
    void academicTermAutoDerivesAcrossAllThreeTermsAndValidatesFormat() throws Exception {
        int nextYear = OffsetDateTime.now().getYear() + 1;

        OffsetDateTime sepStart = OffsetDateTime.parse(nextYear + "-10-15T09:00:00+07:00");
        JsonNode term1 = call(post("/api/v1/clubs/" + clubA + "/events"), adminToken, Map.of(
                "title", "Sự kiện Học kỳ 1",
                "startTime", sepStart.toString(),
                "endTime", sepStart.plusHours(2).toString(),
                "registrationDeadline", sepStart.minusHours(2).toString()
        ), 201);
        assertThat(term1.path("academicTerm").asText()).isEqualTo(nextYear + "-1");

        OffsetDateTime marStart = OffsetDateTime.parse((nextYear + 1) + "-03-10T09:00:00+07:00");
        JsonNode term2 = call(post("/api/v1/clubs/" + clubA + "/events"), adminToken, Map.of(
                "title", "Sự kiện Học kỳ 2",
                "startTime", marStart.toString(),
                "endTime", marStart.plusHours(2).toString(),
                "registrationDeadline", marStart.minusHours(2).toString()
        ), 201);
        assertThat(term2.path("academicTerm").asText()).isEqualTo(nextYear + "-2");

        OffsetDateTime julStart = OffsetDateTime.parse((nextYear + 1) + "-07-20T09:00:00+07:00");
        JsonNode term3 = call(post("/api/v1/clubs/" + clubA + "/events"), adminToken, Map.of(
                "title", "Sự kiện Học kỳ hè",
                "startTime", julStart.toString(),
                "endTime", julStart.plusHours(2).toString(),
                "registrationDeadline", julStart.minusHours(2).toString()
        ), 201);
        assertThat(term3.path("academicTerm").asText()).isEqualTo(nextYear + "-3");

        // Invalid term rejected with 400 INVALID_ACADEMIC_TERM
        problem(post("/api/v1/clubs/" + clubA + "/events"), adminToken, Map.of(
                "title", "Sự kiện sai học kỳ",
                "startTime", sepStart.toString(),
                "endTime", sepStart.plusHours(2).toString(),
                "registrationDeadline", sepStart.minusHours(2).toString(),
                "academicTerm", nextYear + "-4"
        ), 400, "INVALID_ACADEMIC_TERM");

        // Explicit valid override on PATCH works
        UUID term1Id = id(term1);
        JsonNode patched = call(patch("/api/v1/clubs/" + clubA + "/events/" + term1Id), adminToken,
                Map.of("academicTerm", nextYear + "-2"), 200);
        assertThat(patched.path("academicTerm").asText()).isEqualTo(nextYear + "-2");
    }

    @Test
    void myCalendarReturnsOnlyRegisteredEventsAndExcludesUnregisteredClubEvents() throws Exception {
        membership(member, clubA);

        OffsetDateTime start1 = OffsetDateTime.now().plusDays(2);
        OffsetDateTime start2 = OffsetDateTime.now().plusDays(3);

        JsonNode registeredEvent = call(post("/api/v1/clubs/" + clubA + "/events"), adminToken, Map.of(
                "title", "Sự kiện đã đăng ký",
                "startTime", start1.toString(),
                "endTime", start1.plusHours(2).toString(),
                "registrationDeadline", start1.minusHours(2).toString(),
                "status", "OPEN_REGISTRATION"
        ), 201);
        JsonNode unregisteredEvent = call(post("/api/v1/clubs/" + clubA + "/events"), adminToken, Map.of(
                "title", "Sự kiện CLB chưa đăng ký",
                "startTime", start2.toString(),
                "endTime", start2.plusHours(2).toString(),
                "registrationDeadline", start2.minusHours(2).toString(),
                "status", "OPEN_REGISTRATION"
        ), 201);

        // Before registering, active club member sees 0 events on /users/me/calendar
        JsonNode emptyCal = call(get("/api/v1/users/me/calendar"), memberToken, null, 200);
        assertThat(emptyCal.size()).isZero();

        // Register for only one event
        UUID registeredId = id(registeredEvent);
        UUID unregisteredId = id(unregisteredEvent);
        call(post("/api/v1/events/" + registeredId + "/registrations"), memberToken, Map.of(), 201);

        JsonNode cal = call(get("/api/v1/users/me/calendar"), memberToken, null, 200);
        assertThat(cal.size()).isEqualTo(1);
        assertThat(cal.get(0).path("id").asText()).isEqualTo(registeredId.toString());
        assertThat(cal.toString()).doesNotContain(unregisteredId.toString());
    }

    @Test
    void userAccountPurgeAnonymizesCleanlyWhenLockingAttendanceOrSubmittingFeedback() throws Exception {
        UUID lockerUser = user("locker-purge@st.vju.ac.vn");
        UUID feedbackUser = user("feedback-purge@st.vju.ac.vn");
        String lockerToken = token(lockerUser);
        String feedbackToken = token(feedbackUser);
        grant(lockerUser, "event.attendance_edit", "CLUB", clubA, null);

        OffsetDateTime start = OffsetDateTime.now().plusMinutes(30);
        OffsetDateTime end = start.plusHours(2);
        OffsetDateTime deadline = start.minusMinutes(5);

        JsonNode event = call(post("/api/v1/clubs/" + clubA + "/events"), adminToken, Map.of(
                "title", "Sự kiện kiểm tra Purge Guard",
                "startTime", start.toString(),
                "endTime", end.toString(),
                "registrationDeadline", deadline.toString(),
                "allowCtv", true,
                "status", "OPEN_REGISTRATION"
        ), 201);
        UUID eventId = id(event);

        call(post("/api/v1/events/" + eventId + "/registrations"), feedbackToken, Map.of(), 201);
        call(put("/api/v1/events/" + eventId + "/attendances"), adminToken, Map.of(
                "items", List.of(Map.of("userId", feedbackUser.toString(), "status", "PRESENT"))
        ), 200);
        call(post("/api/v1/events/" + eventId + "/feedbacks"), feedbackToken,
                Map.of("rating", 5, "comment", "Tuyệt vời"), 201);
        call(post("/api/v1/events/" + eventId + "/attendances/lock"), lockerToken, Map.of(), 200);

        // Directly verify UserAccountPurgeSupport detects isolated attendance_locked_by and event_feedbacks references
        UUID isolatedLocker = user("isolated-locker@st.vju.ac.vn");
        UUID isolatedEventId = UUID.randomUUID();
        db.update("""
                INSERT INTO events (id, club_id, title, event_type, start_time, end_time, registration_deadline,
                    status, attendance_locked_at, attendance_locked_by, attendance_signature_sha256)
                VALUES (?, ?, 'Isolated Locked Event', 'CLUB_EVENT', now(), now() + interval '1 hour', now(),
                    'COMPLETED', now(), ?, repeat('a', 64))
                """, isolatedEventId, clubA, isolatedLocker);
        assertThat(purgeSupport.hasOperationalOrAuditHistory(isolatedLocker)).isTrue();

        UUID isolatedFeedbackUser = user("isolated-feedback@st.vju.ac.vn");
        db.update("""
                INSERT INTO event_feedbacks (id, event_id, user_id, rating, comment)
                VALUES (?, ?, ?, 4, 'Good')
                """, UUID.randomUUID(), isolatedEventId, isolatedFeedbackUser);
        assertThat(purgeSupport.hasOperationalOrAuditHistory(isolatedFeedbackUser)).isTrue();

        // Deleting via API anonymizes cleanly instead of hitting ON DELETE RESTRICT violation
        call(delete("/api/v1/users/" + lockerUser), adminToken, null, 204);
        call(delete("/api/v1/users/" + feedbackUser), adminToken, null, 204);
        assertThat(count("SELECT count(*) FROM users WHERE id = ? AND anonymized_at IS NOT NULL AND status = 'INACTIVE'",
                lockerUser)).isEqualTo(1);
        assertThat(count("SELECT count(*) FROM users WHERE id = ? AND anonymized_at IS NOT NULL AND status = 'INACTIVE'",
                feedbackUser)).isEqualTo(1);
        assertThat(count("SELECT count(*) FROM event_feedbacks WHERE user_id = ?", feedbackUser)).isEqualTo(1);
        assertThat(count("SELECT count(*) FROM events WHERE id = ? AND attendance_locked_by = ?", eventId, lockerUser))
                .isEqualTo(1);
    }

    private String computeExpectedSha256(UUID eventId) throws Exception {
        record Row(UUID userId, String studentCode, String status, Instant checkedAt) {}
        List<Row> rows = db.query("""
                SELECT ea.user_id, u.student_code, ea.status, ea.checked_at
                FROM event_attendances ea
                JOIN users u ON u.id = ea.user_id
                WHERE ea.event_id = ?
                """,
                (rs, idx) -> new Row(
                        UUID.fromString(rs.getString("user_id")),
                        rs.getString("student_code"),
                        rs.getString("status"),
                        rs.getObject("checked_at", OffsetDateTime.class).toInstant()
                ),
                eventId);
        rows.sort(Comparator.comparing(r -> r.userId().toString()));
        StringBuilder sb = new StringBuilder();
        sb.append(eventId).append('\n');
        for (Row r : rows) {
            sb.append(r.userId()).append('|')
                    .append(r.studentCode() == null ? "" : r.studentCode().strip()).append('|')
                    .append(r.status()).append('|')
                    .append(DateTimeFormatter.ISO_INSTANT.format(r.checkedAt())).append('\n');
        }
        byte[] digest = MessageDigest.getInstance("SHA-256").digest(sb.toString().getBytes(StandardCharsets.UTF_8));
        return HexFormat.of().formatHex(digest);
    }
}
