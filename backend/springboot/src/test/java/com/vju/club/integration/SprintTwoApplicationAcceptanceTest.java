package com.vju.club.integration;

import com.fasterxml.jackson.databind.JsonNode;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;

/**
 * Sprint 2 - Part 2/3 Acceptance Tests
 * Phụ trách: Đoàn Kinh Quốc (Backend Dev, Database)
 * 
 * Kiểm thử toàn diện các User Story & Acceptance Criteria:
 * - PB-18: Nộp đơn đăng ký CLB & Ràng buộc hồ sơ (TC-PB-18-01..04)
 * - PB-19.1: Xem danh sách & Chi tiết đơn cá nhân, bảo vệ quyền riêng tư (TC-PB-19.1-01..04)
 * - PB-19.2: Cập nhật & Hủy đơn PENDING, cấm xóa cứng (TC-PB-19.2-01..04)
 * - PB-20.1: Xem & Lọc danh sách đơn cấp CLB, kiểm tra scope (TC-PB-20.1-01..04)
 * - PB-20.2: Duyệt đơn nguyên tử (Membership + Phân ban), gửi thông báo in-app (TC-PB-20.2-01..04)
 * - PB-20.3: Từ chối đơn, thời gian chờ nộp lại, gửi thông báo in-app (TC-PB-20.3-01..04)
 */
class SprintTwoApplicationAcceptanceTest extends ApiIntegrationTest {

    private String clubApplications(UUID clubId) {
        return "/api/v1/clubs/" + clubId + "/applications";
    }

    @Test
    @DisplayName("PB-18 (TC-PB-18-01..04): Submit application to active club, prevent duplicates, members & inactive clubs")
    void testSubmitClubApplicationAndEnforceConstraints() throws Exception {
        UUID student = user("pb18-applicant@vju.test");
        String studentToken = token(student);

        // TC-PB-18-01: Submit application successfully to active club
        JsonNode app1 = call(post(clubApplications(clubA)), studentToken, Map.of(
                "preferredDepartmentId", depA1,
                "applicantPhone", "0987654321",
                "facultyMajor", "Công nghệ thông tin Nhật Bản",
                "academicYear", "K8",
                "message", "Em muốn ứng tuyển vào Ban Chuyên môn CLB"
        ), 201);
        UUID app1Id = id(app1);
        assertThat(app1.path("status").asText()).isEqualTo("PENDING");
        assertThat(app1.path("preferredDepartmentId").asText()).isEqualTo(depA1.toString());
        assertThat(app1.path("applicantPhone").asText()).isEqualTo("0987654321");

        // TC-PB-18-02: Prevent duplicate PENDING applications to the same club
        problem(post(clubApplications(clubA)), studentToken, Map.of(
                "message", "Nộp thêm đơn thứ hai"
        ), 409, "APPLICATION_ALREADY_PENDING");

        // TC-PB-18-03: Prevent application if applicant is already an active club member
        UUID currentMember = user("pb18-already-member@vju.test");
        db.update("INSERT INTO memberships (id, user_id, club_id, status, joined_at) VALUES (?, ?, ?, 'ACTIVE', now())",
                UUID.randomUUID(), currentMember, clubA);
        problem(post(clubApplications(clubA)), token(currentMember), Map.of(
                "message", "Đã là thành viên nhưng thử nộp đơn lại"
        ), 409, "ALREADY_CLUB_MEMBER");

        // TC-PB-18-04: Prevent application to INACTIVE club
        UUID inactiveClub = club("INACTAPP", "INACTIVE");
        problem(post(clubApplications(inactiveClub)), studentToken, Map.of(
                "message", "Nộp đơn vào CLB đã đóng cửa"
        ), 409, "CLUB_INACTIVE");
    }

