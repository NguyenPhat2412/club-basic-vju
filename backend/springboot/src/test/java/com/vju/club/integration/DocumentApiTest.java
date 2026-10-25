package com.vju.club.integration;

import com.fasterxml.jackson.databind.JsonNode;
import com.vju.club.config.StorageProperties;
import com.vju.club.modules.document.common.DocumentConstants;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.web.servlet.request.MockMultipartHttpServletRequestBuilder;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.LocalDate;
import java.util.regex.Pattern;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Stream;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;

class DocumentApiTest extends ApiIntegrationTest {
    static final byte[] PDF_V1 = pdf("first");
    static final byte[] PDF_V2 = pdf("second");
    static final byte[] PNG = {(byte) 0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0, 0, 0, 13};
    static final byte[] EXE = {0x4D, 0x5A, (byte) 0x90, 0, 3, 0, 0, 0};

    @Autowired StorageProperties storage;

    static byte[] pdf(String text) {
        return ("%PDF-1.7\n% " + text + "\n").getBytes(StandardCharsets.US_ASCII);
    }

    static MockMultipartHttpServletRequestBuilder uploadTo(UUID clubId, String fileName, byte[] content) {
        MockMultipartHttpServletRequestBuilder request = multipart("/api/v1/clubs/" + clubId + "/documents");
        request.file(new MockMultipartFile("file", fileName, "application/octet-stream", content));
        return request;
    }

    static MockMultipartHttpServletRequestBuilder newVersion(UUID documentId, String fileName, byte[] content) {
        MockMultipartHttpServletRequestBuilder request = multipart("/api/v1/documents/" + documentId + "/versions");
        request.file(new MockMultipartFile("file", fileName, "application/pdf", content));
        return request;
    }

    JsonNode upload(UUID clubId, String fileName) throws Exception {
        return call(uploadTo(clubId, fileName, PDF_V1), adminToken, null, 201);
    }

    long storedObjects() throws IOException {
        Path folder = storage.getLocal().getRoot();
        if (!Files.exists(folder)) return 0;
        try (Stream<Path> files = Files.walk(folder)) {
            return files.filter(Files::isRegularFile).count();
        }
    }

    @Test
    void uploadStoresMetadataAndFile() throws Exception {
        JsonNode created = call(uploadTo(clubA, "Biên bản họp.pdf", PDF_V1).param("appDetailKey", "club.minutes"),
                adminToken, null, 201);
        assertThat(created.path("name").asText()).isEqualTo("Biên bản họp.pdf");
        assertThat(created.path("clubId").asText()).isEqualTo(clubA.toString());
        assertThat(created.path("ownerId").asText()).isEqualTo(admin.toString());
        assertThat(created.path("version").asInt()).isEqualTo(1);
        assertThat(created.path("contentType").asText()).isEqualTo("application/pdf");
        assertThat(created.path("sizeBytes").asLong()).isEqualTo(PDF_V1.length);
        assertThat(created.path("checksumSha256").asText()).hasSize(64);
        assertThat(created.path("appDetailKey").asText()).isEqualTo("club.minutes");
        assertThat(created.path("deleted").asBoolean()).isFalse();
        assertThat(created.path("createdAt").asText()).isNotBlank();
        String today = LocalDate.now(DocumentConstants.STORAGE_ZONE).format(DocumentConstants.STORAGE_FOLDER);
        assertThat(created.path("path").asText()).matches(Pattern.quote(today) + "/[0-9a-f-]{36}\\.pdf");

        assertThat(Files.readAllBytes(storage.getLocal().getRoot().resolve(created.path("path").asText()))).isEqualTo(PDF_V1);
        assertThat(count("SELECT count(*) FROM document_versions WHERE document_id = ?", id(created))).isEqualTo(1);
        assertThat(count("SELECT count(*) FROM audit_logs WHERE action = 'DOCUMENT_UPLOADED' AND resource_id = ?",
                id(created))).isEqualTo(1);
    }

