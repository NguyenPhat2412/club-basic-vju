package com.vju.club.service.impl;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.dataformat.yaml.YAMLFactory;
import com.vju.club.dto.response.ApiCatalogEntry;
import com.vju.club.service.ApiCatalogService;
import lombok.RequiredArgsConstructor;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.io.InputStream;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class ApiCatalogServiceImpl implements ApiCatalogService {
    private final List<ApiCatalogEntry> entries = loadEntries();

    @Override
    public List<ApiCatalogEntry> entries() {
        return entries;
    }

    private static List<ApiCatalogEntry> loadEntries() {
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

