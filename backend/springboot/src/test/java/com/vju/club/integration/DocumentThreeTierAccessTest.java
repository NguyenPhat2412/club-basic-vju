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

class DocumentThreeTierAccessTest extends ApiIntegrationTest {
    private static final byte[] PDF_BYTES = "%PDF-1.7\n% VJU ClubHub Vault\n".getBytes(StandardCharsets.US_ASCII);
    private static final byte[] ZIP_BYTES = {0x50, 0x4B, 0x03, 0x04, 0x14, 0x00, 0x00, 0x00};

    @Autowired StorageProperties storage;

    private static MockMultipartHttpServletRequestBuilder systemUpload(String fileName, byte[] bytes) {
        MockMultipartHttpServletRequestBuilder req = multipart("/api/v1/system/documents");
        req.file(new MockMultipartFile("file", fileName, "application/octet-stream", bytes));
        return req;
    }

    private static MockMultipartHttpServletRequestBuilder clubUpload(UUID clubId, String fileName, byte[] bytes) {
        MockMultipartHttpServletRequestBuilder req = multipart("/api/v1/clubs/" + clubId + "/documents");
        req.file(new MockMultipartFile("file", fileName, "application/octet-stream", bytes));
        return req;
    }

    @Test
    void systemDocumentsEnforceGlobalUploadAndVisibilityTiers() throws Exception {
        UUID officerUser = user("officer@test.local");
        membership(officerUser, clubA);
        grant(officerUser, "document.view", "CLUB", clubA, null);
        grant(officerUser, "document.delete", "CLUB", clubA, null);
        String officerToken = token(officerUser);

        problem(systemUpload("unauth.pdf", PDF_BYTES), memberToken, null, 403, "PERMISSION_DENIED");

        JsonNode publicDoc = call(systemUpload("Quy chế CLB VJU.pdf", PDF_BYTES)
                .param("visibility", "PUBLIC_INTERNAL"), adminToken, null, 201);
        JsonNode officerDoc = call(systemUpload("Hướng dẫn tài chính BCN.pdf", PDF_BYTES)
                .param("visibility", "OFFICERS"), adminToken, null, 201);

        assertThat(publicDoc.path("scope").asText()).isEqualTo("SYSTEM");
        assertThat(publicDoc.path("clubId").isNull()).isTrue();
        assertThat(publicDoc.path("visibility").asText()).isEqualTo("PUBLIC_INTERNAL");
        assertThat(publicDoc.path("previewable").asBoolean()).isTrue();

        // Regular logged-in student sees only PUBLIC_INTERNAL system documents
        JsonNode studentList = call(get("/api/v1/system/documents"), memberToken, null, 200);
        assertThat(studentList.path("items")).hasSize(1);
        assertThat(studentList.at("/items/0/name").asText()).isEqualTo("Quy chế CLB VJU.pdf");
        problem(get("/api/v1/documents/" + id(officerDoc)), memberToken, null, 403, "PERMISSION_DENIED");

        // Club officer sees both PUBLIC_INTERNAL and OFFICERS system documents, but cannot delete system docs
        JsonNode officerList = call(get("/api/v1/system/documents"), officerToken, null, 200);
        assertThat(officerList.path("items")).hasSize(2);
        problem(delete("/api/v1/documents/" + id(publicDoc)), officerToken, null, 403, "PERMISSION_DENIED");
    }

