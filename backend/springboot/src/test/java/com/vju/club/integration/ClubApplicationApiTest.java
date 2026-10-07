package com.vju.club.integration;

import com.fasterxml.jackson.databind.JsonNode;
import org.junit.jupiter.api.Test;

import java.util.Map;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.atomic.AtomicInteger;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;

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
}
