package com.vju.club.integration;

import com.fasterxml.jackson.databind.JsonNode;
import com.vju.club.config.StorageProperties;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.web.servlet.request.MockMultipartHttpServletRequestBuilder;

import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;

class DocumentOfficerVaultApiTest extends ApiIntegrationTest {
    private static final byte[] FUND_PDF_V1 = "%PDF-1.7\n% VJU Club Fund Ledger Gen1 Q1\n".getBytes(StandardCharsets.US_ASCII);
    private static final byte[] FUND_PDF_V2 = "%PDF-1.7\n% VJU Club Fund Ledger Gen2 Q2 Handover\n".getBytes(StandardCharsets.US_ASCII);
    private static final byte[] PUBLIC_PDF = "%PDF-1.7\n% VJU Club General Rules\n".getBytes(StandardCharsets.US_ASCII);

    @Autowired StorageProperties storage;

    private static MockMultipartHttpServletRequestBuilder clubUpload(UUID clubId, String fileName, byte[] bytes) {
        MockMultipartHttpServletRequestBuilder req = multipart("/api/v1/clubs/" + clubId + "/documents");
        req.file(new MockMultipartFile("file", fileName, "application/pdf", bytes));
        return req;
    }

    private static MockMultipartHttpServletRequestBuilder versionUpload(UUID documentId, String fileName, byte[] bytes) {
        MockMultipartHttpServletRequestBuilder req = multipart("/api/v1/documents/" + documentId + "/versions");
        req.file(new MockMultipartFile("file", fileName, "application/pdf", bytes));
        return req;
    }

    private UUID createClubOfficer(String email, UUID clubId) {
        UUID userId = user(email);
        membership(userId, clubId);
        grant(userId, "document.view", "CLUB", clubId, null);
        grant(userId, "document.upload", "CLUB", clubId, null);
        grant(userId, "document.update", "CLUB", clubId, null);
        grant(userId, "document.delete", "CLUB", clubId, null);
        grant(userId, "document.restore", "CLUB", clubId, null);
        return userId;
    }

    private UUID createPlainClubMember(String email, UUID clubId) {
        UUID userId = user(email);
        membership(userId, clubId);
        grant(userId, "document.view", "CLUB", clubId, null);
        return userId;
    }

    private void clearPermissionCaches() {
        cacheManager.getCacheNames().forEach(name -> {
            var cache = cacheManager.getCache(name);
            if (cache != null) cache.clear();
        });
    }