    @Test
    void clubDocumentsHideOfficerVisibilityFromPlainMembers() throws Exception {
        UUID clubMember = user("club.member@test.local");
        membership(clubMember, clubA);
        grant(clubMember, "document.view", "CLUB", clubA, null);
        String clubMemberToken = token(clubMember);

        UUID clubPresident = user("club.president@test.local");
        membership(clubPresident, clubA);
        grant(clubPresident, "document.view", "CLUB", clubA, null);
        grant(clubPresident, "document.upload", "CLUB", clubA, null);
        grant(clubPresident, "document.update", "CLUB", clubA, null);
        grant(clubPresident, "document.delete", "CLUB", clubA, null);
        String presidentToken = token(clubPresident);

        JsonNode memberDoc = call(clubUpload(clubA, "Nội quy chung.pdf", PDF_BYTES)
                .param("visibility", "MEMBERS"), presidentToken, null, 201);
        JsonNode officerOnlyDoc = call(clubUpload(clubA, "Ngân sách BCN.pdf", PDF_BYTES)
                .param("visibility", "OFFICERS"), presidentToken, null, 201);

        JsonNode visibleToMember = call(get("/api/v1/clubs/" + clubA + "/documents"), clubMemberToken, null, 200);
        assertThat(visibleToMember.path("items")).hasSize(1);
        assertThat(visibleToMember.at("/items/0/id").asText()).isEqualTo(id(memberDoc).toString());

        problem(get("/api/v1/documents/" + id(officerOnlyDoc)), clubMemberToken, null, 403, "PERMISSION_DENIED");

        JsonNode visibleToPresident = call(get("/api/v1/clubs/" + clubA + "/documents"), presidentToken, null, 200);
        assertThat(visibleToPresident.path("items")).hasSize(2);

        JsonNode patched = call(patch("/api/v1/documents/" + id(officerOnlyDoc)), presidentToken,
                Map.of("visibility", "MEMBERS"), 200);
        assertThat(patched.path("visibility").asText()).isEqualTo("MEMBERS");
        call(get("/api/v1/documents/" + id(officerOnlyDoc)), clubMemberToken, null, 200);

        // Demoted officer loses access to OFFICERS document even as original uploader (no isOwner bypass)
        db.update("DELETE FROM user_permissions WHERE user_id = ? AND permission_id IN "
                + "(SELECT id FROM permissions WHERE permission_key IN ('document.delete', 'document.update', 'document.upload'))",
                clubPresident);
        cacheManager.getCacheNames().forEach(name -> {
            var cache = cacheManager.getCache(name);
            if (cache != null) cache.clear();
        });
        JsonNode restrictedDoc = call(clubUpload(clubA, "Mật BCN.pdf", PDF_BYTES)
                .param("visibility", "OFFICERS"), adminToken, null, 201);
        db.update("UPDATE documents SET owner_id = ? WHERE id = ?", clubPresident, id(restrictedDoc));
        problem(get("/api/v1/documents/" + id(restrictedDoc)), presidentToken, null, 403, "PERMISSION_DENIED");
        problem(patch("/api/v1/documents/" + id(restrictedDoc)), presidentToken,
                Map.of("visibility", "MEMBERS"), 403, "PERMISSION_DENIED");
        assertThat(call(get("/api/v1/clubs/" + clubA + "/documents"), presidentToken, null, 200).path("items"))
                .noneMatch(node -> id(restrictedDoc).toString().equals(node.path("id").asText()));
    }

