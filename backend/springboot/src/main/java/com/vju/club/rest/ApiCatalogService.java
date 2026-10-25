package com.vju.club.rest;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.dataformat.yaml.YAMLFactory;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.io.InputStream;
import java.util.List;
import java.util.Map;

@Service
public class ApiCatalogService {
    private final List<ApiCatalogEntry> entries;

    public ApiCatalogService() {
        this.entries = loadEntries();
    }

    public List<ApiCatalogEntry> entries() {
        return entries;
    }

    private List<ApiCatalogEntry> loadEntries() {
        ObjectMapper yamlMapper = new ObjectMapper(new YAMLFactory());
        try (InputStream input = new ClassPathResource("api/catalog.yml").getInputStream()) {
            Map<String, List<ApiCatalogEntry>> document = yamlMapper.readValue(
                    input, new TypeReference<>() { });
            List<ApiCatalogEntry> catalog = document.get("entries");
            if (catalog == null || catalog.isEmpty()) {
                throw new IllegalStateException("API catalog must contain at least one entry");
            }
            return List.copyOf(catalog);
        } catch (IOException | RuntimeException exception) {
            throw new IllegalStateException("Cannot load classpath:api/catalog.yml", exception);
        }
    }
}
