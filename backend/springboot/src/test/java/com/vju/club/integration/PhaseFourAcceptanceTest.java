package com.vju.club.integration;

import com.fasterxml.jackson.databind.JsonNode;
import org.junit.jupiter.api.Test;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;

class PhaseFourAcceptanceTest extends ApiIntegrationTest {

    @Test
    void postCompletionAttendanceEditWindowReasonAuditAndOptimisticConcurrency() throws Exception {
        UUID basicOfficer = user("officer.basic@test.local");
        UUID seniorEditor = user("officer.editor@test.local");
        UUID ctv = user("ctv.attendance@test.local");
        String basicOfficerToken = token(basicOfficer);
        String seniorEditorToken = token(seniorEditor);
        String ctvToken = token(ctv);

        membership(member, clubA);
        membership(basicOfficer, clubA);
        membership(seniorEditor, clubA);
        grant(basicOfficer, "event.attendance", "CLUB", clubA, null);
        grant(seniorEditor, "event.attendance", "CLUB", clubA, null);
        grant(seniorEditor, "event.attendance_edit", "CLUB", clubA, null);

        OffsetDateTime start = OffsetDateTime.now().plusDays(1);
        OffsetDateTime end = start.plusHours(2);
        UUID eventId = id(call(post("/api/v1/clubs/" + clubA + "/events"), adminToken, Map.of(
                "title", "Hội thảo AI & Khoa học Dữ liệu",
                "eventType", "WORKSHOP",
                "startTime", start.toString(),
                "endTime", end.toString(),
                "registrationDeadline", start.minusHours(2).toString(),
                "allowCtv", true,
                "status", "OPEN_REGISTRATION"
        ), 201));

        call(post("/api/v1/events/" + eventId + "/registrations"), memberToken, Map.of(), 201);
        call(post("/api/v1/events/" + eventId + "/registrations"), ctvToken, Map.of(), 201);

        // Move event into active attendance window
        db.update("UPDATE events SET registration_deadline = now() - interval '3 hours', "
                + "start_time = now() - interval '2 hours', end_time = now() - interval '15 minutes' WHERE id = ?", eventId);

        // Initial attendance recording by basicOfficer (including EXCUSED support)
        JsonNode initial = call(put("/api/v1/events/" + eventId + "/attendances"), basicOfficerToken, Map.of(
                "items", List.of(
                        Map.of("userId", member.toString(), "status", "ABSENT"),
                        Map.of("userId", ctv.toString(), "status", "EXCUSED", "note", "Báo phép lịch thi")
                )
        ), 200);
        assertThat(initial.size()).isEqualTo(2);
        int memberInitialVersion = initial.get(0).path("userId").asText().equals(member.toString())
                ? initial.get(0).path("version").asInt()
                : initial.get(1).path("version").asInt();

        // Transition event to COMPLETED -> sets completedAt
        JsonNode completedEvent = call(patch("/api/v1/clubs/" + clubA + "/events/" + eventId), adminToken,
                Map.of("status", "COMPLETED"), 200);
        assertThat(completedEvent.path("status").asText()).isEqualTo("COMPLETED");
        assertThat(completedEvent.path("completedAt").asText()).isNotBlank();

        // Officer WITHOUT event.attendance_edit is blocked (403 PERMISSION_DENIED)
        problem(put("/api/v1/events/" + eventId + "/attendances"), basicOfficerToken, Map.of(
                "reason", "Muốn sửa sau sự kiện",
                "items", List.of(Map.of("userId", member.toString(), "status", "PRESENT"))
        ), 403, "PERMISSION_DENIED");

        // Officer WITH event.attendance_edit but missing reason is blocked (400 ATTENDANCE_EDIT_REASON_REQUIRED)
        problem(put("/api/v1/events/" + eventId + "/attendances"), seniorEditorToken, Map.of(
                "items", List.of(Map.of("userId", member.toString(), "status", "PRESENT"))
        ), 400, "ATTENDANCE_EDIT_REASON_REQUIRED");

        // Valid post-completion edit within window (PB-31)
        JsonNode edited = call(put("/api/v1/events/" + eventId + "/attendances"), seniorEditorToken, Map.of(
                "reason", "Đối chiếu lại danh sách ký tên giấy tại bàn lễ tân",
                "items", List.of(Map.of(
                        "userId", member.toString(),
                        "status", "PRESENT",
                        "expectedVersion", memberInitialVersion
                ))
        ), 200);
        JsonNode updatedMemberRow = edited.get(0).path("userId").asText().equals(member.toString())
                ? edited.get(0) : edited.get(1);
        assertThat(updatedMemberRow.path("status").asText()).isEqualTo("PRESENT");
        assertThat(updatedMemberRow.path("editReason").asText()).contains("ký tên giấy");
        assertThat(updatedMemberRow.path("version").asInt()).isGreaterThan(memberInitialVersion);

        // Audit log records EVENT_ATTENDANCE_UPDATED with before/after snapshot
        assertThat(count("SELECT count(*) FROM audit_logs WHERE action = 'EVENT_ATTENDANCE_UPDATED' AND resource_id = ?", eventId))
                .isEqualTo(1);

        // Stale expectedVersion triggers 409 ATTENDANCE_VERSION_CONFLICT
        problem(put("/api/v1/events/" + eventId + "/attendances"), seniorEditorToken, Map.of(
                "reason", "Ghi đè với version cũ",
                "items", List.of(Map.of(
                        "userId", member.toString(),
                        "status", "LATE",
                        "expectedVersion", memberInitialVersion
                ))
        ), 409, "ATTENDANCE_VERSION_CONFLICT");

        // Expire edit window (completed_at > 48h ago) -> 409 ATTENDANCE_EDIT_WINDOW_EXPIRED
        db.update("UPDATE events SET completed_at = now() - interval '49 hours' WHERE id = ?", eventId);
        problem(put("/api/v1/events/" + eventId + "/attendances"), seniorEditorToken, Map.of(
                "reason", "Sửa quá hạn 48 giờ",
                "items", List.of(Map.of("userId", member.toString(), "status", "LATE"))
        ), 409, "ATTENDANCE_EDIT_WINDOW_EXPIRED");
    }