    @Test
    void departmentDocumentsIsolateDepartmentsWhileAllowingClubOfficersAndSafeSoftDelete() throws Exception {
        UUID headA1 = user("head.a1@test.local");
        UUID mHeadA1 = membership(headA1, clubA);
        assign(depA1, mHeadA1);
        grant(headA1, "document.view", "DEPARTMENT", null, depA1);
        grant(headA1, "document.upload", "DEPARTMENT", null, depA1);
        String headA1Token = token(headA1);

        UUID memberA2 = user("member.a2@test.local");
        UUID mMemberA2 = membership(memberA2, clubA);
        assign(depA2, mMemberA2);
        grant(memberA2, "document.view", "CLUB", clubA, null);
        grant(memberA2, "document.view", "DEPARTMENT", null, depA2);
        String memberA2Token = token(memberA2);

        UUID presidentA = user("pres.a@test.local");
        membership(presidentA, clubA);
        grant(presidentA, "document.view", "CLUB", clubA, null);
        grant(presidentA, "document.delete", "CLUB", clubA, null);
        grant(presidentA, "document.restore", "CLUB", clubA, null);
        String presidentAToken = token(presidentA);

        JsonNode depDoc = call(clubUpload(clubA, "Kịch bản Truyền thông.pdf", PDF_BYTES)
                .param("departmentId", depA1.toString()), headA1Token, null, 201);
        assertThat(depDoc.path("scope").asText()).isEqualTo("DEPARTMENT");
        assertThat(depDoc.path("departmentId").asText()).isEqualTo(depA1.toString());
        assertThat(depDoc.path("visibility").asText()).isEqualTo("DEPARTMENT_ONLY");

        // Head of A1 cannot upload into A2 or cross-club department B1
        problem(clubUpload(clubA, "CrossDept.pdf", PDF_BYTES).param("departmentId", depA2.toString()),
                headA1Token, null, 403, "PERMISSION_DENIED");
        problem(clubUpload(clubA, "CrossClub.pdf", PDF_BYTES).param("departmentId", depB1.toString()),
                adminToken, null, 404, "DEPARTMENT_NOT_FOUND");

        // Member of Department A2 cannot list or open Department A1 documents
        JsonNode listForA2 = call(get("/api/v1/clubs/" + clubA + "/documents"), memberA2Token, null, 200);
        assertThat(listForA2.path("items")).isEmpty();
        problem(get("/api/v1/clubs/" + clubA + "/documents").param("departmentId", depA1.toString()),
                memberA2Token, null, 403, "PERMISSION_DENIED");
        problem(get("/api/v1/documents/" + id(depDoc)), memberA2Token, null, 403, "PERMISSION_DENIED");

        // Club president sees all departments, soft-deletes without losing physical Vault file, and restores
        JsonNode listForPres = call(get("/api/v1/clubs/" + clubA + "/documents")
                .param("departmentId", depA1.toString()), presidentAToken, null, 200);
        assertThat(listForPres.path("items")).hasSize(1);

        call(delete("/api/v1/documents/" + id(depDoc)), presidentAToken, null, 204);
        assertThat(Files.exists(storage.getLocal().getRoot().resolve(depDoc.path("path").asText()))).isTrue();

        JsonNode restored = call(post("/api/v1/documents/" + id(depDoc) + "/restore"), presidentAToken, null, 200);
        assertThat(restored.path("deleted").asBoolean()).isFalse();
    }

    @Test
    void inlinePreviewStreamsPdfWithHardenedHeadersAndRejectsZipArchive() throws Exception {
        JsonNode pdfDoc = call(clubUpload(clubA, "Slide giới thiệu.pdf", PDF_BYTES), adminToken, null, 201);
        JsonNode zipDoc = call(clubUpload(clubA, "Assets.zip", ZIP_BYTES), adminToken, null, 201);

        assertThat(pdfDoc.path("previewable").asBoolean()).isTrue();
        assertThat(zipDoc.path("previewable").asBoolean()).isFalse();

        MockHttpServletResponse previewRes = send(get("/api/v1/documents/" + id(pdfDoc) + "/preview"), adminToken, null);
        assertThat(previewRes.getStatus()).isEqualTo(200);
        assertThat(previewRes.getContentType()).startsWith("application/pdf");
        assertThat(previewRes.getHeader("Content-Disposition")).startsWith("inline;");
        assertThat(previewRes.getHeader("X-Content-Type-Options")).isEqualTo("nosniff");
        assertThat(previewRes.getHeader("Content-Security-Policy")).contains("default-src 'none'");
        assertThat(previewRes.getContentAsByteArray()).isEqualTo(PDF_BYTES);

        String etag = previewRes.getHeader("ETag");
        assertThat(etag).isNotBlank();
        MockHttpServletResponse cachedPreview = send(
                get("/api/v1/documents/" + id(pdfDoc) + "/preview").header("If-None-Match", etag),
                adminToken, null);
        assertThat(cachedPreview.getStatus()).isEqualTo(304);
        assertThat(cachedPreview.getContentAsByteArray()).isEmpty();

        MockHttpServletResponse cachedDownload = send(
                get("/api/v1/documents/" + id(pdfDoc) + "/download").header("If-None-Match", etag),
                adminToken, null);
        assertThat(cachedDownload.getStatus()).isEqualTo(304);

        problem(get("/api/v1/documents/" + id(zipDoc) + "/preview"), adminToken, null, 415, "DOCUMENT_NOT_PREVIEWABLE");
    }
}
