package com.vju.club.integration;

import com.fasterxml.jackson.databind.JsonNode;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.time.OffsetDateTime;
import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;

/**
 * Sprint 3 - Part 1/2 Acceptance Tests
 * Phụ trách: Đoàn Kinh Quốc (Backend Dev, Database)
 *
 * Kiểm thử toàn diện các User Story & Acceptance Criteria:
 * - PB-44: Database migration, schema constraints & event participant indexes (DoD-P3-02)
 * - PB-21.1: Khởi tạo sự kiện với thời gian, địa điểm, phân loại đối tượng tham gia (DoD-P3-04)
 * - PB-21.2: Cập nhật thông tin sự kiện & ràng buộc nghiệp vụ (DoD-P3-04)
 * - PB-21.3: Hủy sự kiện không thể tiếp tục tổ chức, ngăn đăng ký mới (DoD-P3-04)
 * - PB-21.5: Khám phá sự kiện công khai và danh sách sự kiện CLB (DoD-P3-04)
 * - PB-22.1, PB-22.2: Quản lý vòng đời mở/đóng nhận đăng ký sự kiện & hạn cuối (DoD-P3-05)
 * - PB-23.1, PB-23.2: Thành viên CLB đăng ký tham gia sự kiện và hủy đăng ký trước hạn (DoD-P3-05)
 * - PB-24.1, PB-24.2: Sinh viên ngoài CLB đăng ký CTV sự kiện và cách ly quyền bảo mật (DoD-P3-06)
 * - PB-25.1, PB-25.2: Xem danh sách người đăng ký và cập nhật vai trò sự kiện (DoD-P3-07)
 */
class SprintThreeEventAcceptanceTest extends ApiIntegrationTest {

    private String clubEvents(UUID clubId) {
        return "/api/v1/clubs/" + clubId + "/events";
    }

    private String eventRegistrations(UUID eventId) {
        return "/api/v1/events/" + eventId + "/registrations";
    }

