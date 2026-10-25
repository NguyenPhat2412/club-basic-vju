package com.vju.club.integration;

import com.fasterxml.jackson.databind.JsonNode;
import com.vju.club.modules.task.service.TaskService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;

class PhaseThreeOperationsApiTest extends ApiIntegrationTest {
    @Autowired TaskService taskService;

    @Test
    void eventLifecycleRegistrationWaitlistAttendanceAndCalendarFlow() throws Exception {
        UUID member2 = user("member2@test.local");
        String member2Token = token(member2);
        membership(member, clubA);
        membership(member2, clubA);

        OffsetDateTime registrationDeadline = OffsetDateTime.now().plusDays(1);
        OffsetDateTime startTime = OffsetDateTime.now().plusDays(2);
        OffsetDateTime endTime = startTime.plusHours(3);
        JsonNode created = call(post("/api/v1/clubs/" + clubA + "/events"), adminToken, Map.of(
                "title", "Họp định kỳ CLB A",
                "description", "Thảo luận kế hoạch sự kiện mùa thu",
                "eventType", "MEETING",
                "location", "Phòng 402 VJU",
                "startTime", startTime.toString(),
                "endTime", endTime.toString(),
                "registrationDeadline", registrationDeadline.toString(),
                "maxParticipants", 1,
                "status", "OPEN_REGISTRATION"
        ), 201);
        UUID eventId = id(created);
        assertThat(created.path("status").asText()).isEqualTo("OPEN_REGISTRATION");

        // Auto notification sent to active club members
        JsonNode memberNotifications = call(get("/api/v1/users/me/notifications"), memberToken, null, 200);
        assertThat(memberNotifications.path("total").asInt()).isGreaterThanOrEqualTo(1);

        // First member registers -> REGISTERED
        JsonNode reg1 = call(post("/api/v1/events/" + eventId + "/registrations"), memberToken,
                Map.of("note", "Mình sẽ đến đúng giờ"), 201);
        assertThat(reg1.path("status").asText()).isEqualTo("REGISTERED");

        // Second member registers when maxParticipants=1 -> 409 EVENT_FULL (TC06 3b)
        problem(post("/api/v1/events/" + eventId + "/registrations"), member2Token,
                Map.of("note", "Xin đăng ký"), 409, "EVENT_FULL");

        // Expand maxParticipants via PATCH /api/v1/clubs/{clubId}/events/{eventId} and register member2
        call(patch("/api/v1/clubs/" + clubA + "/events/" + eventId), adminToken,
                Map.of("maxParticipants", 5), 200);
        JsonNode reg2 = call(post("/api/v1/events/" + eventId + "/registrations"), member2Token,
                Map.of("note", "Đăng ký sau khi mở thêm slot"), 201);
        assertThat(reg2.path("status").asText()).isEqualTo("REGISTERED");

        // Calendar includes club's published event
        JsonNode calendar = call(get("/api/v1/users/me/calendar"), memberToken, null, 200);
        assertThat(calendar.size()).isEqualTo(1);
        assertThat(calendar.get(0).path("id").asText()).isEqualTo(eventId.toString());

        // Attendance opens shortly before the event starts, and only for people who registered
        problem(put("/api/v1/events/" + eventId + "/attendances"), adminToken, Map.of("items",
                List.of(Map.of("userId", member.toString(), "status", "PRESENT"))), 409, "EVENT_NOT_STARTED");
        db.update("UPDATE events SET registration_deadline = now() - interval '2 hours', "
                + "start_time = now() - interval '1 hour', end_time = now() + interval '2 hours' WHERE id = ?", eventId);
        UUID outsider = user("outsider@test.local");
        problem(put("/api/v1/events/" + eventId + "/attendances"), adminToken, Map.of("items",
                List.of(Map.of("userId", outsider.toString(), "status", "PRESENT"))), 409, "PARTICIPANT_NOT_REGISTERED");

        // Record attendance (TC07)
        JsonNode attendances = call(put("/api/v1/events/" + eventId + "/attendances"), adminToken, Map.of(
                "items", List.of(
                        Map.of("userId", member.toString(), "status", "PRESENT", "note", "Có mặt đúng giờ"),
                        Map.of("userId", member2.toString(), "status", "LATE", "note", "Đến muộn 10 phút")
                )
        ), 200);
        assertThat(attendances.size()).isEqualTo(2);

        JsonNode listedAttendances = call(get("/api/v1/events/" + eventId + "/attendances"), adminToken, null, 200);
        assertThat(listedAttendances.size()).isEqualTo(2);

        // Cancel registration while registration is still open
        db.update("UPDATE events SET start_time = now() + interval '2 days', end_time = now() + interval '2 days 3 hours', "
                + "registration_deadline = now() + interval '1 day' WHERE id = ?", eventId);
        JsonNode cancelled = call(patch("/api/v1/events/" + eventId + "/registrations/me/cancel"),
                memberToken, null, 200);
        assertThat(cancelled.path("status").asText()).isEqualTo("CANCELLED");
    }

