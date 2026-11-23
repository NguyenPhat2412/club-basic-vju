package com.vju.club.integration;

import com.fasterxml.jackson.databind.JsonNode;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.web.servlet.request.MockMultipartHttpServletRequestBuilder;

import java.nio.charset.StandardCharsets;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;

class EventInternalAndSubmissionApiTest extends ApiIntegrationTest {

    private static List<String> itemIds(JsonNode page) {
        List<String> ids = new ArrayList<>();
        for (JsonNode item : page.path("items")) {
            ids.add(item.path("id").asText());
        }
        return ids;
    }

    @Test
    void internalClubEventsAreIsolatedFromPublicAndNonMembers() throws Exception {
        UUID clubAMember = user("cluba-member@test.local");
        membership(clubAMember, clubA);
        String clubAMemberToken = token(clubAMember);

        UUID clubBMember = user("clubb-member@test.local");
        membership(clubBMember, clubB);
        String clubBMemberToken = token(clubBMember);

        UUID outsider = user("outsider@test.local");
        String outsiderToken = token(outsider);

        OffsetDateTime start = OffsetDateTime.now().plusDays(3);
        OffsetDateTime end = start.plusHours(2);
        OffsetDateTime deadline = start.minusHours(2);

        JsonNode publicEvent = call(post("/api/v1/clubs/" + clubA + "/events"), adminToken, Map.of(
                "title", "Ngày hội Công khai CLB A",
                "eventType", "CLUB_EVENT",
                "startTime", start.toString(),
                "endTime", end.toString(),
                "registrationDeadline", deadline.toString(),
                "allowCtv", true,
                "status", "OPEN_REGISTRATION"
        ), 201);
        UUID publicEventId = id(publicEvent);

        JsonNode internalEvent = call(post("/api/v1/clubs/" + clubA + "/events"), adminToken, Map.of(
                "title", "Họp Chiến lược Nội bộ CLB A",
                "eventType", "MEETING",
                "startTime", start.plusHours(4).toString(),
                "endTime", end.plusHours(4).toString(),
                "registrationDeadline", deadline.plusHours(4).toString(),
                "allowCtv", false,
                "status", "OPEN_REGISTRATION"
        ), 201);
        UUID internalEventId = id(internalEvent);

        // Anonymous GET /public/events excludes internal events
        JsonNode publicPage = call(get("/api/v1/public/events").param("limit", "50"), null, null, 200);
        assertThat(itemIds(publicPage)).contains(publicEventId.toString());
        assertThat(itemIds(publicPage)).doesNotContain(internalEventId.toString());

        // GET /events/discover: Club A member sees both public and Club A internal event
        JsonNode memberADiscover = call(get("/api/v1/events/discover").param("limit", "50"), clubAMemberToken, null, 200);
        assertThat(itemIds(memberADiscover)).contains(publicEventId.toString(), internalEventId.toString());

        // GET /events/discover: Outsider and Club B member see ONLY public event
        JsonNode outsiderDiscover = call(get("/api/v1/events/discover").param("limit", "50"), outsiderToken, null, 200);
        assertThat(itemIds(outsiderDiscover)).contains(publicEventId.toString());
        assertThat(itemIds(outsiderDiscover)).doesNotContain(internalEventId.toString());

        JsonNode memberBDiscover = call(get("/api/v1/events/discover").param("limit", "50"), clubBMemberToken, null, 200);
        assertThat(itemIds(memberBDiscover)).contains(publicEventId.toString());
        assertThat(itemIds(memberBDiscover)).doesNotContain(internalEventId.toString());

        // GET /events/discover: System Admin with global event.view sees both
        JsonNode adminDiscover = call(get("/api/v1/events/discover").param("limit", "50"), adminToken, null, 200);
        assertThat(itemIds(adminDiscover)).contains(publicEventId.toString(), internalEventId.toString());

        // Direct GET /events/{internalEventId}: 403 for outsider & Club B member, 200 for Club A member & admin
        problem(get("/api/v1/events/" + internalEventId), outsiderToken, null, 403, "PERMISSION_DENIED");
        problem(get("/api/v1/events/" + internalEventId), clubBMemberToken, null, 403, "PERMISSION_DENIED");
        call(get("/api/v1/events/" + internalEventId), clubAMemberToken, null, 200);
        call(get("/api/v1/events/" + internalEventId), adminToken, null, 200);

        // Internal event notifications reach only active Club A members, never outsiders or Club B members
        assertThat(count("SELECT count(*) FROM notifications WHERE reference_id = ? AND user_id = ?",
                internalEventId, clubAMember)).isEqualTo(1);
        assertThat(count("SELECT count(*) FROM notifications WHERE reference_id = ? AND user_id = ?",
                internalEventId, clubBMember)).isZero();
        assertThat(count("SELECT count(*) FROM notifications WHERE reference_id = ? AND user_id = ?",
                internalEventId, outsider)).isZero();
    }