    @Test
    void contentTypeComesFromTheExtensionNotTheClient() throws Exception {
        MockMultipartHttpServletRequestBuilder request = multipart("/api/v1/clubs/" + clubA + "/documents");
        request.file(new MockMultipartFile("file", "logo.png", "text/html", PNG));
        assertThat(call(request, adminToken, null, 201).path("contentType").asText()).isEqualTo("image/png");
    }

    @Test
    void nameParameterOverridesTheFileName() throws Exception {
        JsonNode created = call(uploadTo(clubA, "scan0001.pdf", PDF_V1).param("name", "Nội quy CLB.pdf"),
                adminToken, null, 201);
        assertThat(created.path("name").asText()).isEqualTo("Nội quy CLB.pdf");
        JsonNode versions = call(get("/api/v1/documents/" + id(created) + "/versions"), adminToken, null, 200);
        assertThat(versions.at("/0/originalName").asText()).isEqualTo("scan0001.pdf");
    }

    @Test
    void sameNameIsRejectedIgnoringCaseButAllowedInAnotherClub() throws Exception {
        upload(clubA, "Plan.pdf");
        problem(uploadTo(clubA, "PLAN.pdf", PDF_V2), adminToken, null, 409, "DOCUMENT_NAME_ALREADY_EXISTS");
        upload(clubB, "Plan.pdf");
    }

    @Test
    void concurrentUploadsOfOneNameKeepOneDocumentAndNoOrphanFiles() throws Exception {
        long before = storedObjects();
        List<Integer> statuses = concurrently(6, () -> () ->
                send(uploadTo(clubA, "race.pdf", PDF_V1), adminToken, null).getStatus());
        assertThat(statuses).containsOnly(201, 409);
        assertThat(statuses).filteredOn(s -> s == 201).hasSize(1);
        assertThat(count("SELECT count(*) FROM documents WHERE club_id = ?", clubA)).isEqualTo(1);
        assertThat(storedObjects() - before).isEqualTo(1);
    }

    @Test
    void uploadIntoMissingOrInactiveClubFails() throws Exception {
        problem(uploadTo(UUID.randomUUID(), "a.pdf", PDF_V1), adminToken, null, 404, "CLUB_NOT_FOUND");
        UUID closed = club("CLOSED", "INACTIVE");
        problem(uploadTo(closed, "a.pdf", PDF_V1), adminToken, null, 409, "CLUB_INACTIVE");
    }

    @Test
    void uploadWithoutFilePartIsAValidationError() throws Exception {
        problem(multipart("/api/v1/clubs/" + clubA + "/documents").param("name", "a.pdf"), adminToken, null, 400,
                "VALIDATION_ERROR");
    }

    @Test
    void abnormalNamesAreRejectedWithSpecificCodes() throws Exception {
        long before = storedObjects();
        problem(uploadTo(clubA, "../../etc/passwd.pdf", PDF_V1), adminToken, null, 400, "INVALID_DOCUMENT_NAME");
        problem(uploadTo(clubA, "CON.pdf", PDF_V1), adminToken, null, 400, "INVALID_DOCUMENT_NAME");
        problem(uploadTo(clubA, "noextension", PDF_V1), adminToken, null, 400, "INVALID_DOCUMENT_NAME");
        problem(uploadTo(clubA, "invoice.exe.pdf", PDF_V1), adminToken, null, 400, "SUSPICIOUS_DOCUMENT_NAME");
        problem(uploadTo(clubA, "invoice‮fdp.pdf", PDF_V1), adminToken, null, 400, "SUSPICIOUS_DOCUMENT_NAME");
        problem(uploadTo(clubA, "setup.exe", EXE), adminToken, null, 415, "UNSUPPORTED_DOCUMENT_TYPE");
        problem(uploadTo(clubA, "report.pdf", EXE), adminToken, null, 400, "DOCUMENT_CONTENT_MISMATCH");
        problem(uploadTo(clubA, "empty.pdf", new byte[0]), adminToken, null, 400, "EMPTY_DOCUMENT");
        problem(uploadTo(clubA, "a.pdf", PDF_V1).param("appDetailKey", "Not A Key"), adminToken, null, 400,
                "INVALID_APP_DETAIL_KEY");
        assertThat(count("SELECT count(*) FROM documents")).isZero();
        assertThat(storedObjects()).isEqualTo(before);
    }

