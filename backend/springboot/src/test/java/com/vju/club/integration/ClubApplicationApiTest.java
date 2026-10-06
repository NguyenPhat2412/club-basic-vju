package com.vju.club.integration;

import com.fasterxml.jackson.databind.JsonNode;
import org.junit.jupiter.api.Test;

import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;

class ClubApplicationApiTest extends ApiIntegrationTest {

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
    }

    @Test
    void applicationReviewIsAudited() throws Exception {
        UUID applicant = user("audit-applicant@test.local");
        JsonNode application = call(post(applications(clubA)), token(applicant), Map.of("message", "audit"), 201);
        call(post(applications(clubA) + "/" + id(application) + "/approve"), adminToken, Map.of(), 200);

        JsonNode audit = call(get("/api/v1/audit-logs").param("resourceType", "APPLICATION"), adminToken, null, 200);
        assertThat(audit.path("items").toString()).contains("CLUB_APPLICATION_APPROVED");
    }
}
