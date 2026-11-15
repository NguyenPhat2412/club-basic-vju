package com.vju.club.integration;

import com.fasterxml.jackson.databind.JsonNode;
import com.vju.club.service.TaskService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

import java.time.OffsetDateTime;
import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;

/**
 * Sprint 3 - Part 2/2 Acceptance Tests
 * Phụ trách: Đoàn Kinh Quốc (Backend Dev, Database)
 *
 * Kiểm thử toàn diện các User Story & Acceptance Criteria:
 * - PB-26.1: Khởi tạo nhiệm vụ cho hoạt động CLB hoặc sự kiện (DoD-P3-08)
 * - PB-26.2: Phân cấp Task con (Subtask), giới hạn 1 tầng và ràng buộc cha/con (DoD-P3-08)
 * - PB-27.1: Giao việc & đổi người phụ trách, kiểm soát phạm vi thành viên vs CTV sự kiện (DoD-P3-08, DoD-SYS-06)
 * - PB-27.2: Thiết lập hạn chót, mức độ ưu tiên và quy tắc thời hạn sự kiện (DoD-P3-08)
 * - PB-28.1, PB-28.2: Người nhận việc tra cứu, cập nhật tiến độ %, link báo cáo và mở lại task DONE (DoD-P3-08)
 * - PB-29: Quản lý & Lọc tiến độ nhiệm vụ quá hạn không phá hủy trạng thái thực thi (DoD-P3-08, DoD-SYS-08)
 * - PB-45: Kiểm thử luồng E2E Member/CTV nhận việc, cập nhật tiến độ & ca biên deadline
 */
class SprintThreeTaskAcceptanceTest extends ApiIntegrationTest {

    @Autowired
    private TaskService taskService;

    private String clubTasks(UUID clubId) {
        return "/api/v1/clubs/" + clubId + "/tasks";
    }

    private String clubEvents(UUID clubId) {
        return "/api/v1/clubs/" + clubId + "/events";
    }

    private String eventRegistrations(UUID eventId) {
        return "/api/v1/events/" + eventId + "/registrations";
    }

    @Test
    @DisplayName("PB-26.1, PB-26.2 (DoD-P3-08): Task creation, subtask hierarchy depth limit and deadline boundary")
    void testTaskCreationAndSubtaskHierarchyConstraints() throws Exception {
        UUID officer = user("task.officer@vju.test");
        UUID memberUser = user("task.member@vju.test");
        String memberToken = token(memberUser);

        membership(officer, clubA);
        membership(memberUser, clubA);

        OffsetDateTime parentDeadline = OffsetDateTime.now().plusDays(4);

        // 1. PB-26.1: Create parent task
        JsonNode parentTask = call(post(clubTasks(clubA)), adminToken, Map.of(
                "title", "Tổ chức Chương trình Gala Mùa đông",
                "description", "Lên kế hoạch tổng thể và điều phối các ban",
                "priority", "HIGH",
                "deadline", parentDeadline.toString(),
                "assigneeId", officer.toString()
        ), 201);
        UUID parentTaskId = id(parentTask);
        assertThat(parentTask.path("status").asText()).isEqualTo("TODO");
        assertThat(parentTask.path("parentTaskId").isNull()).isTrue();

        // 2. Subtask deadline > parent task deadline -> 400 SUBTASK_DEADLINE_EXCEEDS_PARENT
        problem(post(clubTasks(clubA)), adminToken, Map.of(
                "title", "Task con vượt deadline cha",
                "priority", "MEDIUM",
                "deadline", parentDeadline.plusDays(1).toString(),
                "assigneeId", memberUser.toString(),
                "parentTaskId", parentTaskId.toString()
        ), 400, "SUBTASK_DEADLINE_EXCEEDS_PARENT");

        // 3. PB-26.2: Create valid subtask (1 level depth)
        JsonNode subtask = call(post(clubTasks(clubA)), adminToken, Map.of(
                "title", "Chuẩn bị backdrop sân khấu Gala",
                "description", "Thiết kế và in backdrop khổ 6x3m",
                "priority", "MEDIUM",
                "deadline", parentDeadline.minusDays(1).toString(),
                "assigneeId", memberUser.toString(),
                "parentTaskId", parentTaskId.toString()
        ), 201);
        UUID subtaskId = id(subtask);
        assertThat(subtask.path("parentTaskId").asText()).isEqualTo(parentTaskId.toString());

        // 4. Nested subtask of a subtask (depth > 1) -> 400 TASK_INVALID_HIERARCHY
        problem(post(clubTasks(clubA)), adminToken, Map.of(
                "title", "Task cháu (vượt quá 1 cấp)",
                "priority", "LOW",
                "deadline", parentDeadline.minusDays(2).toString(),
                "assigneeId", memberUser.toString(),
                "parentTaskId", subtaskId.toString()
        ), 400, "TASK_INVALID_HIERARCHY");

        // 5. Parent task from another club -> 404 PARENT_TASK_NOT_FOUND
        problem(post(clubTasks(clubB)), adminToken, Map.of(
                "title", "Task con sai CLB",
                "deadline", parentDeadline.minusDays(1).toString(),
                "assigneeId", memberUser.toString(),
                "parentTaskId", parentTaskId.toString()
        ), 404, "PARENT_TASK_NOT_FOUND");
    }

