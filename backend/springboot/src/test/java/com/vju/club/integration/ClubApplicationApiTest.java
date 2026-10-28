package com.vju.club.integration;

import com.fasterxml.jackson.databind.JsonNode;
import org.junit.jupiter.api.Test;

import java.util.Map;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.atomic.AtomicInteger;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;

class ClubApplicationApiTest extends ApiIntegrationTest {
    @Test
    void ownerAndReviewerListsSupportValidatedSortWithPagination() throws Exception {
        JsonNode older = call(post(applications(clubA)), memberToken, Map.of("message", "older"), 201);
        JsonNode newer = call(post(applications(clubB)), memberToken, Map.of("message", "newer"), 201);
        db.update("UPDATE club_applications SET created_at = now() - interval '1 day' WHERE id = ?", id(older));

        JsonNode ascending = call(get("/api/v1/users/me/applications").param("sort", "createdAt,asc")
                .param("limit", "1"), memberToken, null, 200);
        assertThat(ascending.path("total").asInt()).isEqualTo(2);
        assertThat(ascending.at("/items/0/id").asText()).isEqualTo(id(older).toString());
        JsonNode defaultOrder = call(get("/api/v1/users/me/applications").param("limit", "1"), memberToken, null, 200);
        assertThat(defaultOrder.at("/items/0/id").asText()).isEqualTo(id(newer).toString());

        UUID another = user("sort-other@test.local");
        call(post(applications(clubA)), token(another), Map.of("message", "other"), 201);
        JsonNode reviewed = call(get(applications(clubA)).param("sort", "createdAt,asc").param("limit", "1"),
                adminToken, null, 200);
        assertThat(reviewed.path("total").asInt()).isEqualTo(2);
        assertThat(reviewed.at("/items/0/id").asText()).isEqualTo(id(older).toString());
        problem(get("/api/v1/users/me/applications").param("sort", "createdAt;delete,asc"), memberToken, null,
                400, "INVALID_SORT");
        problem(get(applications(clubA)).param("sort", "createdAt,sideways"), adminToken, null, 400, "INVALID_SORT");
    }

    private String applications(UUID clubId) {
        return "/api/v1/clubs/" + clubId + "/applications";
    }

    @Test
    void applicantCreatesTracksAndCancelsOnlyPendingApplication() throws Exception {
        JsonNode application = call(post(applications(clubA)), memberToken,
                Map.of("message", "I want to join"), 201);
        assertThat(application.path("status").asText()).isEqualTo("PENDING");

        problem(post(applications(clubA)), memberToken, Map.of("message", "duplicate"), 409,
                "APPLICATION_ALREADY_PENDING");
        call(get("/api/v1/users/me/applications"), memberToken, null, 200);

        String cancel = "/api/v1/users/me/applications/" + id(application) + "/cancel";
        JsonNode cancelled = call(patch(cancel), memberToken, null, 200);
        assertThat(cancelled.path("status").asText()).isEqualTo("CANCELLED");
        problem(patch(cancel), memberToken, null, 409, "APPLICATION_CANNOT_BE_CANCELLED");
    }

    @Test
    void clubScopedReviewerApprovesOnlyApplicationsInGrantedClub() throws Exception {
        UUID applicant = user("applicant@test.local");
        String applicantToken = token(applicant);
        JsonNode applicationA = call(post(applications(clubA)), applicantToken,
                Map.of("message", "join A"), 201);

        grant(member, "application.approve", "CLUB", clubA, null);
        JsonNode approved = call(post(applications(clubA) + "/" + id(applicationA) + "/approve"), memberToken,
                Map.of("reviewNote", "approved"), 200);
        assertThat(approved.path("status").asText()).isEqualTo("APPROVED");
        assertThat(count("SELECT count(*) FROM memberships WHERE user_id = ? AND club_id = ? AND status = 'ACTIVE'",
                applicant, clubA)).isEqualTo(1);
        problem(post(applications(clubA) + "/" + id(applicationA) + "/approve"), memberToken,
                Map.of(), 409, "APPLICATION_ALREADY_REVIEWED");

        UUID applicantB = user("applicant-b@test.local");
        JsonNode applicationB = call(post(applications(clubB)), token(applicantB), Map.of("message", "join B"), 201);
        problem(post(applications(clubB) + "/" + id(applicationB) + "/approve"), memberToken,
                Map.of(), 403, "PERMISSION_DENIED");
    }

