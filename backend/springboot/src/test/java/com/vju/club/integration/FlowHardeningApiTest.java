package com.vju.club.integration;

import com.fasterxml.jackson.databind.JsonNode;
import org.junit.jupiter.api.Test;

import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.atomic.AtomicInteger;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;

class FlowHardeningApiTest extends ApiIntegrationTest {
    private void giveRole(UUID userId, String roleCode, UUID clubId) {
        db.update("INSERT INTO user_roles (user_id, role_id, scope, club_id, granted_by) "
                + "SELECT ?, id, 'CLUB', ?, ? FROM roles WHERE code = ?", userId, clubId, admin, roleCode);
    }

    private int activeClubRoles(UUID userId, UUID clubId) {
        return count("SELECT count(*) FROM user_roles WHERE user_id = ? AND club_id = ? AND revoked_at IS NULL", userId, clubId);
    }

    private UUID applyAndApprove(UUID userId, String token, UUID clubId) throws Exception {
        JsonNode application = call(post("/api/v1/clubs/" + clubId + "/applications"), token, Map.of("message", "Xin vào CLB"), 201);
        JsonNode approved = call(post("/api/v1/clubs/" + clubId + "/applications/" + id(application) + "/approve"),
                adminToken, Map.of(), 200);
        return UUID.fromString(approved.path("membershipId").asText());
    }

    private Map<String, Object> eventBody(String title, OffsetDateTime start) {
        Map<String, Object> body = new HashMap<>();
        body.put("title", title);
        body.put("startTime", start.toString());
        body.put("endTime", start.plusHours(2).toString());
        body.put("registrationDeadline", start.minusHours(12).toString());
        return body;
    }

    private UUID event(UUID clubId, String title, Map<String, Object> extra) throws Exception {
        Map<String, Object> body = eventBody(title, OffsetDateTime.now().plusDays(2));
        body.putAll(extra);
        return id(call(post("/api/v1/clubs/" + clubId + "/events"), adminToken, body, 201));
    }

    @Test
    void anApprovedStudentSeesTheClubsMembersAndDocumentsUntilTheyLeave() throws Exception {
        problem(get("/api/v1/clubs/" + clubA + "/memberships"), memberToken, null, 403, "PERMISSION_DENIED");
        JsonNode application = call(post("/api/v1/clubs/" + clubA + "/applications"), memberToken, Map.of("message", "Em xin vào"), 201);
        JsonNode pending = call(get("/api/v1/clubs/" + clubA + "/applications/" + id(application)), adminToken, null, 200);
        assertThat(pending.path("applicantName").asText()).isEqualTo("member@test.local");
        assertThat(pending.path("applicantEmail").asText()).isEqualTo("member@test.local");
        assertThat(pending.has("applicantStudentCode")).isTrue();

        UUID membershipId = UUID.fromString(call(post("/api/v1/clubs/" + clubA + "/applications/" + id(application) + "/approve"),
                adminToken, Map.of(), 200).path("membershipId").asText());
        JsonNode members = call(get("/api/v1/clubs/" + clubA + "/memberships"), memberToken, null, 200);
        assertThat(members.toString()).contains("\"userFullName\":\"member@test.local\"");
        call(get("/api/v1/clubs/" + clubA + "/documents"), memberToken, null, 200);
        call(get("/api/v1/clubs/" + clubA + "/departments"), memberToken, null, 200);
        problem(get("/api/v1/clubs/" + clubB + "/memberships"), memberToken, null, 403, "PERMISSION_DENIED");

        call(delete("/api/v1/memberships/" + membershipId), adminToken, null, 204);
        problem(get("/api/v1/clubs/" + clubA + "/memberships"), memberToken, null, 403, "PERMISSION_DENIED");
        problem(get("/api/v1/clubs/" + clubA + "/documents"), memberToken, null, 403, "PERMISSION_DENIED");
    }

    @Test
    void leavingAClubTakesAwayEveryRoleAndPermissionInThatClubOnly() throws Exception {
        UUID membershipId = membership(member, clubA);
        giveRole(member, "CLUB_PRESIDENT", clubA);
        giveRole(member, "CLUB_PRESIDENT", clubB);
        grant(member, "club.update", "CLUB", clubA, null);
        grant(member, "department.update", "DEPARTMENT", null, depA1);
        call(patch("/api/v1/clubs/" + clubA), memberToken, Map.of("description", "still president"), 200);

        call(delete("/api/v1/memberships/" + membershipId), adminToken, null, 204);
        problem(patch("/api/v1/clubs/" + clubA), memberToken, Map.of("description", "former president"), 403, "PERMISSION_DENIED");
        problem(get("/api/v1/clubs/" + clubA + "/applications"), memberToken, null, 403, "PERMISSION_DENIED");
        assertThat(activeClubRoles(member, clubA)).isZero();
        assertThat(count("SELECT count(*) FROM user_permissions WHERE user_id = ? AND revoked_at IS NULL", member)).isZero();
        assertThat(activeClubRoles(member, clubB)).isEqualTo(1);
        call(patch("/api/v1/clubs/" + clubB), memberToken, Map.of("description", "other club unaffected"), 200);
    }