    @Test
    void plainMemberIsStrictlyBlockedFromListingViewingDownloadingAndPreviewingOfficerFundDocuments() throws Exception {
        UUID presidentA = createClubOfficer("president.gen1@vju.test", clubA);
        String presidentAToken = token(presidentA);

        UUID memberA = createPlainClubMember("member.a@vju.test", clubA);
        String memberAToken = token(memberA);

        UUID presidentB = createClubOfficer("president.b@vju.test", clubB);
        String presidentBToken = token(presidentB);

        JsonNode memberDoc = call(clubUpload(clubA, "Noi-Quy-Thanh-Vien.pdf", PUBLIC_PDF)
                .param("visibility", "MEMBERS")
                .param("appDetailKey", "club.rules"), presidentAToken, null, 201);
        JsonNode fundDoc = call(clubUpload(clubA, "So-Quy-CLB-HK1.pdf", FUND_PDF_V1)
                .param("visibility", "OFFICERS")
                .param("appDetailKey", "finance.fund"), presidentAToken, null, 201);

        assertThat(fundDoc.path("visibility").asText()).isEqualTo("OFFICERS");
        assertThat(fundDoc.path("appDetailKey").asText()).isEqualTo("finance.fund");

        // Club officer sees both documents in list, count, and names
        JsonNode officerList = call(get("/api/v1/clubs/" + clubA + "/documents"), presidentAToken, null, 200);
        assertThat(officerList.path("total").asInt()).isEqualTo(2);
        assertThat(call(get("/api/v1/clubs/" + clubA + "/documents/count"), presidentAToken, null, 200)
                .path("count").asLong()).isEqualTo(2);

        // Plain member only sees MEMBERS document; OFFICERS fund document is hidden even when explicitly filtered
        JsonNode memberList = call(get("/api/v1/clubs/" + clubA + "/documents"), memberAToken, null, 200);
        assertThat(memberList.path("total").asInt()).isEqualTo(1);
        assertThat(memberList.at("/items/0/id").asText()).isEqualTo(id(memberDoc).toString());

        JsonNode memberOfficerFilter = call(get("/api/v1/clubs/" + clubA + "/documents")
                .param("visibility", "OFFICERS"), memberAToken, null, 200);
        assertThat(memberOfficerFilter.path("total").asInt()).isZero();
        assertThat(memberOfficerFilter.path("items")).isEmpty();

        assertThat(call(get("/api/v1/clubs/" + clubA + "/documents/count"), memberAToken, null, 200)
                .path("count").asLong()).isEqualTo(1);
        JsonNode memberNames = call(get("/api/v1/clubs/" + clubA + "/documents/names"), memberAToken, null, 200);
        assertThat(memberNames.path("names")).hasSize(1);
        assertThat(memberNames.at("/names/0").asText()).isEqualTo("Noi-Quy-Thanh-Vien.pdf");

        // Direct access to metadata, download, preview, download-url, versions, and mutations are strictly 403
        UUID fundId = id(fundDoc);
        problem(get("/api/v1/documents/" + fundId), memberAToken, null, 403, "PERMISSION_DENIED");
        problem(get("/api/v1/documents/" + fundId + "/download"), memberAToken, null, 403, "PERMISSION_DENIED");
        problem(get("/api/v1/documents/" + fundId + "/preview"), memberAToken, null, 403, "PERMISSION_DENIED");
        problem(get("/api/v1/documents/" + fundId + "/download-url"), memberAToken, null, 403, "PERMISSION_DENIED");
        problem(get("/api/v1/documents/" + fundId + "/versions"), memberAToken, null, 403, "PERMISSION_DENIED");
        problem(versionUpload(fundId, "hack.pdf", FUND_PDF_V2), memberAToken, null, 403, "PERMISSION_DENIED");
        problem(patch("/api/v1/documents/" + fundId), memberAToken, Map.of("visibility", "MEMBERS"), 403, "PERMISSION_DENIED");
        problem(delete("/api/v1/documents/" + fundId), memberAToken, null, 403, "PERMISSION_DENIED");

        // Another club's president is also strictly blocked from club A's BCN vault
        problem(get("/api/v1/documents/" + fundId), presidentBToken, null, 403, "PERMISSION_DENIED");
        problem(get("/api/v1/documents/" + fundId + "/download"), presidentBToken, null, 403, "PERMISSION_DENIED");
        problem(get("/api/v1/documents/" + fundId + "/preview"), presidentBToken, null, 403, "PERMISSION_DENIED");

        // Non-officer with document.upload cannot classify a club document as OFFICERS
        UUID uploaderNonOfficer = createPlainClubMember("uploader.member@vju.test", clubA);
        grant(uploaderNonOfficer, "document.upload", "CLUB", clubA, null);
        problem(clubUpload(clubA, "Unauthorized-Officer-Doc.pdf", FUND_PDF_V1).param("visibility", "OFFICERS"),
                token(uploaderNonOfficer), null, 403, "PERMISSION_DENIED");
    }

