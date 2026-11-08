package com.vju.club.integration;

import com.fasterxml.jackson.databind.JsonNode;
import com.vju.club.service.TaskService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

import java.time.OffsetDateTime;
import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;

class PhaseThreeAcceptanceTest extends ApiIntegrationTest {
    @Autowired TaskService taskService;

    @Test
    void ctvRegistrationEventRoleEventTaskProgressReopenVerifyAndIsolation() throws Exception {
        UUID ctv = user("ctv@test.local");
        UUID ctvOther = user("ctv.other@test.local");
        UUID unregistered = user("unregistered@test.local");
        String ctvToken = token(ctv);
        String ctvOtherToken = token(ctvOther);
        membership(member, clubA);

        OffsetDateTime start = OffsetDateTime.now().plusDays(3);
        OffsetDateTime end = start.plusHours(4);
        OffsetDateTime regDeadline = start.minusHours(6);

        JsonNode event1 = call(post("/api/v1/clubs/" + clubA + "/events"), adminToken, Map.of(
                "title", "Ngày hội Văn hoá Việt - Nhật",
                "eventType", "CLUB_EVENT",
                "location", "Sảnh tầng 1 VJU",
                "startTime", start.toString(),
                "endTime", end.toString(),
                "registrationDeadline", regDeadline.toString(),
                "allowCtv", true,
                "status", "OPEN_REGISTRATION"
        ), 201);
        UUID event1Id = id(event1);

        JsonNode event2 = call(post("/api/v1/clubs/" + clubA + "/events"), adminToken, Map.of(
                "title", "Workshop Thiết kế Truyền thông",
                "eventType", "WORKSHOP",
                "startTime", start.plusDays(1).toString(),
                "endTime", end.plusDays(1).toString(),
                "registrationDeadline", regDeadline.plusDays(1).toString(),
                "allowCtv", true,
                "status", "OPEN_REGISTRATION"
        ), 201);
        UUID event2Id = id(event2);

        // CTV registers for event1; ctvOther registers for event2
        JsonNode reg = call(post("/api/v1/events/" + event1Id + "/registrations"), ctvToken,
                Map.of("note", "Đăng ký hỗ trợ hậu cần"), 201);
        UUID regId = id(reg);
        assertThat(reg.path("participantType").asText()).isEqualTo("CTV");
        assertThat(reg.path("status").asText()).isEqualTo("REGISTERED");

        call(post("/api/v1/events/" + event2Id + "/registrations"), ctvOtherToken,
                Map.of("note", "Đăng ký sự kiện 2"), 201);

        // CTV does NOT gain club membership or RBAC permissions
        assertThat(count("SELECT count(*) FROM memberships WHERE user_id = ? AND club_id = ?", ctv, clubA)).isZero();
        JsonNode ctvPerms = call(get("/api/v1/users/me/effective-permissions"), ctvToken, null, 200);
        assertThat(ctvPerms.size()).isZero();

        // Assign event role via PATCH /events/{eventId}/registrations/{registrationId} (PB-25.2)
        JsonNode updatedReg = call(patch("/api/v1/events/" + event1Id + "/registrations/" + regId), adminToken,
                Map.of("eventRole", "Điều phối Hậu cần", "note", "Phụ trách bàn check-in"), 200);
        assertThat(updatedReg.path("eventRole").asText()).isEqualTo("Điều phối Hậu cần");
        assertThat(count("SELECT count(*) FROM memberships WHERE user_id = ? AND club_id = ?", ctv, clubA)).isZero();
        assertThat(count("SELECT count(*) FROM audit_logs WHERE action = 'EVENT_REGISTRATION_UPDATED' AND resource_id = ?", event1Id))
                .isEqualTo(1);

        // Non-event club task cannot be assigned to CTV -> 409 ASSIGNEE_NOT_MEMBER
        problem(post("/api/v1/clubs/" + clubA + "/tasks"), adminToken, Map.of(
                "assigneeId", ctv.toString(),
                "title", "Việc nội bộ thường kỳ",
                "deadline", start.toString()
        ), 409, "ASSIGNEE_NOT_MEMBER");

        // Unregistered outsider cannot receive event task -> 409 ASSIGNEE_NOT_ELIGIBLE_FOR_EVENT_TASK
        problem(post("/api/v1/clubs/" + clubA + "/tasks"), adminToken, Map.of(
                "assigneeId", unregistered.toString(),
                "eventId", event1Id.toString(),
                "title", "Chuẩn bị standee",
                "deadline", start.toString()
        ), 409, "ASSIGNEE_NOT_ELIGIBLE_FOR_EVENT_TASK");

        // Event task deadline > event.endTime + 7 days rejected -> 400 TASK_DEADLINE_OUTSIDE_EVENT_WINDOW
        problem(post("/api/v1/clubs/" + clubA + "/tasks"), adminToken, Map.of(
                "assigneeId", ctv.toString(),
                "eventId", event1Id.toString(),
                "title", "Tổng kết quá muộn",
                "deadline", end.plusDays(8).toString()
        ), 400, "TASK_DEADLINE_OUTSIDE_EVENT_WINDOW");

        // Valid event task assigned to registered CTV (PB-27.1)
        JsonNode eventTask = call(post("/api/v1/clubs/" + clubA + "/tasks"), adminToken, Map.of(
                "assigneeId", ctv.toString(),
                "eventId", event1Id.toString(),
                "title", "Chuẩn bị bảng tên đại biểu",
                "priority", "HIGH",
                "deadline", end.plusDays(1).toString()
        ), 201);
        UUID eventTaskId = id(eventTask);

        // CTV of event1 can view their assigned task; CTV of event2 is blocked (403 PERMISSION_DENIED)
        JsonNode fetched = call(get("/api/v1/tasks/" + eventTaskId), ctvToken, null, 200);
        assertThat(fetched.path("eventId").asText()).isEqualTo(event1Id.toString());
        problem(get("/api/v1/tasks/" + eventTaskId), ctvOtherToken, null, 403, "PERMISSION_DENIED");

        // CTV updates progress TODO -> IN_PROGRESS -> DONE (PB-28.1, PB-28.2)
        call(patch("/api/v1/tasks/" + eventTaskId + "/progress"), ctvToken, Map.of(
                "status", "IN_PROGRESS",
                "progressPercent", 50,
                "progressNote", "Đã in xong 50%"
        ), 200);
        call(patch("/api/v1/tasks/" + eventTaskId + "/progress"), ctvToken, Map.of(
                "status", "DONE",
                "progressPercent", 100,
                "reportLink", "https://drive.google.com/standee"
        ), 200);

        // Manager reopens DONE -> IN_PROGRESS via PATCH /tasks/{taskId} (PB-27.2)
        JsonNode reopened = call(patch("/api/v1/tasks/" + eventTaskId), adminToken, Map.of(
                "status", "IN_PROGRESS",
                "priority", "MEDIUM"
        ), 200);
        assertThat(reopened.path("status").asText()).isEqualTo("IN_PROGRESS");
        assertThat(reopened.path("progressPercent").asInt()).isEqualTo(80);

        // CTV completes again and manager verifies -> COMPLETED
        call(patch("/api/v1/tasks/" + eventTaskId + "/progress"), ctvToken, Map.of(
                "status", "DONE",
                "progressPercent", 100
        ), 200);
        JsonNode verified = call(patch("/api/v1/tasks/" + eventTaskId + "/verify"), adminToken, null, 200);
        assertThat(verified.path("status").asText()).isEqualTo("COMPLETED");
    }