    @Test
    void personalEventHistoryOwnerIsolationAndCountedAsAttendedRules() throws Exception {
        UUID ctv = user("ctv.history@test.local");
        String ctvToken = token(ctv);
        membership(member, clubA);

        OffsetDateTime start = OffsetDateTime.now().plusDays(1);
        UUID completedEventId = id(call(post("/api/v1/clubs/" + clubA + "/events"), adminToken, Map.of(
                "title", "Sự kiện hoàn thành hợp lệ",
                "eventType", "CLUB_EVENT",
                "startTime", start.toString(),
                "endTime", start.plusHours(2).toString(),
                "registrationDeadline", start.minusHours(2).toString(),
                "allowCtv", true,
                "status", "OPEN_REGISTRATION"
        ), 201));

        UUID cancelledEventId = id(call(post("/api/v1/clubs/" + clubA + "/events"), adminToken, Map.of(
                "title", "Sự kiện bị huỷ sau điểm danh",
                "eventType", "CLUB_EVENT",
                "startTime", start.plusDays(1).toString(),
                "endTime", start.plusDays(1).plusHours(2).toString(),
                "registrationDeadline", start.plusDays(1).minusHours(2).toString(),
                "allowCtv", true,
                "status", "OPEN_REGISTRATION"
        ), 201));

        JsonNode ctvReg = call(post("/api/v1/events/" + completedEventId + "/registrations"), ctvToken, Map.of(), 201);
        call(patch("/api/v1/events/" + completedEventId + "/registrations/" + id(ctvReg)), adminToken,
                Map.of("eventRole", "MC Chương trình"), 200);
        call(post("/api/v1/events/" + completedEventId + "/registrations"), memberToken, Map.of(), 201);
        call(post("/api/v1/events/" + cancelledEventId + "/registrations"), ctvToken, Map.of(), 201);

        db.update("UPDATE events SET registration_deadline = now() - interval '2 hours', "
                        + "start_time = now() - interval '1 hour', end_time = now() + interval '1 hour' WHERE id IN (?, ?)",
                completedEventId, cancelledEventId);

        call(put("/api/v1/events/" + completedEventId + "/attendances"), adminToken, Map.of(
                "items", List.of(
                        Map.of("userId", ctv.toString(), "status", "LATE"),
                        Map.of("userId", member.toString(), "status", "EXCUSED")
                )
        ), 200);
        call(patch("/api/v1/clubs/" + clubA + "/events/" + completedEventId), adminToken,
                Map.of("status", "COMPLETED"), 200);

        call(put("/api/v1/events/" + cancelledEventId + "/attendances"), adminToken, Map.of(
                "items", List.of(Map.of("userId", ctv.toString(), "status", "PRESENT"))
        ), 200);
        call(patch("/api/v1/clubs/" + clubA + "/events/" + cancelledEventId), adminToken,
                Map.of("status", "CANCELLED"), 200);

        // CTV personal history: LATE on COMPLETED -> countedAsAttended=true; PRESENT on CANCELLED -> countedAsAttended=false
        JsonNode ctvHistory = call(get("/api/v1/users/me/event-registrations").param("participantType", "CTV"),
                ctvToken, null, 200);
        assertThat(ctvHistory.path("total").asInt()).isEqualTo(2);
        for (JsonNode item : ctvHistory.path("items")) {
            if (item.path("eventId").asText().equals(completedEventId.toString())) {
                assertThat(item.path("eventRole").asText()).isEqualTo("MC Chương trình");
                assertThat(item.path("attendanceStatus").asText()).isEqualTo("LATE");
                assertThat(item.path("countedAsAttended").asBoolean()).isTrue();
            } else {
                assertThat(item.path("eventStatus").asText()).isEqualTo("CANCELLED");
                assertThat(item.path("countedAsAttended").asBoolean()).isFalse();
            }
        }

        // Member personal history: EXCUSED -> countedAsAttended=false, isolated from CTV's registrations
        JsonNode memberHistory = call(get("/api/v1/users/me/event-registrations"), memberToken, null, 200);
        assertThat(memberHistory.path("total").asInt()).isEqualTo(1);
        assertThat(memberHistory.path("items").get(0).path("attendanceStatus").asText()).isEqualTo("EXCUSED");
        assertThat(memberHistory.path("items").get(0).path("countedAsAttended").asBoolean()).isFalse();
    }