    @Test
    @DisplayName("PB-27.1, PB-27.2 (DoD-P3-08, DoD-SYS-06): Assignee delegation, CTV event eligibility and event window constraints")
    void testAssigneeDelegationAndScopeEnforcement() throws Exception {
        UUID ctvUser = user("ctv.task@vju.test");
        UUID outsiderUser = user("outsider.task@vju.test");
        UUID clubMember = user("member.task@vju.test");
        String ctvToken = token(ctvUser);

        membership(clubMember, clubA);

        OffsetDateTime eventStart = OffsetDateTime.now().plusDays(3);
        OffsetDateTime eventEnd = eventStart.plusHours(4);
        OffsetDateTime regDeadline = eventStart.minusHours(6);

        // Create CTV open event
        JsonNode event = call(post(clubEvents(clubA)), adminToken, Map.of(
                "title", "Ngày hội Công nghệ Thông tin IT Day",
                "eventType", "CLUB_EVENT",
                "startTime", eventStart.toString(),
                "endTime", eventEnd.toString(),
                "registrationDeadline", regDeadline.toString(),
                "allowCtv", true,
                "status", "OPEN_REGISTRATION"
        ), 201);
        UUID eventId = id(event);

        // CTV registers for event
        call(post(eventRegistrations(eventId)), ctvToken, Map.of("note", "CTV hỗ trợ kỹ thuật"), 201);

        // 1. General non-event task CANNOT be assigned to CTV -> 409 ASSIGNEE_NOT_MEMBER
        problem(post(clubTasks(clubA)), adminToken, Map.of(
                "title", "Quét dọn văn phòng CLB thường kỳ",
                "deadline", eventStart.toString(),
                "assigneeId", ctvUser.toString()
        ), 409, "ASSIGNEE_NOT_MEMBER");

        // 2. Event task cannot be assigned to unregistered outsider -> 409 ASSIGNEE_NOT_ELIGIBLE_FOR_EVENT_TASK
        problem(post(clubTasks(clubA)), adminToken, Map.of(
                "title", "Trực quầy check-in IT Day",
                "eventId", eventId.toString(),
                "deadline", eventEnd.toString(),
                "assigneeId", outsiderUser.toString()
        ), 409, "ASSIGNEE_NOT_ELIGIBLE_FOR_EVENT_TASK");

        // 3. Event task deadline > eventEnd + 7 days -> 400 TASK_DEADLINE_OUTSIDE_EVENT_WINDOW
        problem(post(clubTasks(clubA)), adminToken, Map.of(
                "title", "Báo cáo tổng kết quá hạn cho phép",
                "eventId", eventId.toString(),
                "deadline", eventEnd.plusDays(8).toString(),
                "assigneeId", ctvUser.toString()
        ), 400, "TASK_DEADLINE_OUTSIDE_EVENT_WINDOW");

        // 4. PB-27.1: Valid event task assigned to registered CTV
        JsonNode ctvTask = call(post(clubTasks(clubA)), adminToken, Map.of(
                "title", "Hỗ trợ lắp đặt thiết bị mạng IT Day",
                "description", "Cài đặt router và kiểm tra wifi hội trường",
                "eventId", eventId.toString(),
                "priority", "HIGH",
                "deadline", eventEnd.plusDays(1).toString(),
                "assigneeId", ctvUser.toString()
        ), 201);
        UUID ctvTaskId = id(ctvTask);
        assertThat(ctvTask.path("assignee").path("id").asText()).isEqualTo(ctvUser.toString());
        assertThat(ctvTask.path("eventId").asText()).isEqualTo(eventId.toString());

        // 5. PB-27.2: Reassign task to club member
        JsonNode reassigned = call(patch("/api/v1/tasks/" + ctvTaskId), adminToken, Map.of(
                "assigneeId", clubMember.toString(),
                "priority", "URGENT"
        ), 200);
        assertThat(reassigned.path("assignee").path("id").asText()).isEqualTo(clubMember.toString());
        assertThat(reassigned.path("priority").asText()).isEqualTo("URGENT");
    }