    @Test
    void registrationDeadlineBoundariesCancelReturnsOpenTaskAndEventCancelClosesOpenTasks() throws Exception {
        UUID ctv = user("ctv.boundary@test.local");
        String ctvToken = token(ctv);
        membership(member, clubA);

        OffsetDateTime start = OffsetDateTime.now().plusDays(2);
        OffsetDateTime end = start.plusHours(3);
        OffsetDateTime deadline = start.minusHours(2);

        // Internal-only event blocks CTV (403 CTV_NOT_ALLOWED)
        JsonNode internalEvent = call(post("/api/v1/clubs/" + clubA + "/events"), adminToken, Map.of(
                "title", "Họp nội bộ Ban chủ nhiệm",
                "eventType", "MEETING",
                "startTime", start.toString(),
                "endTime", end.toString(),
                "registrationDeadline", deadline.toString(),
                "allowCtv", false,
                "status", "OPEN_REGISTRATION"
        ), 201);
        problem(post("/api/v1/events/" + id(internalEvent) + "/registrations"), ctvToken,
                Map.of(), 403, "PERMISSION_DENIED");

        // Open CTV event
        JsonNode openEvent = call(post("/api/v1/clubs/" + clubA + "/events"), adminToken, Map.of(
                "title", "Triển lãm CLB mùa thu",
                "eventType", "CLUB_EVENT",
                "startTime", start.toString(),
                "endTime", end.toString(),
                "registrationDeadline", deadline.toString(),
                "allowCtv", true,
                "status", "OPEN_REGISTRATION"
        ), 201);
        UUID eventId = id(openEvent);

        call(post("/api/v1/events/" + eventId + "/registrations"), ctvToken, Map.of(), 201);
        call(post("/api/v1/events/" + eventId + "/registrations"), memberToken, Map.of(), 201);

        // Assign 1 task to CTV and 1 task to member
        UUID ctvTaskId = id(call(post("/api/v1/clubs/" + clubA + "/tasks"), adminToken, Map.of(
                "assigneeId", ctv.toString(),
                "eventId", eventId.toString(),
                "title", "Trực bàn thông tin CTV",
                "deadline", end.toString()
        ), 201));
        call(patch("/api/v1/tasks/" + ctvTaskId + "/progress"), ctvToken, Map.of(
                "status", "IN_PROGRESS",
                "progressPercent", 40
        ), 200);

        UUID memberTaskId = id(call(post("/api/v1/clubs/" + clubA + "/tasks"), adminToken, Map.of(
                "assigneeId", member.toString(),
                "eventId", eventId.toString(),
                "title", "Điều phối âm thanh hội trường",
                "deadline", end.toString()
        ), 201));

        // CTV cancels registration before deadline -> open task returns to assigner (admin) with status TODO
        call(patch("/api/v1/events/" + eventId + "/registrations/me/cancel"), ctvToken, null, 200);
        JsonNode returnedTask = call(get("/api/v1/tasks/" + ctvTaskId), adminToken, null, 200);
        assertThat(returnedTask.path("assigneeId").asText()).isEqualTo(admin.toString());
        assertThat(returnedTask.path("status").asText()).isEqualTo("TODO");
        assertThat(returnedTask.path("progressPercent").asInt()).isZero();

        // Move registration_deadline to 1 second ago -> register & cancel both blocked with 400 REGISTRATION_CLOSED
        db.update("UPDATE events SET registration_deadline = now() - interval '1 second' WHERE id = ?", eventId);
        problem(post("/api/v1/events/" + eventId + "/registrations"), ctvToken, Map.of(), 400, "REGISTRATION_CLOSED");
        problem(patch("/api/v1/events/" + eventId + "/registrations/me/cancel"), memberToken, null, 400, "REGISTRATION_CLOSED");

        // Cancel event -> open event tasks transition to CANCELLED while registration history remains intact
        JsonNode cancelledEvent = call(patch("/api/v1/clubs/" + clubA + "/events/" + eventId), adminToken,
                Map.of("status", "CANCELLED"), 200);
        assertThat(cancelledEvent.path("status").asText()).isEqualTo("CANCELLED");

        assertThat(call(get("/api/v1/tasks/" + memberTaskId), adminToken, null, 200).path("status").asText())
                .isEqualTo("CANCELLED");
        assertThat(call(get("/api/v1/tasks/" + ctvTaskId), adminToken, null, 200).path("status").asText())
                .isEqualTo("CANCELLED");

        JsonNode memberHistory = call(get("/api/v1/users/me/event-registrations"), memberToken, null, 200);
        assertThat(memberHistory.path("total").asInt()).isEqualTo(1);
        assertThat(memberHistory.path("items").get(0).path("eventStatus").asText()).isEqualTo("CANCELLED");
    }