    @Test
    void newVersionMovesTheDocumentForwardAndKeepsHistory() throws Exception {
        JsonNode document = upload(clubA, "plan.pdf");
        UUID documentId = id(document);
        JsonNode updated = call(newVersion(documentId, "plan (edited).pdf", PDF_V2).param("expectedVersion", "1"),
                adminToken, null, 201);
        assertThat(updated.path("version").asInt()).isEqualTo(2);
        assertThat(updated.path("name").asText()).isEqualTo("plan.pdf");
        assertThat(updated.path("path").asText()).isNotEqualTo(document.path("path").asText());

        JsonNode versions = call(get("/api/v1/documents/" + documentId + "/versions"), adminToken, null, 200);
        assertThat(versions.size()).isEqualTo(2);
        assertThat(versions.at("/0/version").asInt()).isEqualTo(2);
        assertThat(versions.at("/0/originalName").asText()).isEqualTo("plan (edited).pdf");
        assertThat(versions.at("/1/version").asInt()).isEqualTo(1);

        assertThat(download(documentId, null).getContentAsByteArray()).isEqualTo(PDF_V2);
        assertThat(download(documentId, 1).getContentAsByteArray()).isEqualTo(PDF_V1);
        assertThat(count("SELECT count(*) FROM audit_logs WHERE action = 'DOCUMENT_VERSION_UPLOADED'")).isEqualTo(1);
    }

    @Test
    void staleExpectedVersionIsAConflict() throws Exception {
        UUID documentId = id(upload(clubA, "plan.pdf"));
        call(newVersion(documentId, "plan.pdf", PDF_V2), adminToken, null, 201);
        problem(newVersion(documentId, "plan.pdf", pdf("third")).param("expectedVersion", "1"), adminToken, null, 409,
                "DOCUMENT_VERSION_CONFLICT");
    }

    @Test
    void versionMustKeepTheTypeAndChangeTheContent() throws Exception {
        UUID documentId = id(upload(clubA, "plan.pdf"));
        problem(newVersion(documentId, "plan.png", PNG), adminToken, null, 400, "DOCUMENT_TYPE_CHANGED");
        problem(newVersion(documentId, "plan.pdf", PDF_V1), adminToken, null, 409, "DOCUMENT_VERSION_UNCHANGED");
        problem(newVersion(documentId, "plan.pdf", EXE), adminToken, null, 400, "DOCUMENT_CONTENT_MISMATCH");
        assertThat(count("SELECT count(*) FROM document_versions WHERE document_id = ?", documentId)).isEqualTo(1);
    }

    @Test
    void concurrentVersionUploadsGetConsecutiveNumbers() throws Exception {
        UUID documentId = id(upload(clubA, "plan.pdf"));
        int[] next = {0};
        List<Integer> statuses = concurrently(5, () -> {
            byte[] content = pdf("concurrent " + next[0]++);
            return () -> send(newVersion(documentId, "plan.pdf", content), adminToken, null).getStatus();
        });
        assertThat(statuses).containsOnly(201);
        assertThat(db.queryForList("SELECT version FROM document_versions WHERE document_id = ? ORDER BY version",
                Integer.class, documentId)).containsExactly(1, 2, 3, 4, 5, 6);
        assertThat(count("SELECT version FROM documents WHERE id = ?", documentId)).isEqualTo(6);
    }

    @Test
    void unknownOrInvalidVersionCannotBeDownloaded() throws Exception {
        UUID documentId = id(upload(clubA, "plan.pdf"));
        problem(get("/api/v1/documents/" + documentId + "/download").param("version", "9"), adminToken, null, 404,
                "DOCUMENT_VERSION_NOT_FOUND");
        problem(get("/api/v1/documents/" + documentId + "/download").param("version", "0"), adminToken, null, 400,
                "INVALID_DOCUMENT_VERSION");
    }