    @Test
    void eventAndTaskNotificationsIdempotencyAndAccessRevalidation() throws Exception {
        UUID ctv = user("ctv.notify@test.local");
        UUID cancelledUser = user("cancelled.notify@test.local");
        UUID subtaskMember = user("subtask.notify@test.local");
        String ctvToken = token(ctv);
        String cancelledToken = token(cancelledUser);

        membership(member, clubA);
        membership(subtaskMember, clubA);

        OffsetDateTime start = OffsetDateTime.now().plusDays(2);
        UUID eventId = id(call(post("/api/v1/clubs/" + clubA + "/events"), adminToken, Map.of(
                "title", "Đêm nhạc Acoustic VJU",
                "eventType", "CLUB_EVENT",
                "startTime", start.toString(),
                "endTime", start.plusHours(3).toString(),
                "registrationDeadline", start.minusHours(3).toString(),
                "allowCtv", true,
                "status", "OPEN_REGISTRATION"
        ), 201));

        call(post("/api/v1/events/" + eventId + "/registrations"), memberToken, Map.of(), 201);
        JsonNode ctvReg = call(post("/api/v1/events/" + eventId + "/registrations"), ctvToken, Map.of(), 201);
        call(post("/api/v1/events/" + eventId + "/registrations"), cancelledToken, Map.of(), 201);
        call(patch("/api/v1/events/" + eventId + "/registrations/me/cancel"), cancelledToken, null, 200);

        int beforeCancelledNotifs = count("SELECT count(*) FROM notifications WHERE user_id = ?", cancelledUser);

        // Notify event participants (Member + CTV = 2 recipients, skipping CANCELLED) with idempotencyKey (PB-33.3)
        JsonNode evNotify1 = call(post("/api/v1/events/" + eventId + "/notifications"), adminToken, Map.of(
                "title", "Tổng duyệt âm thanh 18h00",
                "message", "Mời các bạn có mặt đúng giờ tại hội trường",
                "idempotencyKey", "ev-rehearsal-1"
        ), 201);
        assertThat(evNotify1.path("recipientCount").asInt()).isEqualTo(2);

        int ctvNotifsAfterFirst = count("SELECT count(*) FROM notifications WHERE user_id = ?", ctv);
        call(post("/api/v1/events/" + eventId + "/notifications"), adminToken, Map.of(
                "title", "Tổng duyệt âm thanh 18h00",
                "message", "Mời các bạn có mặt đúng giờ tại hội trường",
                "idempotencyKey", "ev-rehearsal-1"
        ), 201);
        assertThat(count("SELECT count(*) FROM notifications WHERE user_id = ?", ctv)).isEqualTo(ctvNotifsAfterFirst);
        assertThat(count("SELECT count(*) FROM notifications WHERE user_id = ?", cancelledUser)).isEqualTo(beforeCancelledNotifs);

        // Task + subtask notification & access revalidation (PB-33.4)
        UUID parentTaskId = id(call(post("/api/v1/clubs/" + clubA + "/tasks"), adminToken, Map.of(
                "assigneeId", ctv.toString(),
                "eventId", eventId.toString(),
                "title", "Điều phối ánh sáng sân khấu",
                "deadline", start.plusHours(2).toString()
        ), 201));
        call(post("/api/v1/clubs/" + clubA + "/tasks"), adminToken, Map.of(
                "parentTaskId", parentTaskId.toString(),
                "assigneeId", subtaskMember.toString(),
                "eventId", eventId.toString(),
                "title", "Kiểm tra dây tín hiệu đèn",
                "deadline", start.plusHours(1).toString()
        ), 201);

        int beforeSubtaskNotifs = count("SELECT count(*) FROM notifications WHERE user_id = ?", subtaskMember);
        JsonNode taskNotify = call(post("/api/v1/tasks/" + parentTaskId + "/notifications"), adminToken, Map.of(
                "title", "Nhắc tiến độ ánh sáng",
                "message", "Cập nhật báo cáo trước 17h00",
                "includeSubtasks", true,
                "idempotencyKey", "task-remind-1"
        ), 201);
        assertThat(taskNotify.path("recipientCount").asInt()).isEqualTo(2);
        assertThat(count("SELECT count(*) FROM notifications WHERE user_id = ?", subtaskMember))
                .isEqualTo(beforeSubtaskNotifs + 1);

        // Retry with same idempotencyKey does not duplicate notifications
        call(post("/api/v1/tasks/" + parentTaskId + "/notifications"), adminToken, Map.of(
                "title", "Nhắc tiến độ ánh sáng",
                "message", "Cập nhật báo cáo trước 17h00",
                "includeSubtasks", true,
                "idempotencyKey", "task-remind-1"
        ), 201);
        assertThat(count("SELECT count(*) FROM notifications WHERE user_id = ?", subtaskMember))
                .isEqualTo(beforeSubtaskNotifs + 1);

        // When CTV registration is cancelled (returned task to assigner), CTV loses access to GET /tasks/{taskId}
        call(patch("/api/v1/events/" + eventId + "/registrations/" + id(ctvReg)), adminToken,
                Map.of("status", "CANCELLED"), 200);
        problem(get("/api/v1/tasks/" + parentTaskId), ctvToken, null, 403, "PERMISSION_DENIED");
    }