    @Test
    void rejectionDoesNotCreateMembershipAndUnauthorizedReviewIsDenied() throws Exception {
        UUID applicant = user("reject@test.local");
        JsonNode application = call(post(applications(clubA)), token(applicant), Map.of("message", "please"), 201);
        problem(post(applications(clubA) + "/" + id(application) + "/reject"), memberToken,
                Map.of(), 403, "PERMISSION_DENIED");

        grant(member, "application.reject", "CLUB", clubA, null);
        JsonNode rejected = call(post(applications(clubA) + "/" + id(application) + "/reject"), memberToken,
                Map.of("reviewNote", "not now"), 200);
        assertThat(rejected.path("status").asText()).isEqualTo("REJECTED");
        assertThat(count("SELECT count(*) FROM memberships WHERE user_id = ? AND club_id = ?", applicant, clubA))
                .isZero();
        JsonNode notifications = call(get("/api/v1/users/me/notifications"), token(applicant), null, 200);
        assertThat(notifications.path("total").asInt()).isEqualTo(1);
        assertThat(notifications.at("/items/0/title").asText()).contains("từ chối");
        problem(patch("/api/v1/users/me/applications/" + id(application) + "/cancel"), token(applicant), null,
                409, "APPLICATION_CANNOT_BE_CANCELLED");
    }

    @Test
    void applicationReviewIsAudited() throws Exception {
        UUID applicant = user("audit-applicant@test.local");
        JsonNode application = call(post(applications(clubA)), token(applicant), Map.of("message", "audit"), 201);
        call(post(applications(clubA) + "/" + id(application) + "/approve"), adminToken, Map.of(), 200);

        JsonNode audit = call(get("/api/v1/audit-logs").param("resourceType", "APPLICATION"), adminToken, null, 200);
        assertThat(audit.path("items").toString()).contains("CLUB_APPLICATION_APPROVED");
    }

    @Test
    void concurrentPendingCreatesHaveOneWinnerAndMappedConflict() throws Exception {
        List<Integer> statuses = concurrently(8, () -> () ->
                send(post(applications(clubA)), memberToken, Map.of("message", "race")).getStatus());

        assertThat(statuses).containsOnly(201, 409);
        assertThat(statuses).filteredOn(status -> status == 201).hasSize(1);
        assertThat(count("SELECT count(*) FROM club_applications WHERE applicant_id = ? AND club_id = ? "
                + "AND status = 'PENDING'", member, clubA)).isEqualTo(1);
    }

    @Test
    void concurrentApprovalsCreateOneMembershipAndOneTerminalWinner() throws Exception {
        UUID applicant = user("approve-race@test.local");
        JsonNode application = call(post(applications(clubA)), token(applicant), Map.of("message", "race"), 201);

        List<Integer> statuses = concurrently(8, () -> () ->
                send(post(applications(clubA) + "/" + id(application) + "/approve"), adminToken, Map.of()).getStatus());

        assertThat(statuses).containsOnly(200, 409);
        assertThat(statuses).filteredOn(status -> status == 200).hasSize(1);
        assertThat(count("SELECT count(*) FROM memberships WHERE user_id = ? AND club_id = ? AND status = 'ACTIVE'",
                applicant, clubA)).isEqualTo(1);
    }