    @Test
    @DisplayName("PB-21.1, PB-21.2, PB-21.3, PB-21.5 (DoD-P3-04): Event creation, validation, update, cancellation and discovery")
    void testEventCreationLifecycleAndValidation() throws Exception {
        OffsetDateTime startTime = OffsetDateTime.now().plusDays(5);
        OffsetDateTime endTime = startTime.plusHours(4);
        OffsetDateTime regDeadline = startTime.minusHours(12);

        // 1. Validation error: startTime >= endTime
        problem(post(clubEvents(clubA)), adminToken, Map.of(
                "title", "Sự kiện lỗi thời gian",
                "eventType", "CLUB_EVENT",
                "startTime", endTime.toString(),
                "endTime", startTime.toString(),
                "registrationDeadline", regDeadline.toString(),
                "status", "DRAFT"
        ), 400, "INVALID_ARGUMENT");

        // 2. Validation error: registrationDeadline > startTime
        problem(post(clubEvents(clubA)), adminToken, Map.of(
                "title", "Sự kiện lỗi deadline",
                "eventType", "CLUB_EVENT",
                "startTime", startTime.toString(),
                "endTime", endTime.toString(),
                "registrationDeadline", startTime.plusHours(1).toString(),
                "status", "DRAFT"
        ), 400, "INVALID_ARGUMENT");

        // 3. PB-21.1: Valid event creation
        JsonNode created = call(post(clubEvents(clubA)), adminToken, Map.of(
                "title", "Hội thảo Trí tuệ Nhân tạo VJU 2026",
                "description", "Chuyên đề ứng dụng AI trong học tập và nghiên cứu",
                "eventType", "WORKSHOP",
                "location", "Hội trường 701 VJU",
                "startTime", startTime.toString(),
                "endTime", endTime.toString(),
                "registrationDeadline", regDeadline.toString(),
                "maxParticipants", 50,
                "allowCtv", true,
                "status", "OPEN_REGISTRATION"
        ), 201);

        UUID eventId = id(created);
        assertThat(created.path("title").asText()).isEqualTo("Hội thảo Trí tuệ Nhân tạo VJU 2026");
        assertThat(created.path("eventType").asText()).isEqualTo("WORKSHOP");
        assertThat(created.path("status").asText()).isEqualTo("OPEN_REGISTRATION");
        assertThat(created.path("allowCtv").asBoolean()).isTrue();

        // 4. PB-21.2: Update event details
        JsonNode updated = call(patch(clubEvents(clubA) + "/" + eventId), adminToken, Map.of(
                "location", "Hội trường Lớn - Cơ sở Mỹ Đình",
                "maxParticipants", 80
        ), 200);
        assertThat(updated.path("location").asText()).isEqualTo("Hội trường Lớn - Cơ sở Mỹ Đình");
        assertThat(updated.path("maxParticipants").asInt()).isEqualTo(80);

        // 5. PB-21.5: Public & Club discovery
        JsonNode publicEvents = call(get("/api/v1/public/events"), null, null, 200);
        assertThat(publicEvents.path("items").isArray()).isTrue();
        assertThat(publicEvents.path("total").asInt()).isGreaterThanOrEqualTo(1);

        JsonNode clubEventsList = call(get(clubEvents(clubA)), adminToken, null, 200);
        assertThat(clubEventsList.path("total").asInt()).isGreaterThanOrEqualTo(1);

        // 6. PB-21.3: Cancel event
        JsonNode cancelled = call(patch(clubEvents(clubA) + "/" + eventId), adminToken, Map.of(
                "status", "CANCELLED"
        ), 200);
        assertThat(cancelled.path("status").asText()).isEqualTo("CANCELLED");

        // Trying to register for CANCELLED event is rejected (409 EVENT_CANCELLED or NOT_OPEN)
        UUID student = user("student.cancelled@vju.test");
        String studentToken = token(student);
        membership(student, clubA);
        problem(post(eventRegistrations(eventId)), studentToken, Map.of(), 409, null);
    }

    @Test
    @DisplayName("PB-22.1, PB-22.2, PB-23.1, PB-23.2 (DoD-P3-05): Member registration workflow, capacity limits and cancellation before deadline")
    void testEventRegistrationWorkflowAndCapacity() throws Exception {
        UUID member1 = user("event.member1@vju.test");
        UUID member2 = user("event.member2@vju.test");
        String member1Token = token(member1);
        String member2Token = token(member2);

        membership(member1, clubA);
        membership(member2, clubA);

        OffsetDateTime startTime = OffsetDateTime.now().plusDays(4);
        OffsetDateTime endTime = startTime.plusHours(2);
        OffsetDateTime regDeadline = startTime.minusHours(6);

        // Create event with maxParticipants = 1
        JsonNode event = call(post(clubEvents(clubA)), adminToken, Map.of(
                "title", "Giao lưu Cờ vua VJU",
                "eventType", "CLUB_EVENT",
                "location", "Phòng CLB Tầng 3",
                "startTime", startTime.toString(),
                "endTime", endTime.toString(),
                "registrationDeadline", regDeadline.toString(),
                "maxParticipants", 1,
                "allowCtv", false,
                "status", "OPEN_REGISTRATION"
        ), 201);
        UUID eventId = id(event);

        // PB-23.1: member1 registers successfully
        JsonNode reg1 = call(post(eventRegistrations(eventId)), member1Token, Map.of(
                "note", "Đăng ký tham gia thi đấu cờ chớp"
        ), 201);
        assertThat(reg1.path("status").asText()).isEqualTo("REGISTERED");
        assertThat(reg1.path("participantType").asText()).isEqualTo("MEMBER");

        // Duplicate registration attempt by member1 is rejected (409)
        problem(post(eventRegistrations(eventId)), member1Token, Map.of(), 409, "DUPLICATE_REGISTRATION");

        // Capacity full limit: member2 registration exceeds maxParticipants=1 -> 409 EVENT_FULL
        problem(post(eventRegistrations(eventId)), member2Token, Map.of(), 409, "EVENT_FULL");

        // PB-23.2: member1 cancels registration before deadline
        JsonNode cancelRes = call(patch("/api/v1/events/" + eventId + "/registrations/me/cancel"), member1Token, null, 200);
        assertThat(cancelRes.path("status").asText()).isEqualTo("CANCELLED");

        // After member1 cancelled, slot is freed -> member2 registers successfully
        JsonNode reg2 = call(post(eventRegistrations(eventId)), member2Token, Map.of(
                "note", "Đăng ký sau khi có slot trống"
        ), 201);
        assertThat(reg2.path("status").asText()).isEqualTo("REGISTERED");
        assertThat(reg2.path("participantType").asText()).isEqualTo("MEMBER");

        // PB-22.2: Close registration via PATCH event status
        call(patch(clubEvents(clubA) + "/" + eventId), adminToken, Map.of(
                "status", "CLOSED_REGISTRATION"
        ), 200);

        UUID member3 = user("event.member3@vju.test");
        membership(member3, clubA);
        problem(post(eventRegistrations(eventId)), token(member3), Map.of(), 409, null);
    }