    @Test
    void systemAndClubStatisticsAccuracyAndAuthorization() throws Exception {
        UUID clubAManager = user("manager.cluba@test.local");
        UUID multiClubUser = user("multiclub@test.local");
        UUID lockedUser = user("locked.stats@test.local", "LOCKED");
        String clubAManagerToken = token(clubAManager);
        String multiToken = token(multiClubUser);

        membership(clubAManager, clubA);
        membership(multiClubUser, clubA);
        membership(multiClubUser, clubB);
        membership(member, clubA);
        grant(clubAManager, "club.view", "CLUB", clubA, null);

        // Non-admin blocked from system statistics; cross-club manager blocked from clubB statistics
        problem(get("/api/v1/statistics/system"), clubAManagerToken, null, 403, "PERMISSION_DENIED");
        problem(get("/api/v1/clubs/" + clubB + "/statistics"), clubAManagerToken, null, 403, "PERMISSION_DENIED");

        // Create 2 events in clubA; multiClubUser registers for BOTH -> uniqueParticipants=1, activeRegistrations=2
        OffsetDateTime start = OffsetDateTime.now().plusDays(1);
        UUID ev1 = id(call(post("/api/v1/clubs/" + clubA + "/events"), adminToken, Map.of(
                "title", "Sự kiện Thống kê 1",
                "eventType", "CLUB_EVENT",
                "startTime", start.toString(),
                "endTime", start.plusHours(2).toString(),
                "registrationDeadline", start.minusHours(2).toString(),
                "status", "OPEN_REGISTRATION"
        ), 201));
        UUID ev2 = id(call(post("/api/v1/clubs/" + clubA + "/events"), adminToken, Map.of(
                "title", "Sự kiện Thống kê 2",
                "eventType", "MEETING",
                "startTime", start.plusDays(1).toString(),
                "endTime", start.plusDays(1).plusHours(2).toString(),
                "registrationDeadline", start.plusDays(1).minusHours(2).toString(),
                "status", "OPEN_REGISTRATION"
        ), 201));

        call(post("/api/v1/events/" + ev1 + "/registrations"), multiToken, Map.of(), 201);
        call(post("/api/v1/events/" + ev2 + "/registrations"), multiToken, Map.of(), 201);
        call(post("/api/v1/events/" + ev1 + "/registrations"), memberToken, Map.of(), 201);
        call(patch("/api/v1/events/" + ev1 + "/registrations/me/cancel"), memberToken, null, 200);

        db.update("UPDATE events SET registration_deadline = now() - interval '2 hours', "
                + "start_time = now() - interval '1 hour', end_time = now() + interval '1 hour' WHERE id = ?", ev1);
        call(put("/api/v1/events/" + ev1 + "/attendances"), adminToken, Map.of(
                "items", List.of(Map.of("userId", multiClubUser.toString(), "status", "PRESENT"))
        ), 200);

        // System statistics check (PB-36.1) — multiClubUser counted ONCE, zero secrets leaked
        JsonNode sysStats = call(get("/api/v1/statistics/system"), adminToken, null, 200);
        assertThat(sysStats.toString()).doesNotContain("password").doesNotContain("Hash");
        assertThat(sysStats.path("totalUsers").asLong()).isEqualTo(5L); // admin, member, clubAManager, multiClubUser, lockedUser
        assertThat(sysStats.path("lockedUsers").asLong()).isEqualTo(1L);
        assertThat(sysStats.path("activeClubs").asLong()).isEqualTo(2L);
        assertThat(lockedUser).isNotNull();

        // Club statistics check (PB-36.2) — distinct uniqueParticipants vs activeRegistrations vs cancelledRegistrations vs attendedCount
        JsonNode clubStats = call(get("/api/v1/clubs/" + clubA + "/statistics"), clubAManagerToken, null, 200);
        assertThat(clubStats.path("activeMembers").asLong()).isEqualTo(3L);
        assertThat(clubStats.path("totalEvents").asLong()).isEqualTo(2L);
        assertThat(clubStats.path("uniqueParticipants").asLong()).isEqualTo(1L);
        assertThat(clubStats.path("activeRegistrations").asLong()).isEqualTo(2L);
        assertThat(clubStats.path("cancelledRegistrations").asLong()).isEqualTo(1L);
        assertThat(clubStats.path("attendedCount").asLong()).isEqualTo(1L);
    }