    @Test
    void suspensionPausesMemberAccessAndReactivationRestoresIt() throws Exception {
        JsonNode added = call(post("/api/v1/clubs/" + clubA + "/memberships"), adminToken, Map.of("userId", member), 201);
        call(get("/api/v1/clubs/" + clubA + "/memberships"), memberToken, null, 200);
        call(patch("/api/v1/memberships/" + id(added)), adminToken, Map.of("status", "SUSPENDED"), 200);
        problem(get("/api/v1/clubs/" + clubA + "/memberships"), memberToken, null, 403, "PERMISSION_DENIED");
        call(patch("/api/v1/memberships/" + id(added)), adminToken, Map.of("status", "ACTIVE"), 200);
        call(get("/api/v1/clubs/" + clubA + "/memberships"), memberToken, null, 200);
    }

    @Test
    void markingSomeoneAsLeftNeedsTheRemovePermission() throws Exception {
        UUID vp = user("vp@test.local");
        String vpToken = token(vp);
        grant(vp, "member.update", "CLUB", clubA, null);
        UUID membershipId = membership(member, clubA);
        problem(patch("/api/v1/memberships/" + membershipId), vpToken, Map.of("status", "LEFT"), 403, "PERMISSION_DENIED");
        call(patch("/api/v1/memberships/" + membershipId), vpToken, Map.of("status", "SUSPENDED"), 200);
        grant(vp, "member.remove", "CLUB", clubA, null);
        call(patch("/api/v1/memberships/" + membershipId), vpToken, Map.of("status", "LEFT"), 200);
    }

    @Test
    void approvalNeedsAnActiveClubAndApplicantAndDeactivationClosesPendingApplications() throws Exception {
        JsonNode toA = call(post("/api/v1/clubs/" + clubA + "/applications"), memberToken, Map.of("message", "A"), 201);
        db.update("UPDATE clubs SET status = 'INACTIVE' WHERE id = ?", clubA);
        problem(post("/api/v1/clubs/" + clubA + "/applications/" + id(toA) + "/approve"), adminToken, Map.of(), 409, "CLUB_INACTIVE");

        JsonNode toB = call(post("/api/v1/clubs/" + clubB + "/applications"), memberToken, Map.of("message", "B"), 201);
        db.update("UPDATE users SET status = 'INACTIVE' WHERE id = ?", member);
        problem(post("/api/v1/clubs/" + clubB + "/applications/" + id(toB) + "/approve"), adminToken, Map.of(), 409, "USER_INACTIVE");
        assertThat(count("SELECT count(*) FROM memberships WHERE user_id = ?", member)).isZero();

        UUID other = user("other@test.local");
        JsonNode pending = call(post("/api/v1/clubs/" + clubB + "/applications"), token(other), Map.of("message", "B"), 201);
        call(patch("/api/v1/clubs/" + clubB + "/status"), adminToken, Map.of("status", "INACTIVE"), 200);
        assertThat(db.queryForObject("SELECT status FROM club_applications WHERE id = ?", String.class, id(pending))).isEqualTo("REJECTED");
        assertThat(db.queryForObject("SELECT review_note FROM club_applications WHERE id = ?", String.class, id(pending))).contains("tạm dừng");
    }