    @Test
    void eventSubmissionUploadDownloadAndAutomaticDeadlineLock() throws Exception {
        UUID student = user("applicant-sub@test.local");
        String studentToken = token(student);

        UUID otherStudent = user("other-student@test.local");
        String otherStudentToken = token(otherStudent);

        UUID officer = user("bcn-officer@test.local");
        membership(officer, clubA);
        grant(officer, "event.view", "CLUB", clubA, null);
        String officerToken = token(officer);

        OffsetDateTime start = OffsetDateTime.now().plusDays(2);
        OffsetDateTime end = start.plusHours(3);
        OffsetDateTime deadline = start.minusHours(2);

        JsonNode event = call(post("/api/v1/clubs/" + clubA + "/events"), adminToken, Map.of(
                "title", "Cuộc thi Ý tưởng Sáng tạo VJU",
                "eventType", "RECRUITMENT",
                "startTime", start.toString(),
                "endTime", end.toString(),
                "registrationDeadline", deadline.toString(),
                "allowCtv", true,
                "requiresSubmission", true,
                "status", "OPEN_REGISTRATION"
        ), 201);
        UUID eventId = id(event);
        assertThat(event.path("requiresSubmission").asBoolean()).isTrue();

        JsonNode reg = call(post("/api/v1/events/" + eventId + "/registrations"), studentToken, Map.of(
                "note", "Đăng ký tham gia cuộc thi"
        ), 201);
        UUID regId = id(reg);

        byte[] pdfBytes = "%PDF-1.7\n% Ho so du thi VJU\n".getBytes(StandardCharsets.UTF_8);

        // Disallowed extension is rejected with 400 INVALID_FILE_TYPE
        MockMultipartHttpServletRequestBuilder badExtReq = multipart("/api/v1/events/" + eventId + "/registrations/me/submission");
        badExtReq.file(new MockMultipartFile("file", "malware.exe", "application/octet-stream", new byte[]{1, 2, 3}));
        problem(badExtReq, studentToken, null, 400, "INVALID_FILE_TYPE");

        // Upload before deadline succeeds
        MockMultipartHttpServletRequestBuilder uploadReq = multipart("/api/v1/events/" + eventId + "/registrations/me/submission");
        uploadReq.file(new MockMultipartFile("file", "ho-so-du-thi.pdf", "application/pdf", pdfBytes));
        JsonNode uploaded = call(uploadReq, studentToken, null, 200);
        assertThat(uploaded.path("submissionFileName").asText()).isEqualTo("ho-so-du-thi.pdf");
        assertThat(uploaded.path("submissionUploadedAt").asText()).isNotBlank();

        // Reflected in my event registrations
        JsonNode myRegs = call(get("/api/v1/users/me/event-registrations"), studentToken, null, 200);
        assertThat(myRegs.at("/items/0/requiresSubmission").asBoolean()).isTrue();
        assertThat(myRegs.at("/items/0/submissionFileName").asText()).isEqualTo("ho-so-du-thi.pdf");

        // Owner can download
        MockHttpServletResponse ownerDl = send(
                get("/api/v1/events/" + eventId + "/registrations/" + regId + "/submission"),
                studentToken, null);
        assertThat(ownerDl.getStatus()).isEqualTo(200);
        assertThat(ownerDl.getContentAsByteArray()).isEqualTo(pdfBytes);
        assertThat(ownerDl.getHeader("Content-Disposition")).contains("attachment");

        // Club officer (BCN) can download
        MockHttpServletResponse officerDl = send(
                get("/api/v1/events/" + eventId + "/registrations/" + regId + "/submission"),
                officerToken, null);
        assertThat(officerDl.getStatus()).isEqualTo(200);
        assertThat(officerDl.getContentAsByteArray()).isEqualTo(pdfBytes);

        // Unrelated student gets 403 PERMISSION_DENIED
        problem(get("/api/v1/events/" + eventId + "/registrations/" + regId + "/submission"),
                otherStudentToken, null, 403, "PERMISSION_DENIED");

        // Past registration_deadline -> automatically locked with 409 REGISTRATION_CLOSED
        db.update("UPDATE events SET registration_deadline = now() - interval '5 seconds' WHERE id = ?", eventId);
        MockMultipartHttpServletRequestBuilder lateReq = multipart("/api/v1/events/" + eventId + "/registrations/me/submission");
        lateReq.file(new MockMultipartFile("file", "ho-so-muon.pdf", "application/pdf", pdfBytes));
        problem(lateReq, studentToken, null, 409, "REGISTRATION_CLOSED");

        // Restore deadline but close event registration -> locked with 409 REGISTRATION_CLOSED
        db.update("UPDATE events SET registration_deadline = ? WHERE id = ?", deadline, eventId);
        call(patch("/api/v1/clubs/" + clubA + "/events/" + eventId), adminToken,
                Map.of("status", "CLOSED_REGISTRATION"), 200);
        MockMultipartHttpServletRequestBuilder closedReq = multipart("/api/v1/events/" + eventId + "/registrations/me/submission");
        closedReq.file(new MockMultipartFile("file", "ho-so-dong.pdf", "application/pdf", pdfBytes));
        problem(closedReq, studentToken, null, 409, "REGISTRATION_CLOSED");
    }