    @Test
    void subtaskHierarchyDepartmentHeadScopeAndVerifyGuard() throws Exception {
        UUID deptHead = user("depthead@test.local");
        UUID deptMember = user("deptmember@test.local");
        UUID otherDeptMember = user("otherdept@test.local");
        String deptHeadToken = token(deptHead);
        String deptMemberToken = token(deptMember);

        UUID headMem = membership(deptHead, clubA);
        UUID m1 = membership(deptMember, clubA);
        UUID m2 = membership(otherDeptMember, clubA);
        assign(depA1, headMem);
        assign(depA1, m1);
        assign(depA2, m2);

        grant(deptHead, "task.view", "DEPARTMENT", null, depA1);
        grant(deptHead, "task.create", "DEPARTMENT", null, depA1);
        grant(deptHead, "task.update", "DEPARTMENT", null, depA1);
        grant(deptHead, "task.verify", "DEPARTMENT", null, depA1);

        OffsetDateTime parentDeadline = OffsetDateTime.now().plusDays(5);
        JsonNode parentTask = call(post("/api/v1/clubs/" + clubA + "/tasks"), adminToken, Map.of(
                "departmentId", depA1.toString(),
                "assigneeId", deptHead.toString(),
                "title", "Tổ chức truyền thông đợt tuyển Gen 5",
                "priority", "HIGH",
                "deadline", parentDeadline.toString()
        ), 201);
        UUID parentId = id(parentTask);

        // Subtask deadline > parent deadline rejected
        problem(post("/api/v1/clubs/" + clubA + "/tasks"), deptHeadToken, Map.of(
                "parentTaskId", parentId.toString(),
                "departmentId", depA1.toString(),
                "assigneeId", deptMember.toString(),
                "title", "Viết bài vượt hạn cha",
                "deadline", parentDeadline.plusHours(2).toString()
        ), 400, "SUBTASK_DEADLINE_EXCEEDS_PARENT");

        // DeptHead cannot assign to member outside depA1 -> 403 PERMISSION_SCOPE_MISMATCH
        problem(post("/api/v1/clubs/" + clubA + "/tasks"), deptHeadToken, Map.of(
                "parentTaskId", parentId.toString(),
                "departmentId", depA1.toString(),
                "assigneeId", otherDeptMember.toString(),
                "title", "Giao nhầm sang ban A2",
                "deadline", parentDeadline.minusDays(1).toString()
        ), 403, "PERMISSION_SCOPE_MISMATCH");

        // DeptHead creates valid subtask in depA1 (PB-26.2)
        JsonNode subtask = call(post("/api/v1/clubs/" + clubA + "/tasks"), deptHeadToken, Map.of(
                "parentTaskId", parentId.toString(),
                "departmentId", depA1.toString(),
                "assigneeId", deptMember.toString(),
                "title", "Thiết kế bộ banner tuyển thành viên",
                "deadline", parentDeadline.minusDays(1).toString()
        ), 201);
        UUID subtaskId = id(subtask);
        assertThat(subtask.path("parentTaskId").asText()).isEqualTo(parentId.toString());

        // >1 level subtask rejected -> 400 TASK_INVALID_HIERARCHY
        problem(post("/api/v1/clubs/" + clubA + "/tasks"), deptHeadToken, Map.of(
                "parentTaskId", subtaskId.toString(),
                "departmentId", depA1.toString(),
                "assigneeId", deptMember.toString(),
                "title", "Subtask cấp 2 không hợp lệ",
                "deadline", parentDeadline.minusDays(2).toString()
        ), 400, "TASK_INVALID_HIERARCHY");

        // Parent marked DONE while subtask is still TODO -> verify parent blocked with 409 SUBTASKS_INCOMPLETE
        call(patch("/api/v1/tasks/" + parentId + "/progress"), deptHeadToken, Map.of(
                "status", "DONE",
                "progressPercent", 100
        ), 200);
        problem(patch("/api/v1/tasks/" + parentId + "/verify"), adminToken, null, 409, "SUBTASKS_INCOMPLETE");

        // Reopen parent to IN_PROGRESS, then complete & verify subtask -> parent is NOT auto-marked DONE
        call(patch("/api/v1/tasks/" + parentId + "/progress"), deptHeadToken, Map.of(
                "status", "IN_PROGRESS",
                "progressPercent", 80
        ), 200);
        call(patch("/api/v1/tasks/" + subtaskId + "/progress"), deptMemberToken, Map.of(
                "status", "DONE",
                "progressPercent", 100
        ), 200);
        call(patch("/api/v1/tasks/" + subtaskId + "/verify"), deptHeadToken, null, 200);

        JsonNode parentAfterSubtask = call(get("/api/v1/tasks/" + parentId), deptHeadToken, null, 200);
        assertThat(parentAfterSubtask.path("status").asText()).isEqualTo("IN_PROGRESS");

        // Now parent marks DONE and admin verifies -> COMPLETED
        call(patch("/api/v1/tasks/" + parentId + "/progress"), deptHeadToken, Map.of(
                "status", "DONE",
                "progressPercent", 100
        ), 200);
        JsonNode verifiedParent = call(patch("/api/v1/tasks/" + parentId + "/verify"), adminToken, null, 200);
        assertThat(verifiedParent.path("status").asText()).isEqualTo("COMPLETED");
    }

