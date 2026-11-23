package com.vju.club.integration;

import com.fasterxml.jackson.databind.JsonNode;
import org.junit.jupiter.api.Test;

import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;

class ApplicationInterviewApiTest extends ApiIntegrationTest {

    private String applications(UUID clubId) {
        return "/api/v1/clubs/" + clubId + "/applications";
    }

    private String interviewPath(UUID clubId, UUID applicationId) {
        return applications(clubId) + "/" + applicationId + "/interview";
    }

    private String remindPath(UUID clubId, UUID applicationId) {
        return interviewPath(clubId, applicationId) + "/remind";
    }

    private String formsPath(UUID clubId) {
        return "/api/v1/clubs/" + clubId + "/application-forms";
    }

    // =========================================================================
    // PB-76: Interview / First Meeting Scheduling & Automated Reminder
    // =========================================================================

    @Test
    void scheduleInterviewNotifiesApplicantAndReminderIsIdempotentPerHour() throws Exception {
        UUID applicant = user("interview-applicant@test.local");
        String applicantToken = token(applicant);

        UUID reviewer = user("interview-reviewer@test.local");
        String reviewerToken = token(reviewer);
        grant(reviewer, "application.review", "CLUB", clubA, null);

        JsonNode created = call(post(applications(clubA)), applicantToken,
                Map.of("message", "Em mong muốn tham gia CLB"), 201);
        UUID appId = id(created);

        // Remind before scheduling returns 409 INTERVIEW_NOT_SCHEDULED
        problem(post(remindPath(clubA, appId)), reviewerToken, null, 409, "INTERVIEW_NOT_SCHEDULED");

        // AC01 & AC02: Schedule interview saves fields and creates applicant notification
        OffsetDateTime slot1 = OffsetDateTime.now(ZoneOffset.UTC).plusDays(2).withNano(0);
        JsonNode scheduled = call(patch(interviewPath(clubA, appId)), reviewerToken, Map.of(
                "interviewAt", slot1.toString(),
                "interviewLocation", "Phòng B203 - Cơ sở Mỹ Đình",
                "interviewNote", "Mang theo laptop và đến trước 10 phút"
        ), 200);

        assertThat(scheduled.path("interviewAt").isTextual()).isTrue();
        assertThat(scheduled.path("interviewLocation").asText()).isEqualTo("Phòng B203 - Cơ sở Mỹ Đình");
        assertThat(scheduled.path("interviewNote").asText()).isEqualTo("Mang theo laptop và đến trước 10 phút");
        assertThat(scheduled.path("interviewReminderSentAt").isNull()).isTrue();

        // Applicant sees interview fields in both summary list and detail endpoints
        JsonNode myList = call(get("/api/v1/users/me/applications"), applicantToken, null, 200);
        assertThat(myList.at("/items/0/interviewLocation").asText()).isEqualTo("Phòng B203 - Cơ sở Mỹ Đình");
        assertThat(myList.at("/items/0/interviewAt").isTextual()).isTrue();

        JsonNode myDetail = call(get("/api/v1/users/me/applications/" + appId), applicantToken, null, 200);
        assertThat(myDetail.path("interviewLocation").asText()).isEqualTo("Phòng B203 - Cơ sở Mỹ Đình");
        assertThat(myDetail.path("interviewNote").asText()).isEqualTo("Mang theo laptop và đến trước 10 phút");

        JsonNode notifsAfterSchedule = call(get("/api/v1/users/me/notifications"), applicantToken, null, 200);
        assertThat(notifsAfterSchedule.path("total").asInt()).isEqualTo(1);
        assertThat(notifsAfterSchedule.at("/items/0/referenceType").asText()).isEqualTo("CLUB_APPLICATION");
        assertThat(notifsAfterSchedule.at("/items/0/referenceId").asText()).isEqualTo(appId.toString());
        assertThat(notifsAfterSchedule.at("/items/0/message").asText())
                .contains("/applications?applicationId=" + appId);

        // AC03: First reminder succeeds, updates interviewReminderSentAt, and creates 1 reminder notification
        JsonNode reminded1 = call(post(remindPath(clubA, appId)), reviewerToken, null, 200);
        assertThat(reminded1.path("interviewReminderSentAt").isTextual()).isTrue();
        assertThat(count("SELECT count(*) FROM notifications WHERE user_id = ?", applicant)).isEqualTo(2);

        // Duplicate reminder within the same hour is idempotent — no duplicate notification spammed
        JsonNode reminded2 = call(post(remindPath(clubA, appId)), reviewerToken, null, 200);
        assertThat(reminded2.path("interviewReminderSentAt").isTextual()).isTrue();
        assertThat(count("SELECT count(*) FROM notifications WHERE user_id = ?", applicant)).isEqualTo(2);

        // Rescheduling to a new slot resets interviewReminderSentAt and notifies applicant of the new slot
        OffsetDateTime slot2 = slot1.plusDays(1);
        JsonNode rescheduled = call(patch(interviewPath(clubA, appId)), reviewerToken, Map.of(
                "interviewAt", slot2.toString(),
                "interviewLocation", "https://meet.google.com/vju-club-meet",
                "interviewNote", "Đổi sang gặp mặt online"
        ), 200);
        assertThat(rescheduled.path("interviewReminderSentAt").isNull()).isTrue();
        assertThat(rescheduled.path("interviewLocation").asText()).isEqualTo("https://meet.google.com/vju-club-meet");
        assertThat(count("SELECT count(*) FROM notifications WHERE user_id = ?", applicant)).isEqualTo(3);

        // First meeting can also be scheduled after approval (APPROVED status is allowed)
        call(post(applications(clubA) + "/" + appId + "/approve"), adminToken, Map.of("reviewNote", "Chào mừng"), 200);
        OffsetDateTime firstMeeting = slot2.plusDays(2);
        JsonNode approvedMeeting = call(patch(interviewPath(clubA, appId)), reviewerToken, Map.of(
                "interviewAt", firstMeeting.toString(),
                "interviewLocation", "Hội trường A1",
                "interviewNote", "Buổi gặp mặt thành viên mới (First Meeting)"
        ), 200);
        assertThat(approvedMeeting.path("status").asText()).isEqualTo("APPROVED");
        assertThat(approvedMeeting.path("interviewLocation").asText()).isEqualTo("Hội trường A1");
    }