    @Test
    void concurrentCancelAndApproveHaveOneTerminalWinner() throws Exception {
        JsonNode application = call(post(applications(clubA)), memberToken, Map.of("message", "race cancel"), 201);
        AtomicInteger order = new AtomicInteger();
        List<Integer> statuses = concurrently(2, () -> () -> {
            if (order.getAndIncrement() == 0) {
                return send(patch("/api/v1/users/me/applications/" + id(application) + "/cancel"), memberToken, null).getStatus();
            }
            return send(post(applications(clubA) + "/" + id(application) + "/approve"), adminToken, Map.of()).getStatus();
        });
        assertThat(statuses).containsOnly(200, 409);
        String status = db.queryForObject("SELECT status FROM club_applications WHERE id = ?", String.class, id(application));
        assertThat(status).isIn("CANCELLED", "APPROVED");
        assertThat(count("SELECT count(*) FROM memberships WHERE user_id = ? AND club_id = ? AND status = 'ACTIVE'",
                member, clubA)).isEqualTo(status.equals("APPROVED") ? 1 : 0);
    }

    @Test
    void ownerEndpointsDoNotExposeAnotherUsersApplication() throws Exception {
        UUID applicant = user("owner-isolation@test.local");
        JsonNode application = call(post(applications(clubA)), token(applicant), Map.of("message", "private"), 201);
        String mine = "/api/v1/users/me/applications/" + id(application);

        problem(get(mine), memberToken, null, 404, "CLUB_APPLICATION_NOT_FOUND");
        problem(patch(mine + "/cancel"), memberToken, null, 404, "CLUB_APPLICATION_NOT_FOUND");
    }

    @Test
    void reviewerPathClubMustMatchApplicationClub() throws Exception {
        UUID applicant = user("path-mismatch@test.local");
        JsonNode application = call(post(applications(clubB)), token(applicant), Map.of("message", "club B"), 201);
        grant(member, "application.view", "CLUB", clubA, null);

        problem(get(applications(clubA) + "/" + id(application)), memberToken, null, 404,
                "CLUB_APPLICATION_NOT_FOUND");
    }

    @Test
    void approvalRollsBackApplicationWhenMembershipInsertFails() throws Exception {
        UUID applicant = user("rollback@test.local");
        JsonNode application = call(post(applications(clubA)), token(applicant), Map.of("message", "rollback"), 201);
        db.execute("CREATE OR REPLACE FUNCTION phase2_fail_membership() RETURNS trigger LANGUAGE plpgsql AS $$ "
                + "BEGIN RAISE EXCEPTION 'forced phase2 membership failure'; END; $$");
        db.execute("CREATE TRIGGER phase2_fail_membership BEFORE INSERT ON memberships "
                + "FOR EACH ROW EXECUTE FUNCTION phase2_fail_membership()");
        try {
            problem(post(applications(clubA) + "/" + id(application) + "/approve"), adminToken,
                    Map.of(), 500, "INTERNAL_ERROR");
        } finally {
            db.execute("DROP TRIGGER IF EXISTS phase2_fail_membership ON memberships");
            db.execute("DROP FUNCTION IF EXISTS phase2_fail_membership()");
        }
        assertThat(db.queryForObject("SELECT status FROM club_applications WHERE id = ?", String.class, id(application)))
                .isEqualTo("PENDING");
        assertThat(count("SELECT count(*) FROM memberships WHERE user_id = ? AND club_id = ?", applicant, clubA))
                .isZero();
    }

