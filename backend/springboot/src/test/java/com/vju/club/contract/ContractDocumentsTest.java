package com.vju.club.contract;

import com.vju.club.dto.response.NotificationResponse;
import org.junit.jupiter.api.Test;
import org.yaml.snakeyaml.Yaml;

import java.io.IOException;
import java.lang.reflect.RecordComponent;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Arrays;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

import static org.assertj.core.api.Assertions.assertThat;

class ContractDocumentsTest {
    private static final Path DOCS = Path.of("../../docs/api");
    private static final Path RUNTIME = Path.of("src/main/resources/api");

    @Test
    void runtimeOpenApiMatchesDocs() throws IOException {
        assertThat(Files.mismatch(DOCS.resolve("openapi.yaml"), RUNTIME.resolve("phase1-openapi.yaml")))
                .as("Copy docs/api/openapi.yaml to src/main/resources/api/phase1-openapi.yaml").isEqualTo(-1L);
    }

    @Test
    void runtimeCatalogMatchesDocs() throws IOException {
        assertThat(Files.mismatch(DOCS.resolve("catalog.yml"), RUNTIME.resolve("catalog.yml")))
                .as("Copy docs/api/catalog.yml to src/main/resources/api/catalog.yml").isEqualTo(-1L);
    }

    @Test
    void phaseTwoContractDocumentsContainApplicationWorkflowAndPermissions() throws IOException {
        String openApi = Files.readString(DOCS.resolve("openapi.yaml"));
        String catalog = Files.readString(DOCS.resolve("catalog.yml"));
        for (String path : new String[]{
                "/clubs/{clubId}/applications",
                "/users/me/applications",
                "/users/me/memberships",
                "/clubs/{clubId}/applications/{applicationId}/approve",
                "/clubs/{clubId}/applications/{applicationId}/reject"}) {
            assertThat(openApi).contains(path);
            assertThat(catalog).contains(path);
        }
        assertThat(openApi).contains("application.approve").contains("application.reject");
    }

    @Test
    @SuppressWarnings("unchecked")
    void openApiCatalogAndNotificationSchemaStayInExactParity() throws IOException {
        Yaml yaml = new Yaml();
        Map<String, Object> doc = yaml.load(Files.readString(DOCS.resolve("openapi.yaml")));
        Map<String, Object> catalogDoc = yaml.load(Files.readString(DOCS.resolve("catalog.yml")));
        List<Map<String, Object>> entries = (List<Map<String, Object>>) catalogDoc.get("entries");

        Map<String, Object> paths = (Map<String, Object>) doc.get("paths");
        assertThat(entries).hasSize(161);
        for (Map<String, Object> entry : entries) {
            String subPath = ((String) entry.get("path")).substring("/api/v1".length());
            String method = ((String) entry.get("method")).toLowerCase();
            assertThat(paths).containsKey(subPath);
            Map<String, Object> op = (Map<String, Object>) ((Map<String, Object>) paths.get(subPath)).get(method);
            assertThat(op).isNotNull();
            Map<String, Object> responses = (Map<String, Object>) op.get("responses");
            responses.forEach((code, respObj) -> {
                String codeStr = String.valueOf(code);
                if (codeStr.startsWith("2") && !"204".equals(codeStr)) {
                    Map<String, Object> resp = (Map<String, Object>) respObj;
                    assertThat(resp).as("2xx non-204 response on %s %s must define content", method, subPath)
                            .containsKey("content");
                }
            });
        }

        Map<String, Object> schemas = (Map<String, Object>) ((Map<String, Object>) doc.get("components")).get("schemas");
        Map<String, Object> notifProps = (Map<String, Object>) ((Map<String, Object>) schemas.get("Notification")).get("properties");
        Set<String> recordFields = Arrays.stream(NotificationResponse.class.getRecordComponents())
                .map(RecordComponent::getName)
                .collect(Collectors.toSet());
        assertThat(notifProps.keySet()).isEqualTo(recordFields);
        assertThat(schemas).containsKey("NotificationUnreadSummary");
    }
}