    @Test
    void userDeleteCleanPurgeVsAutomaticPiiAnonymizationPreservingHistory() throws Exception {
        // 1. Self-delete blocked (409 CANNOT_DELETE_SELF)
        problem(delete("/api/v1/users/" + admin), adminToken, null, 409, "CANNOT_DELETE_SELF");

        // 2. Unused account without history -> clean physical delete (USER_DELETED)
        UUID brandNewUser = user("unused.account@test.local");
        call(delete("/api/v1/users/" + brandNewUser), adminToken, null, 204);
        assertThat(count("SELECT count(*) FROM users WHERE id = ?", brandNewUser)).isZero();
        assertThat(count("SELECT count(*) FROM audit_logs WHERE action = 'USER_DELETED' AND resource_id = ?", brandNewUser))
                .isEqualTo(1);

        // 3. Account with club operational history -> automatic PII anonymization preserving 100% club history (PB-38)
        UUID veteran = user("veteran@test.local");
        db.update("UPDATE users SET student_code = '22119999', phone = '0988777666' WHERE id = ?", veteran);
        String veteranToken = token(veteran);
        membership(veteran, clubA);

        OffsetDateTime start = OffsetDateTime.now().plusDays(1);
        UUID eventId = id(call(post("/api/v1/clubs/" + clubA + "/events"), adminToken, Map.of(
                "title", "Sự kiện bảo toàn lịch sử",
                "eventType", "CLUB_EVENT",
                "startTime", start.toString(),
                "endTime", start.plusHours(2).toString(),
                "registrationDeadline", start.minusHours(2).toString(),
                "status", "OPEN_REGISTRATION"
        ), 201));
        call(post("/api/v1/events/" + eventId + "/registrations"), veteranToken, Map.of("note", "Tham gia"), 201);
        db.update("UPDATE events SET registration_deadline = now() - interval '2 hours', "
                + "start_time = now() - interval '1 hour', end_time = now() + interval '1 hour' WHERE id = ?", eventId);
        call(put("/api/v1/events/" + eventId + "/attendances"), adminToken, Map.of(
                "items", List.of(Map.of("userId", veteran.toString(), "status", "PRESENT"))
        ), 200);

        call(delete("/api/v1/users/" + veteran), adminToken, null, 204);

        // User row still exists for FK integrity, PII scrubbed, anonymized_at set, status INACTIVE
        assertThat(count("SELECT count(*) FROM users WHERE id = ? AND status = 'INACTIVE' AND anonymized_at IS NOT NULL "
                + "AND email LIKE 'deleted+%@anonymized.vju.local' AND student_code IS NULL AND phone IS NULL", veteran))
                .isEqualTo(1);

        // Historical event registration and attendance rows 100% preserved!
        assertThat(count("SELECT count(*) FROM event_registrations WHERE event_id = ? AND user_id = ?", eventId, veteran))
                .isEqualTo(1);
        assertThat(count("SELECT count(*) FROM event_attendances WHERE event_id = ? AND user_id = ?", eventId, veteran))
                .isEqualTo(1);
        assertThat(count("SELECT count(*) FROM audit_logs WHERE action = 'USER_ANONYMIZED' AND resource_id = ?", veteran))
                .isEqualTo(1);

        // Anonymized account cannot be reactivated (409 ACCOUNT_ANONYMIZED)
        problem(patch("/api/v1/users/" + veteran + "/status"), adminToken, Map.of("status", "ACTIVE"),
                409, "ACCOUNT_ANONYMIZED");
    }
}