    @Test
    void formBuilderCrudAndDetailedApplicationWithPdfUploadAndApprovalDepartmentAssignment() throws Exception {
        Map<String, Object> formReq = Map.of(
                "title", "Đơn tuyển thành viên Gen 9",
                "description", "Điền đầy đủ thông tin và nộp CV PDF",
                "status", "OPEN",
                "fields", List.of(Map.of(
                        "key", "interview_slot",
                        "label", "Ca phỏng vấn",
                        "type", "SELECT",
                        "required", true,
                        "placeholder", "Chọn ca",
                        "options", List.of("Sáng Thứ 7", "Chiều Chủ Nhật")
                )),
                "allowAttachments", true,
                "requireAttachment", false,
                "maxAttachments", 5,
                "isDefault", true
        );
        JsonNode createdForm = call(post("/api/v1/clubs/" + clubA + "/application-forms"), adminToken, formReq, 201);
        UUID formId = id(createdForm);

        JsonNode activeForm = call(get("/api/v1/clubs/" + clubA + "/application-form"), memberToken, null, 200);
        assertThat(activeForm.path("id").asText()).isEqualTo(formId.toString());
        assertThat(activeForm.path("fields").size()).isEqualTo(1);
        assertThat(activeForm.path("departments").size()).isEqualTo(2);

        // Missing required custom field is rejected
        problem(post(applications(clubA)), memberToken, Map.of(
                "formId", formId,
                "message", "Em muốn tham gia CLB"
        ), 400, "MISSING_REQUIRED_FORM_FIELD");

        // Submit detailed application
        JsonNode app = call(post(applications(clubA)), memberToken, Map.ofEntries(
                Map.entry("formId", formId),
                Map.entry("preferredDepartmentId", depA1),
                Map.entry("secondaryDepartmentId", depA2),
                Map.entry("applicantPhone", "0912345678"),
                Map.entry("facultyMajor", "Công nghệ thông tin (BCSE)"),
                Map.entry("academicYear", "K8 - Năm 3"),
                Map.entry("gpa", "3.65"),
                Map.entry("socialPortfolioUrl", "https://github.com/student"),
                Map.entry("selfIntroduction", "Năng động, nhiệt huyết"),
                Map.entry("skillsExperience", "Thiết kế Canva, lập trình Web"),
                Map.entry("availability", "Tối T3, T5 và cuối tuần"),
                Map.entry("message", "Mong muốn đóng góp cho CLB"),
                Map.entry("customAnswers", Map.of("interview_slot", "Sáng Thứ 7"))
        ), 201);
        UUID appId = id(app);
        assertThat(app.path("preferredDepartmentId").asText()).isEqualTo(depA1.toString());
        assertThat(app.path("facultyMajor").asText()).isEqualTo("Công nghệ thông tin (BCSE)");
        assertThat(app.at("/customAnswers/interview_slot").asText()).isEqualTo("Sáng Thứ 7");

        // Upload PDF attachment to application
        byte[] pdfBytes = "%PDF-1.4\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF\n".getBytes(java.nio.charset.StandardCharsets.US_ASCII);
        var uploadReq = multipart("/api/v1/applications/" + appId + "/files")
                .file(new org.springframework.mock.web.MockMultipartFile("file", "cv-ung-vien.pdf", "application/pdf", pdfBytes))
                .param("fileCategory", "APPLICANT_CV_PDF");
        JsonNode uploadedFile = call(uploadReq, memberToken, null, 201);
        UUID fileId = id(uploadedFile);
        assertThat(uploadedFile.path("fileType").asText()).isEqualTo("PDF");

        // Update application while PENDING
        JsonNode updatedApp = call(put("/api/v1/users/me/applications/" + appId), memberToken, Map.of(
                "facultyMajor", "Khoa học máy tính & Kỹ thuật",
                "gpa", "3.75",
                "message", "Mong muốn gắn bó lâu dài với CLB",
                "customAnswers", Map.of("interview_slot", "Chiều Chủ Nhật")
        ), 200);
        assertThat(updatedApp.path("facultyMajor").asText()).isEqualTo("Khoa học máy tính & Kỹ thuật");
        assertThat(updatedApp.path("attachments").size()).isEqualTo(1);

        // Download attachment
        var downloadResp = send(get("/api/v1/application-files/" + fileId + "/download"), adminToken, null);
        assertThat(downloadResp.getStatus()).isEqualTo(200);
        assertThat(downloadResp.getContentAsByteArray()).isEqualTo(pdfBytes);

        // Approve application -> automatically assigns to preferredDepartmentId (depA1)
        JsonNode approved = call(post(applications(clubA) + "/" + appId + "/approve"), adminToken,
                Map.of("reviewNote", "Hồ sơ rất tốt"), 200);
        assertThat(approved.path("status").asText()).isEqualTo("APPROVED");
        assertThat(count("SELECT count(*) FROM department_members WHERE department_id = ? AND club_id = ?", depA1, clubA))
                .isEqualTo(1);

        // Reviewer CRUD: update application details & reviewNote via PUT /clubs/{clubId}/applications/{appId}
        JsonNode managerUpdated = call(put(applications(clubA) + "/" + appId), adminToken, Map.of(
                "gpa", "3.85",
                "reviewNote", "Cập nhật ghi chú duyệt và phân thêm vào Ban 2",
                "assignDepartmentId", depA2
        ), 200);
        assertThat(managerUpdated.path("gpa").asText()).isEqualTo("3.85");
        assertThat(managerUpdated.path("reviewNote").asText()).isEqualTo("Cập nhật ghi chú duyệt và phân thêm vào Ban 2");
        assertThat(count("SELECT count(*) FROM department_members WHERE department_id = ? AND club_id = ?", depA2, clubA))
                .isEqualTo(1);
    }