    @Test
    void taskAssignmentProgressUpdateVerificationAndOverdueFlow() throws Exception {
        membership(member, clubA);

        OffsetDateTime deadline = OffsetDateTime.now().plusDays(3);
        JsonNode task = call(post("/api/v1/clubs/" + clubA + "/tasks"), adminToken, Map.of(
                "assigneeId", member.toString(),
                "title", "Thiết kế poster sự kiện chào tân",
                "description", "Chuẩn bị bản thiết kế khổ A3 và bài đăng fanpage",
                "priority", "HIGH",
                "deadline", deadline.toString()
        ), 201);
        UUID taskId = id(task);
        assertThat(task.path("status").asText()).isEqualTo("TODO");

        // Assignee lists their tasks
        JsonNode myTasks = call(get("/api/v1/users/me/tasks"), memberToken, null, 200);
        assertThat(myTasks.path("total").asInt()).isEqualTo(1);

        // Assignee updates progress to DONE (TC09)
        JsonNode progressed = call(patch("/api/v1/tasks/" + taskId + "/progress"), memberToken, Map.of(
                "status", "DONE",
                "progressPercent", 100,
                "progressNote", "Đã hoàn thành bản thiết kế và gửi link drive",
                "reportLink", "https://drive.google.com/example"
        ), 200);
        assertThat(progressed.path("status").asText()).isEqualTo("DONE");
        assertThat(progressed.path("progressPercent").asInt()).isEqualTo(100);

        // Admin/President verifies -> COMPLETED (TC10)
        JsonNode verified = call(patch("/api/v1/tasks/" + taskId + "/verify"), adminToken, null, 200);
        assertThat(verified.path("status").asText()).isEqualTo("COMPLETED");

        // Overdue task test
        JsonNode overdueCandidate = call(post("/api/v1/clubs/" + clubA + "/tasks"), adminToken, Map.of(
                "assigneeId", member.toString(),
                "title", "Nộp báo cáo tài chính",
                "priority", "HIGH",
                "deadline", OffsetDateTime.now().plusHours(1).toString()
        ), 201);
        UUID overdueId = id(overdueCandidate);
        db.update("UPDATE tasks SET deadline = now() - interval '2 hours' WHERE id = ?", overdueId);
        int marked = taskService.markOverdueTasks();
        assertThat(marked).isEqualTo(1);
    }

    @Test
    void internalChatChannelMessagesAndAiSummaryBotFlow() throws Exception {
        membership(member, clubA);

        JsonNode channel = call(post("/api/v1/clubs/" + clubA + "/channels"), adminToken, Map.of(
                "name", "ban-su-kien",
                "channelType", "CLUB_GENERAL"
        ), 201);
        UUID channelId = id(channel);

        JsonNode channels = call(get("/api/v1/clubs/" + clubA + "/channels"), memberToken, null, 200);
        assertThat(channels.size()).isEqualTo(1);

        // Member & admin exchange messages
        call(post("/api/v1/channels/" + channelId + "/messages"), memberToken, Map.of(
                "content", "Mình chốt tổ chức sự kiện vào ngày 25/11 tại hội trường tầng 5"
        ), 201);
        call(post("/api/v1/channels/" + channelId + "/messages"), adminToken, Map.of(
                "content", "Đồng ý, giao cho Quốc nhiệm vụ chuẩn bị âm thanh ánh sáng trước hạn thứ Sáu nhé"
        ), 201);

        // Plain members cannot spend AI calls; officers with chat.summarize can
        problem(post("/api/v1/channels/" + channelId + "/summaries"), memberToken, Map.of("messageLimit", 20), 403,
                "PERMISSION_DENIED");
        JsonNode summary = call(post("/api/v1/channels/" + channelId + "/summaries"), adminToken, Map.of(
                "messageLimit", 20,
                "postToChannel", true
        ), 201);
        assertThat(summary.path("messageCount").asInt()).isEqualTo(2);
        assertThat(summary.path("summary").asText()).isNotBlank();
        assertThat(summary.path("suggestedTasks").toString()).contains("nhiệm vụ");

        // Verify bot message was posted into the channel
        JsonNode messages = call(get("/api/v1/channels/" + channelId + "/messages"), memberToken, null, 200);
        assertThat(messages.path("total").asInt()).isEqualTo(3);
        assertThat(messages.at("/items/0/senderType").asText()).isEqualTo("AI_BOT");
    }

    @Test
    void broadcastNotificationAndMarkAllReadFlow() throws Exception {
        membership(member, clubA);

        JsonNode broadcast = call(post("/api/v1/clubs/" + clubA + "/notifications"), adminToken, Map.of(
                "title", "Thông báo họp khẩn toàn CLB",
                "message", "Tất cả thành viên có mặt lúc 19h00 tối nay"
        ), 201);
        assertThat(broadcast.path("recipientCount").asInt()).isEqualTo(1);

        JsonNode beforeReadAll = call(get("/api/v1/users/me/notifications"), memberToken, null, 200);
        assertThat(beforeReadAll.at("/items/0/read").asBoolean()).isFalse();

        call(patch("/api/v1/users/me/notifications/read-all"), memberToken, null, 204);

        JsonNode afterReadAll = call(get("/api/v1/users/me/notifications"), memberToken, null, 200);
        assertThat(afterReadAll.at("/items/0/read").asBoolean()).isTrue();
    }
}