    @Test
    @DisplayName("PB-19.1 (TC-PB-19.1-01..04): Student tracks personal applications with pagination & strict privacy protection")
    void testStudentTrackPersonalApplicationsAndPrivacy() throws Exception {
        UUID applicant = user("pb191-student@vju.test");
        String applicantToken = token(applicant);

        // Submit 2 applications to clubA and clubB
        JsonNode appA = call(post(clubApplications(clubA)), applicantToken, Map.of("message", "Apply A"), 201);
        JsonNode appB = call(post(clubApplications(clubB)), applicantToken, Map.of("message", "Apply B"), 201);
        UUID appAId = id(appA);

        // Reviewer approves appA with reviewNote and internal confidential internalNote
        grant(admin, "application.approve", "CLUB", clubA, null);
        call(post(clubApplications(clubA) + "/" + appAId + "/approve"), adminToken, Map.of(
                "reviewNote", "Chào mừng bạn đến với CLB!",
                "internalNote", "Bí mật nội bộ BCN: Điểm phỏng vấn 9.5/10"
        ), 200);

        // TC-PB-19.1-01: Student lists personal applications with status filtering
        JsonNode myAppsAll = call(get("/api/v1/users/me/applications"), applicantToken, null, 200);
        assertThat(myAppsAll.path("total").asInt()).isGreaterThanOrEqualTo(2);

        JsonNode myAppsPending = call(get("/api/v1/users/me/applications").param("status", "PENDING"),
                applicantToken, null, 200);
        assertThat(myAppsPending.path("total").asInt()).isEqualTo(1);
        assertThat(myAppsPending.at("/items/0/id").asText()).isEqualTo(id(appB).toString());

        // TC-PB-19.1-02 & TC-PB-19.1-03: Applicant detail view strictly redacts internalNote & reviewedBy
        JsonNode myAppADetail = call(get("/api/v1/users/me/applications/" + appAId), applicantToken, null, 200);
        assertThat(myAppADetail.path("status").asText()).isEqualTo("APPROVED");
        assertThat(myAppADetail.path("reviewNote").asText()).isEqualTo("Chào mừng bạn đến với CLB!");
        assertThat(myAppADetail.path("internalNote").isNull()).isTrue();
        assertThat(myAppADetail.path("reviewedBy").isNull()).isTrue();

        // But club reviewer DOES see internalNote and reviewedBy
        JsonNode reviewerView = call(get(clubApplications(clubA) + "/" + appAId), adminToken, null, 200);
        assertThat(reviewerView.path("internalNote").asText()).contains("Bí mật nội bộ BCN");
        assertThat(reviewerView.path("reviewedBy").asText()).isEqualTo(admin.toString());

        // TC-PB-19.1-04: Other students cannot access this application via personal endpoint
        UUID otherStudent = user("pb191-stranger@vju.test");
        problem(get("/api/v1/users/me/applications/" + appAId), token(otherStudent), null,
                404, "CLUB_APPLICATION_NOT_FOUND");
    }

    @Test
    @DisplayName("PB-19.2 (TC-PB-19.2-01..04): Update application, cancel PENDING, disallow hard delete & reapply without cooldown")
    void testUpdateAndCancelApplication() throws Exception {
        UUID applicant = user("pb192-cancel@vju.test");
        String applicantToken = token(applicant);

        JsonNode app = call(post(clubApplications(clubA)), applicantToken, Map.of(
                "message", "Thư ứng tuyển ban đầu",
                "applicantPhone", "0911111111"
        ), 201);
        UUID appId = id(app);

        // TC-PB-19.2-01: Update application while PENDING
        JsonNode updated = call(put("/api/v1/users/me/applications/" + appId), applicantToken, Map.of(
                "message", "Thư ứng tuyển cập nhật bổ sung kinh nghiệm",
                "applicantPhone", "0922222222"
        ), 200);
        assertThat(updated.path("message").asText()).isEqualTo("Thư ứng tuyển cập nhật bổ sung kinh nghiệm");
        assertThat(updated.path("applicantPhone").asText()).isEqualTo("0922222222");

        // TC-PB-19.2-04: Hard delete is strictly disabled (HTTP 405 Method Not Allowed)
        assertThat(send(delete("/api/v1/users/me/applications/" + appId), applicantToken, null).getStatus())
                .isEqualTo(405);

        // TC-PB-19.2-02: Cancel PENDING application -> CANCELLED with cancelledAt timestamp
        JsonNode cancelled = call(patch("/api/v1/users/me/applications/" + appId + "/cancel"), applicantToken, null, 200);
        assertThat(cancelled.path("status").asText()).isEqualTo("CANCELLED");
        assertThat(cancelled.path("cancelledAt").isTextual()).isTrue();

        // TC-PB-19.2-03: Cannot cancel already cancelled application
        problem(patch("/api/v1/users/me/applications/" + appId + "/cancel"), applicantToken, null,
                409, "APPLICATION_CANNOT_BE_CANCELLED");

        // TC-PB-19.2-04 (cont.): CANCELLED application does not trigger cooldown; student can re-apply immediately
        JsonNode reapplied = call(post(clubApplications(clubA)), applicantToken, Map.of(
                "message", "Nộp lại đơn mới sau khi đã hủy đơn cũ"
        ), 201);
        assertThat(reapplied.path("status").asText()).isEqualTo("PENDING");
    }