    @Test
    void listIsPagedNewestFirstAndFiltered() throws Exception {
        for (String name : List.of("alpha.pdf", "beta.pdf", "gamma.pdf")) upload(clubA, name);
        call(uploadTo(clubA, "rules.pdf", PDF_V1).param("appDetailKey", "club.rules"), adminToken, null, 201);
        upload(clubB, "other.pdf");

        JsonNode page = call(get("/api/v1/clubs/" + clubA + "/documents").param("limit", "2"), adminToken, null, 200);
        assertThat(page.path("total").asInt()).isEqualTo(4);
        assertThat(page.path("items").size()).isEqualTo(2);
        assertThat(page.at("/items/0/name").asText()).isEqualTo("rules.pdf");

        JsonNode byName = call(get("/api/v1/clubs/" + clubA + "/documents").param("name", "MM"), adminToken, null, 200);
        assertThat(byName.path("total").asInt()).isEqualTo(1);
        assertThat(byName.at("/items/0/name").asText()).isEqualTo("gamma.pdf");

        JsonNode byKey = call(get("/api/v1/clubs/" + clubA + "/documents").param("appDetailKey", "club.rules"),
                adminToken, null, 200);
        assertThat(byKey.path("total").asInt()).isEqualTo(1);
    }

    @Test
    void nameFilterTreatsWildcardsLiterally() throws Exception {
        upload(clubA, "100% done.pdf");
        upload(clubA, "plain.pdf");
        JsonNode found = call(get("/api/v1/clubs/" + clubA + "/documents").param("name", "%"), adminToken, null, 200);
        assertThat(found.path("total").asInt()).isEqualTo(1);
    }

    @Test
    void countAndNamesFollowSoftDeletes() throws Exception {
        UUID first = id(upload(clubA, "b.pdf"));
        upload(clubA, "A.pdf");
        call(uploadTo(clubA, "c.pdf", PDF_V1).param("appDetailKey", "event.report"), adminToken, null, 201);
        call(delete("/api/v1/documents/" + first), adminToken, null, 204);

        JsonNode live = call(get("/api/v1/clubs/" + clubA + "/documents/count"), adminToken, null, 200);
        assertThat(live.path("count").asLong()).isEqualTo(2);
        assertThat(live.path("deleted").asBoolean()).isFalse();
        assertThat(call(get("/api/v1/clubs/" + clubA + "/documents/count").param("deleted", "true"), adminToken, null, 200)
                .path("count").asLong()).isEqualTo(1);
        assertThat(call(get("/api/v1/clubs/" + clubA + "/documents/count").param("appDetailKey", "event.report"),
                adminToken, null, 200).path("count").asLong()).isEqualTo(1);

        JsonNode names = call(get("/api/v1/clubs/" + clubA + "/documents/names"), adminToken, null, 200);
        assertThat(json.convertValue(names.path("names"), List.class)).containsExactly("A.pdf", "c.pdf");
        JsonNode deletedNames = call(get("/api/v1/clubs/" + clubA + "/documents/names").param("deleted", "true"),
                adminToken, null, 200);
        assertThat(json.convertValue(deletedNames.path("names"), List.class)).containsExactly("b.pdf");
    }

    @Test
    void listingOfMissingClubIs404() throws Exception {
        problem(get("/api/v1/clubs/" + UUID.randomUUID() + "/documents"), adminToken, null, 404, "CLUB_NOT_FOUND");
        problem(get("/api/v1/clubs/" + UUID.randomUUID() + "/documents/count"), adminToken, null, 404, "CLUB_NOT_FOUND");
    }