    @Test
    void tasksGoOnlyToActiveMembersAndFollowStatusRules() throws Exception {
        membership(member, clubA);
        UUID outsider = user("outsider@test.local");
        String deadline = OffsetDateTime.now().plusDays(3).toString();
        problem(post("/api/v1/clubs/" + clubA + "/tasks"), adminToken,
                Map.of("title", "x", "deadline", deadline, "assigneeId", outsider), 409, "ASSIGNEE_NOT_MEMBER");
        problem(post("/api/v1/clubs/" + clubA + "/tasks"), adminToken,
                Map.of("title", "x", "deadline", deadline, "assigneeId", member, "departmentId", depA1), 409, "ASSIGNEE_NOT_IN_DEPARTMENT");

        String longTitle = "Chuẩn bị ".repeat(22).strip();
        assertThat(longTitle.length()).isGreaterThan(160);
        JsonNode task = call(post("/api/v1/clubs/" + clubA + "/tasks"), adminToken,
                Map.of("title", longTitle, "deadline", deadline, "assigneeId", member), 201);
        assertThat(task.has("assigneeEmail")).isFalse();
        assertThat(db.queryForObject("SELECT max(length(title)) FROM notifications WHERE user_id = ?", Integer.class, member)).isLessThanOrEqualTo(160);

        db.update("UPDATE tasks SET status = 'OVERDUE' WHERE id = ?", id(task));
        problem(patch("/api/v1/tasks/" + id(task) + "/progress"), memberToken, Map.of("status", "IN_PROGRESS"), 409, "TASK_OVERDUE");
        JsonNode done = call(patch("/api/v1/tasks/" + id(task) + "/progress"), memberToken, Map.of("status", "DONE", "progressPercent", 30), 200);
        assertThat(done.path("progressPercent").asInt()).isEqualTo(100);

        membership(admin, clubA);
        JsonNode own = call(post("/api/v1/clubs/" + clubA + "/tasks"), adminToken,
                Map.of("title", "Việc của admin", "deadline", deadline, "assigneeId", admin), 201);
        call(patch("/api/v1/tasks/" + id(own) + "/progress"), adminToken, Map.of("status", "DONE"), 200);
        problem(patch("/api/v1/tasks/" + id(own) + "/verify"), adminToken, Map.of(), 403, "SELF_VERIFICATION");

        db.update("UPDATE memberships SET status = 'LEFT', left_at = now() WHERE user_id = ? AND club_id = ?", member, clubA);
        JsonNode later = call(post("/api/v1/clubs/" + clubA + "/tasks"), adminToken,
                Map.of("title", "y", "deadline", deadline, "assigneeId", admin), 201);
        db.update("UPDATE tasks SET assignee_id = ? WHERE id = ?", member, id(later));
        problem(patch("/api/v1/tasks/" + id(later) + "/progress"), memberToken, Map.of("progressPercent", 10), 403, "PERMISSION_DENIED");
    }

    @Test
    void eventsRejectPastTimesBadTransitionsAndInactiveClubs() throws Exception {
        problem(post("/api/v1/clubs/" + clubA + "/events"), adminToken,
                eventBody("Quá khứ", OffsetDateTime.now().minusDays(1)), 400, "INVALID_EVENT_TIME");

        UUID draft = event(clubA, "Nháp", Map.of("status", "DRAFT"));
        String path = "/api/v1/clubs/" + clubA + "/events/" + draft;
        problem(patch(path), adminToken, Map.of("status", "COMPLETED"), 409, "INVALID_EVENT_STATUS_TRANSITION");
        call(patch(path), adminToken, Map.of("status", "OPEN_REGISTRATION"), 200);

        membership(member, clubA);
        UUID member2 = user("member2@test.local");
        membership(member2, clubA);
        call(post("/api/v1/events/" + draft + "/registrations"), memberToken, Map.of(), 201);
        call(post("/api/v1/events/" + draft + "/registrations"), token(member2), Map.of(), 201);
        problem(patch(path), adminToken, Map.of("maxParticipants", 1), 409, "MAX_PARTICIPANTS_TOO_LOW");

        call(patch(path), adminToken, Map.of("status", "CANCELLED"), 200);
        problem(patch(path), adminToken, Map.of("status", "OPEN_REGISTRATION"), 409, "INVALID_EVENT_STATUS_TRANSITION");
        assertThat(count("SELECT count(*) FROM notifications WHERE user_id = ? AND title LIKE 'Sự kiện đã huỷ%'", member)).isEqualTo(1);

        UUID open = event(clubA, "Mở", Map.of());
        db.update("UPDATE clubs SET status = 'INACTIVE' WHERE id = ?", clubA);
        problem(post("/api/v1/events/" + open + "/registrations"), memberToken, Map.of(), 409, "CLUB_INACTIVE");

        problem(get("/api/v1/users/me/calendar").param("from", "2020-01-01T00:00:00Z").param("to", "2030-01-01T00:00:00Z"),
                memberToken, null, 400, "INVALID_TIME_RANGE");
    }

    @Test
    void eventCapacityHoldsUnderConcurrentRegistrations() throws Exception {
        UUID full = event(clubA, "Một chỗ", Map.of("maxParticipants", 1));
        List<String> tokens = new ArrayList<>();
        for (int i = 0; i < 8; i++) {
            UUID u = user("racer" + i + "@test.local");
            membership(u, clubA);
            tokens.add(token(u));
        }
        AtomicInteger next = new AtomicInteger();
        List<Integer> statuses = concurrently(8, () -> {
            String session = tokens.get(next.getAndIncrement());
            return () -> send(post("/api/v1/events/" + full + "/registrations"), session, Map.of()).getStatus();
        });
        assertThat(statuses).containsOnlyOnce(201);
        assertThat(count("SELECT count(*) FROM event_registrations WHERE event_id = ? AND status = 'REGISTERED'", full)).isEqualTo(1);
    }