    @Test
    @DisplayName("PB-24.1, PB-24.2, PB-44 (DoD-P3-06, DoD-P3-02): CTV registration, personal tracking and strict RBAC isolation")
    void testCtvRegistrationAndSecurityIsolation() throws Exception {
        UUID ctvStudent = user("ctv.candidate@gmail.com");
        String ctvToken = token(ctvStudent);

        OffsetDateTime start = OffsetDateTime.now().plusDays(3);
        OffsetDateTime end = start.plusHours(4);
        OffsetDateTime deadline = start.minusHours(4);

        // Internal event (allowCtv = false)
        JsonNode internalEvent = call(post(clubEvents(clubA)), adminToken, Map.of(
                "title", "Đại hội Chi đoàn nội bộ",
                "eventType", "MEETING",
                "startTime", start.toString(),
                "endTime", end.toString(),
                "registrationDeadline", deadline.toString(),
                "allowCtv", false,
                "status", "OPEN_REGISTRATION"
        ), 201);
        UUID internalEventId = id(internalEvent);

        // External student trying to register for internal event -> 403 PERMISSION_DENIED
        problem(post(eventRegistrations(internalEventId)), ctvToken, Map.of(), 403, "PERMISSION_DENIED");

        // Open CTV event (allowCtv = true)
        JsonNode ctvEvent = call(post(clubEvents(clubA)), adminToken, Map.of(
                "title", "Ngày hội Thể thao VJU Sports Day",
                "eventType", "CLUB_EVENT",
                "startTime", start.plusDays(1).toString(),
                "endTime", end.plusDays(1).toString(),
                "registrationDeadline", deadline.plusDays(1).toString(),
                "allowCtv", true,
                "status", "OPEN_REGISTRATION"
        ), 201);
        UUID ctvEventId = id(ctvEvent);

        // PB-24.1: External student registers as CTV
        JsonNode ctvReg = call(post(eventRegistrations(ctvEventId)), ctvToken, Map.of(
                "note", "Đăng ký làm tình nguyện viên hỗ trợ sân bóng"
        ), 201);
        assertThat(ctvReg.path("status").asText()).isEqualTo("REGISTERED");
        assertThat(ctvReg.path("participantType").asText()).isEqualTo("CTV");

        // DoD-P3-06 Security & RBAC Isolation Verification:
        // 1. CTV has NO record in memberships table
        int memberCount = count("SELECT count(*) FROM memberships WHERE user_id = ? AND club_id = ?", ctvStudent, clubA);
        assertThat(memberCount).isZero();

        // 2. CTV effective-permissions is strictly empty
        JsonNode perms = call(get("/api/v1/users/me/effective-permissions"), ctvToken, null, 200);
        assertThat(perms.size()).isZero();

        // PB-24.2: CTV checks their own event registrations list
        JsonNode myRegs = call(get("/api/v1/users/me/event-registrations"), ctvToken, null, 200);
        assertThat(myRegs.path("total").asInt()).isEqualTo(1);
        assertThat(myRegs.at("/items/0/participantType").asText()).isEqualTo("CTV");

        // PB-24.2: CTV cancels registration before deadline
        JsonNode ctvCancel = call(patch("/api/v1/events/" + ctvEventId + "/registrations/me/cancel"), ctvToken, null, 200);
        assertThat(ctvCancel.path("status").asText()).isEqualTo("CANCELLED");
    }