    @Test
    void renameChecksTheNameAndKeepsTheExtension() throws Exception {
        UUID documentId = id(upload(clubA, "plan.pdf"));
        upload(clubA, "taken.pdf");
        JsonNode renamed = call(patch("/api/v1/documents/" + documentId), adminToken,
                Map.of("name", "Kế hoạch.pdf", "appDetailKey", "event.plan"), 200);
        assertThat(renamed.path("name").asText()).isEqualTo("Kế hoạch.pdf");
        assertThat(renamed.path("appDetailKey").asText()).isEqualTo("event.plan");
        problem(patch("/api/v1/documents/" + documentId), adminToken, Map.of("name", "TAKEN.pdf"), 409,
                "DOCUMENT_NAME_ALREADY_EXISTS");
        problem(patch("/api/v1/documents/" + documentId), adminToken, Map.of("name", "plan.docx"), 400,
                "DOCUMENT_TYPE_CHANGED");
        problem(patch("/api/v1/documents/" + documentId), adminToken, Map.of("name", "a/b.pdf"), 400,
                "INVALID_DOCUMENT_NAME");
        assertThat(call(patch("/api/v1/documents/" + documentId), adminToken, Map.of("appDetailKey", ""), 200)
                .path("appDetailKey").isNull()).isTrue();
    }

    @Test
    void softDeleteHidesTheDocumentButKeepsItsFile() throws Exception {
        JsonNode document = upload(clubA, "plan.pdf");
        UUID documentId = id(document);
        call(delete("/api/v1/documents/" + documentId), adminToken, null, 204);

        assertThat(count("SELECT count(*) FROM documents WHERE id = ? AND deleted AND deleted_by = ?", documentId, admin))
                .isEqualTo(1);
        assertThat(Files.exists(storage.getLocal().getRoot().resolve(document.path("path").asText()))).isTrue();
        assertThat(call(get("/api/v1/clubs/" + clubA + "/documents"), adminToken, null, 200).path("total").asInt()).isZero();
        JsonNode trash = call(get("/api/v1/clubs/" + clubA + "/documents").param("deleted", "true"), adminToken, null, 200);
        assertThat(trash.at("/items/0/deletedBy").asText()).isEqualTo(admin.toString());

        problem(delete("/api/v1/documents/" + documentId), adminToken, null, 410, "DOCUMENT_DELETED");
        problem(get("/api/v1/documents/" + documentId + "/download"), adminToken, null, 410, "DOCUMENT_DELETED");
        problem(newVersion(documentId, "plan.pdf", PDF_V2), adminToken, null, 410, "DOCUMENT_DELETED");
        problem(patch("/api/v1/documents/" + documentId), adminToken, Map.of("name", "x.pdf"), 410, "DOCUMENT_DELETED");
        assertThat(call(get("/api/v1/documents/" + documentId), adminToken, null, 200).path("deleted").asBoolean()).isTrue();
    }

    @Test
    void deletedNameCanBeReusedAndRestoreThenConflicts() throws Exception {
        UUID old = id(upload(clubA, "plan.pdf"));
        call(delete("/api/v1/documents/" + old), adminToken, null, 204);
        UUID replacement = id(upload(clubA, "plan.pdf"));
        problem(post("/api/v1/documents/" + old + "/restore"), adminToken, null, 409, "DOCUMENT_NAME_ALREADY_EXISTS");

        call(patch("/api/v1/documents/" + replacement), adminToken, Map.of("name", "plan-new.pdf"), 200);
        JsonNode restored = call(post("/api/v1/documents/" + old + "/restore"), adminToken, null, 200);
        assertThat(restored.path("deleted").asBoolean()).isFalse();
        assertThat(restored.path("deletedAt").isNull()).isTrue();
        assertThat(download(old, null).getContentAsByteArray()).isEqualTo(PDF_V1);
        problem(post("/api/v1/documents/" + old + "/restore"), adminToken, null, 409, "DOCUMENT_NOT_DELETED");
        assertThat(count("SELECT count(*) FROM audit_logs WHERE action IN ('DOCUMENT_DELETED', 'DOCUMENT_RESTORED') "
                + "AND resource_id = ?", old)).isEqualTo(2);
    }

    MockHttpServletResponse download(UUID documentId, Integer version) throws Exception {
        var request = get("/api/v1/documents/" + documentId + "/download");
        if (version != null) request.param("version", version.toString());
        MockHttpServletResponse response = send(request, adminToken, null);
        assertThat(response.getStatus()).as(response.getContentAsString()).isEqualTo(200);
        return response;
    }