    @Test
    void handoverBetweenGenerationsPreservesAllOfficerFundVersionsAndRevokesDemotedOfficer() throws Exception {
        UUID presidentGen1 = createClubOfficer("president.gen1@vju.test", clubA);
        String gen1Token = token(presidentGen1);

        UUID presidentGen2 = createClubOfficer("president.gen2@vju.test", clubA);
        String gen2Token = token(presidentGen2);

        UUID plainMember = createPlainClubMember("plain.member@vju.test", clubA);
        String plainMemberToken = token(plainMember);

        // Gen 1 uploads version 1 of BCN-only fund ledger
        JsonNode v1 = call(clubUpload(clubA, "So-Quy-CLB-2026.pdf", FUND_PDF_V1)
                .param("visibility", "OFFICERS")
                .param("appDetailKey", "finance.fund"), gen1Token, null, 201);
        UUID fundId = id(v1);
        assertThat(v1.path("version").asInt()).isEqualTo(1);
        String v1Path = v1.path("path").asText();

        // Gen 2 (new BCN after handover) uploads version 2 of the same OFFICERS fund ledger
        JsonNode v2 = call(versionUpload(fundId, "So-Quy-CLB-2026-Q2.pdf", FUND_PDF_V2)
                .param("expectedVersion", "1"), gen2Token, null, 201);
        assertThat(v2.path("version").asInt()).isEqualTo(2);
        assertThat(v2.path("visibility").asText()).isEqualTo("OFFICERS");
        String v2Path = v2.path("path").asText();

        // Both immutable versions are preserved and accessible to Gen 2 BCN
        JsonNode versions = call(get("/api/v1/documents/" + fundId + "/versions"), gen2Token, null, 200);
        assertThat(versions).hasSize(2);
        assertThat(versions.at("/0/version").asInt()).isEqualTo(2);
        assertThat(versions.at("/1/version").asInt()).isEqualTo(1);

        MockHttpServletResponse gen2DownloadV1 = send(
                get("/api/v1/documents/" + fundId + "/download").param("version", "1"), gen2Token, null);
        assertThat(gen2DownloadV1.getStatus()).isEqualTo(200);
        assertThat(gen2DownloadV1.getContentAsByteArray()).isEqualTo(FUND_PDF_V1);

        MockHttpServletResponse gen2DownloadV2 = send(
                get("/api/v1/documents/" + fundId + "/download").param("version", "2"), gen2Token, null);
        assertThat(gen2DownloadV2.getStatus()).isEqualTo(200);
        assertThat(gen2DownloadV2.getContentAsByteArray()).isEqualTo(FUND_PDF_V2);

        MockHttpServletResponse gen2PreviewV1 = send(
                get("/api/v1/documents/" + fundId + "/preview").param("version", "1"), gen2Token, null);
        assertThat(gen2PreviewV1.getStatus()).isEqualTo(200);
        assertThat(gen2PreviewV1.getContentAsByteArray()).isEqualTo(FUND_PDF_V1);

        MockHttpServletResponse gen2PreviewV2 = send(
                get("/api/v1/documents/" + fundId + "/preview").param("version", "2"), gen2Token, null);
        assertThat(gen2PreviewV2.getStatus()).isEqualTo(200);
        assertThat(gen2PreviewV2.getContentAsByteArray()).isEqualTo(FUND_PDF_V2);

        // Regular member remains strictly blocked (403) on BOTH v1 and v2
        problem(get("/api/v1/documents/" + fundId + "/download").param("version", "1"), plainMemberToken, null, 403, "PERMISSION_DENIED");
        problem(get("/api/v1/documents/" + fundId + "/download").param("version", "2"), plainMemberToken, null, 403, "PERMISSION_DENIED");
        problem(get("/api/v1/documents/" + fundId + "/preview").param("version", "1"), plainMemberToken, null, 403, "PERMISSION_DENIED");
        problem(get("/api/v1/documents/" + fundId + "/preview").param("version", "2"), plainMemberToken, null, 403, "PERMISSION_DENIED");

        // After handover, Gen 1 steps down to regular member (retains document.view only) and immediately loses access
        db.update("DELETE FROM user_permissions WHERE user_id = ? AND permission_id IN "
                + "(SELECT id FROM permissions WHERE permission_key IN "
                + "('document.upload', 'document.update', 'document.delete', 'document.restore'))", presidentGen1);
        clearPermissionCaches();

        problem(get("/api/v1/documents/" + fundId), gen1Token, null, 403, "PERMISSION_DENIED");
        problem(get("/api/v1/documents/" + fundId + "/download").param("version", "1"), gen1Token, null, 403, "PERMISSION_DENIED");
        problem(get("/api/v1/documents/" + fundId + "/preview").param("version", "2"), gen1Token, null, 403, "PERMISSION_DENIED");
        assertThat(call(get("/api/v1/clubs/" + clubA + "/documents"), gen1Token, null, 200).path("items")).isEmpty();

        // Gen 2 soft-deletes and restores without losing either physical vault file or OFFICERS classification
        call(delete("/api/v1/documents/" + fundId), gen2Token, null, 204);
        assertThat(Files.exists(storage.getLocal().getRoot().resolve(v1Path))).isTrue();
        assertThat(Files.exists(storage.getLocal().getRoot().resolve(v2Path))).isTrue();
        problem(post("/api/v1/documents/" + fundId + "/restore"), plainMemberToken, null, 403, "PERMISSION_DENIED");

        JsonNode restored = call(post("/api/v1/documents/" + fundId + "/restore"), gen2Token, null, 200);
        assertThat(restored.path("deleted").asBoolean()).isFalse();
        assertThat(restored.path("visibility").asText()).isEqualTo("OFFICERS");
        assertThat(restored.path("version").asInt()).isEqualTo(2);
        problem(get("/api/v1/documents/" + fundId), plainMemberToken, null, 403, "PERMISSION_DENIED");
    }
}