    @Test
    @DisplayName("PB-25.1, PB-25.2 (DoD-P3-07): Participant roster retrieval and event role assignment with audit trail")
    void testParticipantManagementAndEventRoles() throws Exception {
        UUID ctvUser = user("ctv.roster@vju.test");
        UUID memberUser = user("member.roster@vju.test");
        String ctvToken = token(ctvUser);
        String memberToken = token(memberUser);

        membership(memberUser, clubA);

        OffsetDateTime start = OffsetDateTime.now().plusDays(2);
        OffsetDateTime end = start.plusHours(5);
        OffsetDateTime deadline = start.minusHours(3);

        JsonNode event = call(post(clubEvents(clubA)), adminToken, Map.of(
                "title", "Đêm nhạc Giao lưu Văn nghệ Mùa đông",
                "eventType", "CLUB_EVENT",
                "startTime", start.toString(),
                "endTime", end.toString(),
                "registrationDeadline", deadline.toString(),
                "allowCtv", true,
                "status", "OPEN_REGISTRATION"
        ), 201);
        UUID eventId = id(event);

        // Register member & CTV
        call(post(eventRegistrations(eventId)), memberToken, Map.of("note", "Thành viên biểu diễn"), 201);
        JsonNode ctvReg = call(post(eventRegistrations(eventId)), ctvToken, Map.of("note", "CTV kỹ thuật âm thanh"), 201);
        UUID ctvRegId = id(ctvReg);

        // PB-25.1: Club manager lists participants roster
        JsonNode roster = call(get(eventRegistrations(eventId)), adminToken, null, 200);
        assertThat(roster.path("total").asInt()).isEqualTo(2);
        assertThat(roster.path("items").isArray()).isTrue();

        // Non-manager member cannot list registrations with administrative view (returns 403 or filtered)
        UUID outsider = user("outsider.roster@vju.test");
        problem(get(eventRegistrations(eventId)), token(outsider), null, 403, "PERMISSION_DENIED");

        // PB-25.2: Event organizer assigns event role to CTV
        JsonNode updatedReg = call(patch("/api/v1/events/" + eventId + "/registrations/" + ctvRegId), adminToken, Map.of(
                "eventRole", "Trưởng nhóm Kỹ thuật Âm thanh",
                "note", "Đã duyệt và giao phụ trách mixer bàn 1"
        ), 200);

        assertThat(updatedReg.path("eventRole").asText()).isEqualTo("Trưởng nhóm Kỹ thuật Âm thanh");
        assertThat(updatedReg.path("participantType").asText()).isEqualTo("CTV");

        // Verify audit log recorded for EVENT_REGISTRATION_UPDATED
        int auditCount = count("SELECT count(*) FROM audit_logs WHERE action = 'EVENT_REGISTRATION_UPDATED' AND resource_id = ?", eventId);
        assertThat(auditCount).isGreaterThanOrEqualTo(1);

        // Re-verify that assigning eventRole does NOT create club membership
        assertThat(count("SELECT count(*) FROM memberships WHERE user_id = ? AND club_id = ?", ctvUser, clubA)).isZero();
    }
}