    @Test
    @DisplayName("PB-20.1 (TC-PB-20.1-01..04): Club manager lists applications with keyword/status filter & scope security")
    void testClubManagerListApplicationsAndScopeSecurity() throws Exception {
        UUID app1User = user("pb201-u1@vju.test");
        UUID app2User = user("pb201-u2@vju.test");
        call(post(clubApplications(clubA)), token(app1User), Map.of(
                "message", "Ứng viên chuyên môn Thiết kế đồ họa",
                "applicantPhone", "0933333333"
        ), 201);
        call(post(clubApplications(clubA)), token(app2User), Map.of(
                "message", "Ứng viên phụ trách Sự kiện truyền thông",
                "applicantPhone", "0944444444"
        ), 201);

        // TC-PB-20.1-01: Club manager lists and filters applications
        JsonNode list = call(get(clubApplications(clubA)).param("search", "Thiết kế"), adminToken, null, 200);
        assertThat(list.path("total").asInt()).isEqualTo(1);
        assertThat(list.at("/items/0/applicantPhone").asText()).isEqualTo("0933333333");

        // TC-PB-20.1-03: Scope security: Non-manager / member of another club is forbidden (403)
        UUID outsider = user("pb201-outsider@vju.test");
        problem(get(clubApplications(clubA)), token(outsider), null, 403, "PERMISSION_DENIED");

        // TC-PB-20.1-04: Cannot bypass review workflow by modifying status via PUT /clubs/{clubId}/applications/{id}
        UUID anyAppId = id(list.at("/items/0"));
        problem(put(clubApplications(clubA) + "/" + anyAppId), adminToken, Map.of(
                "status", "APPROVED"
        ), 409, "APPLICATION_STATUS_TRANSITION_NOT_ALLOWED");
    }