    @Test
    void chatRespectsDepartmentsInactiveClubsAndTheSummaryBudget() throws Exception {
        membership(member, clubA);
        UUID member2 = user("member2@test.local");
        UUID membership2 = membership(member2, clubA);
        assign(depA1, membership2);
        String member2Token = token(member2);

        JsonNode general = call(post("/api/v1/clubs/" + clubA + "/channels"), adminToken, Map.of("name", "chung", "channelType", "CLUB_GENERAL"), 201);
        JsonNode dept = call(post("/api/v1/clubs/" + clubA + "/channels"), adminToken,
                Map.of("name", "ban-a1", "channelType", "DEPARTMENT", "departmentId", depA1), 201);
        JsonNode visible = call(get("/api/v1/clubs/" + clubA + "/channels"), memberToken, null, 200);
        assertThat(visible.size()).isEqualTo(1);
        assertThat(call(get("/api/v1/clubs/" + clubA + "/channels"), member2Token, null, 200).size()).isEqualTo(2);
        problem(get("/api/v1/channels/" + id(dept) + "/messages"), memberToken, null, 403, "PERMISSION_DENIED");
        JsonNode sent = call(post("/api/v1/channels/" + id(dept) + "/messages"), member2Token, Map.of("content", "Ban A1 họp"), 201);
        assertThat(sent.has("senderEmail")).isFalse();

        String longMessage = "Chốt kế hoạch. ".repeat(300).substring(0, 3990);
        for (int i = 0; i < 3; i++) {
            call(post("/api/v1/channels/" + id(general) + "/messages"), memberToken, Map.of("content", longMessage), 201);
        }
        call(post("/api/v1/channels/" + id(general) + "/summaries"), adminToken, Map.of("messageLimit", 10), 201);
        assertThat(db.queryForObject("SELECT max(length(content)) FROM chat_messages WHERE sender_type = 'AI_BOT'", Integer.class))
                .isLessThanOrEqualTo(4000);
        for (int i = 1; i < 10; i++) {
            call(post("/api/v1/channels/" + id(general) + "/summaries"), adminToken, Map.of("messageLimit", 10, "postToChannel", false), 201);
        }
        problem(post("/api/v1/channels/" + id(general) + "/summaries"), adminToken, Map.of("messageLimit", 10), 429, "SUMMARY_LIMIT_REACHED");

        db.update("UPDATE clubs SET status = 'INACTIVE' WHERE id = ?", clubA);
        problem(post("/api/v1/channels/" + id(general) + "/messages"), memberToken, Map.of("content", "còn ai không"), 409, "CLUB_INACTIVE");
        call(get("/api/v1/channels/" + id(general) + "/messages"), memberToken, null, 200);
    }

    @Test
    void broadcastsAreRefusedForInactiveClubs() throws Exception {
        db.update("UPDATE clubs SET status = 'INACTIVE' WHERE id = ?", clubA);
        problem(post("/api/v1/clubs/" + clubA + "/notifications"), adminToken, Map.of("title", "x", "message", "y"), 409, "CLUB_INACTIVE");
    }

    @Test
    void attendanceIsOnlyForRegisteredPeopleAtHeldEvents() throws Exception {
        membership(member, clubA);
        UUID workshop = event(clubA, "Workshop", Map.of("eventType", "WORKSHOP"));
        call(post("/api/v1/events/" + workshop + "/registrations"), memberToken, Map.of(), 201);
        db.update("UPDATE events SET registration_deadline = now() - interval '2 hours', start_time = now() - interval '1 hour', "
                + "end_time = now() + interval '1 hour' WHERE id = ?", workshop);
        UUID walkIn = user("walkin@test.local");
        problem(put("/api/v1/events/" + workshop + "/attendances"), adminToken,
                Map.of("items", List.of(Map.of("userId", walkIn.toString(), "status", "PRESENT"))), 409, "PARTICIPANT_NOT_REGISTERED");
        call(put("/api/v1/events/" + workshop + "/attendances"), adminToken,
                Map.of("items", List.of(Map.of("userId", member.toString(), "status", "PRESENT"))), 200);

        UUID meeting = event(clubA, "Họp", Map.of("eventType", "MEETING"));
        db.update("UPDATE events SET registration_deadline = now() - interval '2 hours', start_time = now() - interval '1 hour', "
                + "end_time = now() + interval '1 hour' WHERE id = ?", meeting);
        call(put("/api/v1/events/" + meeting + "/attendances"), adminToken,
                Map.of("items", List.of(Map.of("userId", member.toString(), "status", "PRESENT"))), 200);

        db.update("UPDATE events SET status = 'CANCELLED' WHERE id = ?", meeting);
        problem(put("/api/v1/events/" + meeting + "/attendances"), adminToken,
                Map.of("items", List.of(Map.of("userId", member.toString(), "status", "PRESENT"))), 409, "EVENT_NOT_HELD");
    }
}