    @Test
    void clubWideGeneralTasksFilterAndSummaryWorkCleanly() throws Exception {
        UUID clubMember = user("club-task-member@test.local");
        UUID memberShipId = membership(clubMember, clubA);
        assign(depA1, memberShipId);

        OffsetDateTime deadline = OffsetDateTime.now().plusDays(4);

        // 1. Club-wide general task (departmentId == null)
        JsonNode clubWideTask = call(post("/api/v1/clubs/" + clubA + "/tasks"), adminToken, Map.of(
                "title", "Tổng kết kế hoạch hoạt động toàn CLB học kỳ I",
                "assigneeId", clubMember.toString(),
                "priority", "HIGH",
                "deadline", deadline.toString()
        ), 201);
        UUID clubWideTaskId = id(clubWideTask);
        assertThat(clubWideTask.path("departmentId").isNull()).isTrue();

        // 2. Department-scoped task (departmentId == depA1)
        JsonNode deptTask = call(post("/api/v1/clubs/" + clubA + "/tasks"), adminToken, Map.of(
                "title", "Thiết kế banner Ban A1",
                "departmentId", depA1.toString(),
                "assigneeId", clubMember.toString(),
                "priority", "MEDIUM",
                "deadline", deadline.toString()
        ), 201);
        UUID deptTaskId = id(deptTask);
        assertThat(deptTask.path("departmentId").asText()).isEqualTo(depA1.toString());

        // Without clubWideOnly -> returns both tasks
        JsonNode allTasks = call(get("/api/v1/clubs/" + clubA + "/tasks"), adminToken, null, 200);
        assertThat(allTasks.path("total").asInt()).isEqualTo(2);
        assertThat(itemIds(allTasks)).containsExactlyInAnyOrder(clubWideTaskId.toString(), deptTaskId.toString());

        // With clubWideOnly=true -> returns ONLY club-wide general tasks (departmentId == null)
        JsonNode clubWidePage = call(get("/api/v1/clubs/" + clubA + "/tasks").param("clubWideOnly", "true"),
                adminToken, null, 200);
        assertThat(clubWidePage.path("total").asInt()).isEqualTo(1);
        assertThat(itemIds(clubWidePage)).containsExactly(clubWideTaskId.toString());

        // Summary with clubWideOnly=true matches club-wide count only
        JsonNode clubWideSummary = call(get("/api/v1/clubs/" + clubA + "/tasks/summary").param("clubWideOnly", "true"),
                adminToken, null, 200);
        assertThat(clubWideSummary.path("total").asLong()).isEqualTo(1L);
        assertThat(clubWideSummary.path("todoCount").asLong()).isEqualTo(1L);
    }
}