    @Test
    @DisplayName("PB-28.1, PB-28.2, PB-58 (DoD-P3-08): Assignee progress reporting, links, security check, and reopen DONE workflow")
    void testAssigneeProgressTrackingAndReopenWorkflow() throws Exception {
        UUID assignee = user("assignee.progress@vju.test");
        UUID otherMember = user("other.member@vju.test");
        String assigneeToken = token(assignee);
        String otherMemberToken = token(otherMember);

        membership(assignee, clubA);
        membership(otherMember, clubA);

        OffsetDateTime deadline = OffsetDateTime.now().plusDays(2);

        JsonNode task = call(post(clubTasks(clubA)), adminToken, Map.of(
                "title", "Viết bài truyền thông Fanpage",
                "description", "Soạn bài viết và chọn ảnh minh họa",
                "priority", "MEDIUM",
                "deadline", deadline.toString(),
                "assigneeId", assignee.toString()
        ), 201);
        UUID taskId = id(task);

        // PB-28.1: Assignee lists their tasks
        JsonNode myTasks = call(get("/api/v1/users/me/tasks"), assigneeToken, null, 200);
        assertThat(myTasks.path("total").asInt()).isGreaterThanOrEqualTo(1);

        // Non-assignee member cannot update progress -> 403 PERMISSION_DENIED
        problem(patch("/api/v1/tasks/" + taskId + "/progress"), otherMemberToken, Map.of(
                "status", "IN_PROGRESS",
                "progressPercent", 30
        ), 403, "PERMISSION_DENIED");

        // PB-28.2: Assignee updates progress to IN_PROGRESS (50%)
        JsonNode inProgress = call(patch("/api/v1/tasks/" + taskId + "/progress"), assigneeToken, Map.of(
                "status", "IN_PROGRESS",
                "progressPercent", 50,
                "progressNote", "Đã viết xong bản thảo đợt 1"
        ), 200);
        assertThat(inProgress.path("status").asText()).isEqualTo("IN_PROGRESS");
        assertThat(inProgress.path("progressPercent").asInt()).isEqualTo(50);

        // PB-28.2: Assignee updates progress to DONE (100%) with reportLink
        JsonNode doneTask = call(patch("/api/v1/tasks/" + taskId + "/progress"), assigneeToken, Map.of(
                "status", "DONE",
                "progressPercent", 100,
                "progressNote", "Đã hoàn thành bài viết và bàn giao link",
                "reportLink", "https://docs.google.com/document/d/vju-post-1"
        ), 200);
        assertThat(doneTask.path("status").asText()).isEqualTo("DONE");
        assertThat(doneTask.path("progressPercent").asInt()).isEqualTo(100);
        assertThat(doneTask.path("reportLink").asText()).isEqualTo("https://docs.google.com/document/d/vju-post-1");

        // PB-58 / PB-27.2: Officer reopens DONE task back to IN_PROGRESS
        JsonNode reopened = call(patch("/api/v1/tasks/" + taskId), adminToken, Map.of(
                "status", "IN_PROGRESS",
                "priority", "HIGH"
        ), 200);
        assertThat(reopened.path("status").asText()).isEqualTo("IN_PROGRESS");
        assertThat(reopened.path("priority").asText()).isEqualTo("HIGH");

        // Assignee updates back to DONE and Officer verifies -> COMPLETED
        call(patch("/api/v1/tasks/" + taskId + "/progress"), assigneeToken, Map.of(
                "status", "DONE",
                "progressPercent", 100
        ), 200);
        JsonNode verified = call(patch("/api/v1/tasks/" + taskId + "/verify"), adminToken, null, 200);
        assertThat(verified.path("status").asText()).isEqualTo("COMPLETED");
    }