    @Test
    void studentsApplyOnlyThroughAFormThatIsOpenNow() throws Exception {
        String forms = "/api/v1/clubs/" + clubA + "/application-forms";
        java.time.OffsetDateTime now = java.time.OffsetDateTime.now();
        db.update("UPDATE system_settings SET reapply_cooldown_days = 0"); // the rejection below is not under test

        // A club that never set up a form takes applications on the built-in default.
        JsonNode first = call(post(applications(clubB)), memberToken, Map.of("message", "hi"), 201);
        call(patch("/api/v1/users/me/applications/" + id(first) + "/cancel"), memberToken, null, 200);

        problem(post(forms), adminToken, Map.of("title", "Sai khung giờ", "openAt", now.plusDays(2).toString(),
                "closeAt", now.plusDays(1).toString()), 400, "INVALID_FORM_WINDOW");

        // Draft only: closed to students, hidden from the public form endpoint, open to a manager entering on their behalf.
        UUID draft = id(call(post(forms), adminToken, Map.of("title", "Nháp", "status", "DRAFT"), 201));
        problem(post(applications(clubA)), memberToken, Map.of("message", "hi"), 409, "APPLICATION_FORM_CLOSED");
        problem(post(applications(clubA)), memberToken, Map.of("message", "hi", "formId", draft), 409, "APPLICATION_FORM_CLOSED");
        assertThat(call(get("/api/v1/clubs/" + clubA + "/application-form"), memberToken, null, 200).path("id").asText())
                .isNotEqualTo(draft.toString());
        JsonNode entered = call(post(applications(clubA)), adminToken, Map.of("message", "hộ", "applicantId", member), 201);
        call(post(applications(clubA) + "/" + id(entered) + "/reject"), adminToken, Map.of("reviewNote", "x"), 200);

        UUID form = id(call(post(forms), adminToken, Map.of("title", "Đợt 1", "status", "OPEN",
                "openAt", now.plusDays(1).toString(), "requireAttachment", true), 201));
        problem(post(applications(clubA)), memberToken, Map.of("message", "hi"), 409, "APPLICATION_NOT_OPEN_YET");

        call(put(forms + "/" + form), adminToken, Map.of("title", "Đợt 1", "status", "OPEN",
                "openAt", now.minusDays(2).toString(), "closeAt", now.minusDays(1).toString()), 200);
        problem(post(applications(clubA)), memberToken, Map.of("message", "hi"), 409, "APPLICATION_FORM_CLOSED");

        call(put(forms + "/" + form), adminToken, Map.of("title", "Đợt 1", "status", "OPEN", "requireAttachment", true,
                "openAt", now.minusDays(1).toString(), "closeAt", now.plusDays(1).toString()), 200);
        JsonNode app = call(post(applications(clubA)), memberToken, Map.of("message", "hi"), 201);
        problem(post(applications(clubA) + "/" + id(app) + "/approve"), adminToken, Map.of(), 409,
                "APPLICATION_ATTACHMENT_REQUIRED");
    }
}