    @Test
    void interviewSchedulingBlocksUnauthorizedMembersAndTerminalRejectedOrCancelledApplications() throws Exception {
        UUID applicant = user("blocked-interview-applicant@test.local");
        String applicantToken = token(applicant);

        JsonNode appA = call(post(applications(clubA)), applicantToken, Map.of("message", "Apply A"), 201);
        UUID appAId = id(appA);
        JsonNode appB = call(post(applications(clubB)), applicantToken, Map.of("message", "Apply B"), 201);
        UUID appBId = id(appB);

        OffsetDateTime slot = OffsetDateTime.now(ZoneOffset.UTC).plusDays(3).withNano(0);
        Map<String, Object> payload = Map.of(
                "interviewAt", slot.toString(),
                "interviewLocation", "Phòng 301"
        );

        // AC04: Unauthorized regular member blocked with 403
        problem(patch(interviewPath(clubA, appAId)), memberToken, payload, 403, "PERMISSION_DENIED");
        problem(post(remindPath(clubA, appAId)), memberToken, null, 403, "PERMISSION_DENIED");

        // Reviewer granted in clubA only is blocked on clubB (cross-club)
        UUID clubAReviewer = user("cluba-reviewer@test.local");
        String clubAReviewerToken = token(clubAReviewer);
        grant(clubAReviewer, "application.review", "CLUB", clubA, null);
        problem(patch(interviewPath(clubB, appBId)), clubAReviewerToken, payload, 403, "PERMISSION_DENIED");
        problem(post(remindPath(clubB, appBId)), clubAReviewerToken, null, 403, "PERMISSION_DENIED");

        // REJECTED application blocks both schedule and remind with 409 INVALID_APPLICATION_STATUS
        call(post(applications(clubA) + "/" + appAId + "/reject"), adminToken, Map.of("reviewNote", "Hẹn đợt sau"), 200);
        problem(patch(interviewPath(clubA, appAId)), clubAReviewerToken, payload, 409, "INVALID_APPLICATION_STATUS");
        problem(post(remindPath(clubA, appAId)), clubAReviewerToken, null, 409, "INVALID_APPLICATION_STATUS");

        // CANCELLED application blocks both schedule and remind with 409 INVALID_APPLICATION_STATUS
        call(patch("/api/v1/users/me/applications/" + appBId + "/cancel"), applicantToken, null, 200);
        problem(patch(interviewPath(clubB, appBId)), adminToken, payload, 409, "INVALID_APPLICATION_STATUS");
        problem(post(remindPath(clubB, appBId)), adminToken, null, 409, "INVALID_APPLICATION_STATUS");
    }

    // =========================================================================
    // PB-88 AC04: 4 Recruitment Posting Cases
    // =========================================================================