    @Test
    @DisplayName("PB-29 (DoD-P3-08, DoD-SYS-08): Overdue detection preserves execution state, summary counters and filtering")
    void testOverdueTaskDetectionAndSummaryReporting() throws Exception {
        UUID worker = user("worker.overdue@vju.test");
        membership(worker, clubA);

        // Create task with past deadline using DB update
        JsonNode task1 = call(post(clubTasks(clubA)), adminToken, Map.of(
                "title", "Nhiệm vụ kiểm thử quá hạn",
                "priority", "HIGH",
                "deadline", OffsetDateTime.now().plusHours(2).toString(),
                "assigneeId", worker.toString()
        ), 201);
        UUID task1Id = id(task1);

        // Set progress to IN_PROGRESS (60%)
        call(patch("/api/v1/tasks/" + task1Id + "/progress"), token(worker), Map.of(
                "status", "IN_PROGRESS",
                "progressPercent", 60
        ), 200);

        // Force deadline to 3 hours ago in DB
        db.update("UPDATE tasks SET deadline = now() - interval '3 hours' WHERE id = ?", task1Id);

        // PB-29 / DoD-P3-08: Run markOverdueTasks()
        int markedCount = taskService.markOverdueTasks();
        assertThat(markedCount).isGreaterThanOrEqualTo(1);

        // Verify NON-DESTRUCTIVE overdue status: status remains IN_PROGRESS (not replaced by OVERDUE)
        JsonNode refreshedTask = call(get("/api/v1/tasks/" + task1Id), token(worker), null, 200);
        assertThat(refreshedTask.path("status").asText()).isEqualTo("IN_PROGRESS");
        assertThat(refreshedTask.path("progressPercent").asInt()).isEqualTo(60);
        assertThat(refreshedTask.path("overdue").asBoolean()).isTrue();

        // Filter overdue tasks via GET /clubs/{clubId}/tasks?overdue=true
        JsonNode overdueList = call(get(clubTasks(clubA) + "?overdue=true"), adminToken, null, 200);
        assertThat(overdueList.path("total").asInt()).isGreaterThanOrEqualTo(1);

        // Task Summary metrics via GET /clubs/{clubId}/tasks/summary
        JsonNode summary = call(get(clubTasks(clubA) + "/summary"), adminToken, null, 200);
        assertThat(summary.path("totalTasks").asInt()).isGreaterThanOrEqualTo(1);
        assertThat(summary.path("overdueCount").asInt()).isGreaterThanOrEqualTo(1);
    }
}