    @Test
    void nonDestructiveOverdueAndFilteredSummaryParity() throws Exception {
        UUID mem = membership(member, clubA);
        assign(depA1, mem);

        UUID inProgressOverdueId = id(call(post("/api/v1/clubs/" + clubA + "/tasks"), adminToken, Map.of(
                "departmentId", depA1.toString(),
                "assigneeId", member.toString(),
                "title", "Báo cáo hậu cần đang làm dở",
                "priority", "HIGH",
                "deadline", OffsetDateTime.now().plusHours(3).toString()
        ), 201));
        call(patch("/api/v1/tasks/" + inProgressOverdueId + "/progress"), memberToken, Map.of(
                "status", "IN_PROGRESS",
                "progressPercent", 65
        ), 200);

        call(post("/api/v1/clubs/" + clubA + "/tasks"), adminToken, Map.of(
                "departmentId", depA1.toString(),
                "assigneeId", member.toString(),
                "title", "Chuẩn bị tài liệu cuộc họp tới",
                "priority", "MEDIUM",
                "deadline", OffsetDateTime.now().plusDays(4).toString()
        ), 201);

        // Expire deadline of the IN_PROGRESS task
        db.update("UPDATE tasks SET deadline = now() - interval '3 hours' WHERE id = ?", inProgressOverdueId);

        int firstRun = taskService.markOverdueTasks();
        int secondRun = taskService.markOverdueTasks();
        assertThat(firstRun).isEqualTo(1);
        assertThat(secondRun).isZero();

        // Status MUST remain IN_PROGRESS while overdue == true (PB-29)
        JsonNode detail = call(get("/api/v1/tasks/" + inProgressOverdueId), memberToken, null, 200);
        assertThat(detail.path("status").asText()).isEqualTo("IN_PROGRESS");
        assertThat(detail.path("overdue").asBoolean()).isTrue();

        // Summary endpoint matches listForClub with identical filters
        JsonNode summaryAll = call(get("/api/v1/clubs/" + clubA + "/tasks/summary")
                .param("departmentId", depA1.toString()), adminToken, null, 200);
        JsonNode listAll = call(get("/api/v1/clubs/" + clubA + "/tasks")
                .param("departmentId", depA1.toString()), adminToken, null, 200);
        assertThat(summaryAll.path("total").asLong()).isEqualTo(listAll.path("total").asLong()).isEqualTo(2L);
        assertThat(summaryAll.path("inProgressCount").asLong()).isEqualTo(1L);
        assertThat(summaryAll.path("todoCount").asLong()).isEqualTo(1L);
        assertThat(summaryAll.path("overdueCount").asLong()).isEqualTo(1L);

        JsonNode summaryOverdue = call(get("/api/v1/clubs/" + clubA + "/tasks/summary")
                .param("departmentId", depA1.toString())
                .param("overdue", "true"), adminToken, null, 200);
        JsonNode listOverdue = call(get("/api/v1/clubs/" + clubA + "/tasks")
                .param("departmentId", depA1.toString())
                .param("overdue", "true"), adminToken, null, 200);
        assertThat(summaryOverdue.path("total").asLong()).isEqualTo(listOverdue.path("total").asLong()).isEqualTo(1L);
    }
}