    @Test
    void recruitmentPostingCoversAllFourCasesFromPb88Ac04() throws Exception {
        // Case 1: BCN with application.manage_form in clubA can create, update & list recruitment postings
        UUID bcn = user("bcn-cluba@test.local");
        String bcnToken = token(bcn);
        grant(bcn, "application.manage_form", "CLUB", clubA, null);

        JsonNode bcnForm = call(post(formsPath(clubA)), bcnToken, Map.of(
                "title", "Tuyển thành viên Kỳ Thu",
                "description", "Đợt tuyển chính thức của CLB A",
                "status", "OPEN",
                "isDefault", true
        ), 201);
        UUID bcnFormId = id(bcnForm);
        assertThat(bcnForm.path("status").asText()).isEqualTo("OPEN");

        JsonNode updatedByBcn = call(put(formsPath(clubA) + "/" + bcnFormId), bcnToken, Map.of(
                "title", "Tuyển thành viên Kỳ Thu (Cập nhật)",
                "status", "OPEN",
                "isDefault", true
        ), 200);
        assertThat(updatedByBcn.path("title").asText()).isEqualTo("Tuyển thành viên Kỳ Thu (Cập nhật)");

        // Case 2: Delegated Dept Head with application.manage_form in clubA ONLY — allowed in clubA, blocked 403 in clubB
        UUID deptHead = user("dept-head-cluba@test.local");
        String deptHeadToken = token(deptHead);
        UUID deptHeadMembership = membership(deptHead, clubA);
        assign(depA1, deptHeadMembership);
        grant(deptHead, "application.manage_form", "CLUB", clubA, null);

        JsonNode deptHeadForm = call(post(formsPath(clubA)), deptHeadToken, Map.of(
                "title", "Tuyển CTV Ban Chuyên Môn A1",
                "status", "OPEN"
        ), 201);
        UUID deptHeadFormId = id(deptHeadForm);
        call(get(formsPath(clubA)), deptHeadToken, null, 200);

        // Cross-club blocked with 403 PERMISSION_DENIED
        problem(post(formsPath(clubB)), deptHeadToken, Map.of(
                "title", "Đơn trái phép ở CLB B",
                "status", "OPEN"
        ), 403, "PERMISSION_DENIED");
        problem(get(formsPath(clubB)), deptHeadToken, null, 403, "PERMISSION_DENIED");

        // Case 3: Regular Member / Student blocked with 403 PERMISSION_DENIED
        UUID regularMember = user("regular-member@test.local");
        String regularMemberToken = token(regularMember);
        membership(regularMember, clubA);

        problem(post(formsPath(clubA)), regularMemberToken, Map.of(
                "title", "Thành viên thường tự đăng",
                "status", "OPEN"
        ), 403, "PERMISSION_DENIED");
        problem(put(formsPath(clubA) + "/" + deptHeadFormId), regularMemberToken, Map.of(
                "title", "Sửa trái phép",
                "status", "CLOSED"
        ), 403, "PERMISSION_DENIED");
        problem(delete(formsPath(clubA) + "/" + deptHeadFormId), regularMemberToken, null, 403, "PERMISSION_DENIED");
        problem(get(formsPath(clubA)), regularMemberToken, null, 403, "PERMISSION_DENIED");

        // Case 4: INACTIVE club and CLOSED / expired form deadline block new postings & applications cleanly
        UUID inactiveClub = club("INACT", "INACTIVE");
        UUID student = user("case4-student@test.local");
        String studentToken = token(student);

        // 4a. INACTIVE club blocks both recruitment posting creation and student application
        problem(post(formsPath(inactiveClub)), adminToken, Map.of(
                "title", "Tuyển dụng CLB ngưng hoạt động",
                "status", "OPEN"
        ), 409, "CLUB_INACTIVE");
        problem(post(applications(inactiveClub)), studentToken, Map.of(
                "message", "Em muốn tham gia CLB đã ngừng hoạt động"
        ), 409, "CLUB_INACTIVE");

        // 4b. CLOSED form blocks applications cleanly
        UUID clubC = club("CLBC");
        JsonNode closedForm = call(post(formsPath(clubC)), adminToken, Map.of(
                "title", "Đợt tuyển đã đóng",
                "status", "CLOSED",
                "isDefault", true
        ), 201);
        problem(post(applications(clubC)), studentToken, Map.of(
                "formId", id(closedForm),
                "message", "Nộp vào form đã đóng"
        ), 409, "APPLICATION_FORM_CLOSED");
        problem(post(applications(clubC)), studentToken, Map.of(
                "message", "Nộp không chọn form khi CLB chỉ có form CLOSED"
        ), 409, "APPLICATION_FORM_CLOSED");

        // 4c. Expired form deadline (closeAt in the past) blocks applications cleanly
        OffsetDateTime now = OffsetDateTime.now(ZoneOffset.UTC).withNano(0);
        JsonNode expiredForm = call(post(formsPath(clubC)), adminToken, Map.of(
                "title", "Đợt tuyển hết hạn",
                "status", "OPEN",
                "openAt", now.minusDays(5).toString(),
                "closeAt", now.minusHours(1).toString(),
                "isDefault", true
        ), 201);
        problem(post(applications(clubC)), studentToken, Map.of(
                "formId", id(expiredForm),
                "message", "Nộp sau hạn chót"
        ), 409, "APPLICATION_FORM_CLOSED");
    }
}