    @Test
    void downloadStreamsTheFileWithSafeHeaders() throws Exception {
        JsonNode document = upload(clubA, "Biên bản.pdf");
        MockHttpServletResponse response = download(id(document), null);
        assertThat(response.getContentAsByteArray()).isEqualTo(PDF_V1);
        assertThat(response.getContentType()).isEqualTo("application/pdf");
        assertThat(response.getHeader("Content-Disposition"))
                .startsWith("attachment").contains("filename*=UTF-8''Bi%C3%AAn%20b%E1%BA%A3n.pdf");
        assertThat(response.getHeader("ETag")).isEqualTo("\"" + document.path("checksumSha256").asText() + "\"");
        assertThat(response.getHeader("X-Document-Version")).isEqualTo("1");
        assertThat(response.getHeader("X-Content-Type-Options")).isEqualTo("nosniff");
    }

    @Test
    void localStorageHasNoPresignedLinkSoTheApiPathIsReturned() throws Exception {
        UUID documentId = id(upload(clubA, "plan.pdf"));
        JsonNode link = call(get("/api/v1/documents/" + documentId + "/download-url"), adminToken, null, 200);
        assertThat(link.path("url").asText()).isEqualTo("/api/v1/documents/" + documentId + "/download?version=1");
        assertThat(link.path("expiresAt").isNull()).isTrue();
    }

    @Test
    void missingStoredFileIsAStorageError() throws Exception {
        JsonNode document = upload(clubA, "plan.pdf");
        Files.delete(storage.getLocal().getRoot().resolve(document.path("path").asText()));
        problem(get("/api/v1/documents/" + id(document) + "/download"), adminToken, null, 502, "DOCUMENT_STORAGE_ERROR");
    }

    @Test
    void everyEndpointNeedsAToken() throws Exception {
        UUID documentId = id(upload(clubA, "plan.pdf"));
        problem(get("/api/v1/clubs/" + clubA + "/documents"), null, null, 401, "UNAUTHORIZED");
        problem(get("/api/v1/documents/" + documentId + "/download"), null, null, 401, "UNAUTHORIZED");
        problem(uploadTo(clubA, "x.pdf", PDF_V1), null, null, 401, "UNAUTHORIZED");
    }

    @Test
    void outsidersSeeNothingAndCannotProbeIds() throws Exception {
        UUID documentId = id(upload(clubA, "plan.pdf"));
        problem(get("/api/v1/clubs/" + clubA + "/documents"), memberToken, null, 403, "PERMISSION_DENIED");
        problem(get("/api/v1/clubs/" + clubA + "/documents/names"), memberToken, null, 403, "PERMISSION_DENIED");
        problem(get("/api/v1/documents/" + documentId), memberToken, null, 403, "PERMISSION_DENIED");
        problem(get("/api/v1/documents/" + UUID.randomUUID()), memberToken, null, 403, "PERMISSION_DENIED");
        problem(get("/api/v1/documents/" + UUID.randomUUID()), adminToken, null, 404, "DOCUMENT_NOT_FOUND");
        problem(uploadTo(clubA, "x.pdf", PDF_V1), memberToken, null, 403, "PERMISSION_DENIED");
    }

    @Test
    void viewerOfOneClubCanReadButNotWriteAndNotOtherClubs() throws Exception {
        UUID documentId = id(upload(clubA, "plan.pdf"));
        UUID otherClubDocument = id(upload(clubB, "plan.pdf"));
        grant(member, "document.view", "CLUB", clubA, null);

        assertThat(call(get("/api/v1/clubs/" + clubA + "/documents"), memberToken, null, 200).path("total").asInt()).isEqualTo(1);
        assertThat(send(get("/api/v1/documents/" + documentId + "/download"), memberToken, null).getStatus()).isEqualTo(200);
        problem(get("/api/v1/documents/" + otherClubDocument), memberToken, null, 403, "PERMISSION_DENIED");
        problem(uploadTo(clubA, "x.pdf", PDF_V1), memberToken, null, 403, "PERMISSION_DENIED");
        problem(newVersion(documentId, "plan.pdf", PDF_V2), memberToken, null, 403, "PERMISSION_DENIED");
        problem(delete("/api/v1/documents/" + documentId), memberToken, null, 403, "PERMISSION_DENIED");
        problem(patch("/api/v1/documents/" + documentId), memberToken, Map.of("name", "x.pdf"), 403, "PERMISSION_DENIED");
        problem(get("/api/v1/clubs/" + clubA + "/documents").param("deleted", "true"), memberToken, null, 403,
                "PERMISSION_DENIED");
    }

