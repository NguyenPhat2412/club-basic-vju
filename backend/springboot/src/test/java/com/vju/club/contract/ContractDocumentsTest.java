package com.vju.club.contract;

import org.junit.jupiter.api.Test;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;

import static org.assertj.core.api.Assertions.assertThat;

/** The API contract lives in docs/api; the copy served at runtime must never drift from it. */
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
}