    @Test
    @DisplayName("PB-20.2 (TC-PB-20.2-01..04): Approve application atomically creates Membership, Role, Department & Notification")
    void testApproveApplicationLifecycle() throws Exception {
        UUID applicant = user("pb202-candidate@vju.test");
        String appToken = token(applicant);

        JsonNode app = call(post(clubApplications(clubA)), appToken, Map.of(
                "preferredDepartmentId", depA1,
                "message", "Muốn cống hiến cho Ban 1 của CLB A"
        ), 201);
        UUID appId = id(app);

        // TC-PB-20.2-01: Approve application -> APPROVED, Membership ACTIVE, Department assigned
        JsonNode approved = call(post(clubApplications(clubA) + "/" + appId + "/approve"), adminToken, Map.of(
                "reviewNote", "Hồ sơ đạt tiêu chuẩn, duyệt vào Ban 1"
        ), 200);
        assertThat(approved.path("status").asText()).isEqualTo("APPROVED");
        assertThat(approved.path("reviewedBy").asText()).isEqualTo(admin.toString());

        // Verify Membership was created
        assertThat(count("SELECT count(*) FROM memberships WHERE user_id = ? AND club_id = ? AND status = 'ACTIVE'",
                applicant, clubA)).isEqualTo(1);

        // Verify Department assignment was created
        assertThat(count("SELECT count(*) FROM department_members WHERE club_id = ? AND department_id = ?",
                clubA, depA1)).isGreaterThanOrEqualTo(1);

        // TC-PB-20.2-03: Prevent approving already reviewed application
        problem(post(clubApplications(clubA) + "/" + appId + "/approve"), adminToken, Map.of(),
                409, "APPLICATION_ALREADY_REVIEWED");

        // TC-PB-20.2-04: In-app notification sent to applicant
        JsonNode notifications = call(get("/api/v1/users/me/notifications"), appToken, null, 200);
        assertThat(notifications.path("total").asInt()).isGreaterThanOrEqualTo(1);
        assertThat(notifications.at("/items/0/title").asText()).contains("duyệt");

        // Test skipDepartmentAssignment = true
        UUID applicant2 = user("pb202-general@vju.test");
        JsonNode app2 = call(post(clubApplications(clubA)), token(applicant2), Map.of(
                "preferredDepartmentId", depA1,
                "message", "Vào CLB nhưng chưa xếp ban"
        ), 201);
        UUID app2Id = id(app2);

        // TC-PB-20.2-02: Approve with skipDepartmentAssignment = true -> Membership created, NO department_member
        call(post(clubApplications(clubA) + "/" + app2Id + "/approve"), adminToken, Map.of(
                "skipDepartmentAssignment", true,
                "reviewNote", "Duyệt vào làm thành viên tự do của CLB"
        ), 200);
        UUID m2Id = db.queryForObject("SELECT id FROM memberships WHERE user_id = ? AND club_id = ?",
                UUID.class, applicant2, clubA);
        assertThat(count("SELECT count(*) FROM department_members WHERE membership_id = ?", m2Id)).isZero();
    }

    @Test
    @DisplayName("PB-20.3 (TC-PB-20.3-01..04): Reject application stores notes, enforces cooldown & sends in-app notification")
    void testRejectApplicationLifecycleAndCooldown() throws Exception {
        UUID applicant = user("pb203-rejection@vju.test");
        String appToken = token(applicant);

        // Set cooldown in system settings to 7 days
        db.update("UPDATE system_settings SET reapply_cooldown_days = 7");

        JsonNode app = call(post(clubApplications(clubA)), appToken, Map.of(
                "message", "Nộp đơn ứng tuyển thử"
        ), 201);
        UUID appId = id(app);

        // TC-PB-20.3-01: Reject application
        JsonNode rejected = call(post(clubApplications(clubA) + "/" + appId + "/reject"), adminToken, Map.of(
                "reviewNote", "Rất tiếc hồ sơ chưa phù hợp đợt tuyển này",
                "internalNote", "Ghi chú nội bộ BCN: Trượt vòng sơ loại"
        ), 200);
        assertThat(rejected.path("status").asText()).isEqualTo("REJECTED");

        // TC-PB-20.3-02: No membership created
        assertThat(count("SELECT count(*) FROM memberships WHERE user_id = ? AND club_id = ?", applicant, clubA)).isZero();

        // TC-PB-20.3-03: Reapplying within cooldown period is blocked (409 APPLICATION_REAPPLY_TOO_SOON)
        problem(post(clubApplications(clubA)), appToken, Map.of(
                "message", "Thử nộp lại ngay lập tức"
        ), 409, "APPLICATION_REAPPLY_TOO_SOON");

        // TC-PB-20.3-04: In-app notification sent with rejection message
        JsonNode notifications = call(get("/api/v1/users/me/notifications"), appToken, null, 200);
        assertThat(notifications.path("total").asInt()).isGreaterThanOrEqualTo(1);
        assertThat(notifications.at("/items/0/title").asText()).contains("từ chối");
    }
}