    @Test
    void ownersMayRenameAndDeleteTheirOwnDocumentsOnly() throws Exception {
        grant(member, "document.view", "CLUB", clubA, null);
        grant(member, "document.upload", "CLUB", clubA, null);
        UUID own = id(call(uploadTo(clubA, "mine.pdf", PDF_V1), memberToken, null, 201));
        UUID others = id(upload(clubA, "theirs.pdf"));

        call(patch("/api/v1/documents/" + own), memberToken, Map.of("name", "mine-v2.pdf"), 200);
        problem(patch("/api/v1/documents/" + others), memberToken, Map.of("name", "x.pdf"), 403, "PERMISSION_DENIED");
        problem(delete("/api/v1/documents/" + others), memberToken, null, 403, "PERMISSION_DENIED");
        call(delete("/api/v1/documents/" + own), memberToken, null, 204);
        problem(get("/api/v1/documents/" + own), memberToken, null, 404, "DOCUMENT_NOT_FOUND");
        problem(post("/api/v1/documents/" + own + "/restore"), memberToken, null, 403, "PERMISSION_DENIED");
    }

    @Test
    void clubRolesCarryTheDocumentPermissions() throws Exception {
        UUID role = db.queryForObject("SELECT id FROM roles WHERE code = 'CLUB_MEMBER'", UUID.class);
        db.update("INSERT INTO user_roles(user_id, role_id, scope, club_id, granted_by) VALUES (?, ?, 'CLUB', ?, ?)",
                member, role, clubA, admin);
        upload(clubA, "plan.pdf");
        call(get("/api/v1/clubs/" + clubA + "/documents"), memberToken, null, 200);
        problem(uploadTo(clubA, "x.pdf", PDF_V1), memberToken, null, 403, "PERMISSION_DENIED");
        assertThat(db.queryForList("SELECT p.permission_key FROM role_permissions rp JOIN roles r ON r.id = rp.role_id "
                + "JOIN permissions p ON p.id = rp.permission_id WHERE r.code = 'CLUB_PRESIDENT' "
                + "AND p.permission_key LIKE 'document.%'", String.class)).hasSize(5);
    }

    @Test
    void databaseRefusesVersionGapsAndRewrites() throws Exception {
        UUID documentId = id(upload(clubA, "plan.pdf"));
        String checksum = "a".repeat(64);
        assertThatThrownBy(() -> db.update("INSERT INTO document_versions(document_id, version, path, original_name, "
                + "content_type, size_bytes, checksum_sha256, uploaded_by) VALUES (?, 3, 'x', 'x.pdf', 'application/pdf', 1, ?, ?)",
                documentId, checksum, admin)).hasMessageContaining("ck_document_versions_sequence");
        assertThatThrownBy(() -> db.update("UPDATE document_versions SET size_bytes = 99 WHERE document_id = ?", documentId))
                .hasMessageContaining("ck_document_versions_immutable");
    }

    @Test
    void databaseRefusesUnsafeNamesAndHalfDeletedRows() throws Exception {
        UUID documentId = id(upload(clubA, "plan.pdf"));
        assertThatThrownBy(() -> db.update("UPDATE documents SET name = '../x.pdf' WHERE id = ?", documentId))
                .hasMessageContaining("ck_documents_name_safe");
        assertThatThrownBy(() -> db.update("UPDATE documents SET deleted = true WHERE id = ?", documentId))
                .hasMessageContaining("ck_documents_deleted");
        assertThatThrownBy(() -> db.update("UPDATE documents SET app_detail_key = 'Bad Key' WHERE id = ?", documentId))
                .hasMessageContaining("ck_documents_app_detail_key_format");
    }
}
