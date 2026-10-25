package com.vju.club.rest;

import org.junit.jupiter.api.Test;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;
import static org.hamcrest.Matchers.equalTo;
import static org.hamcrest.Matchers.everyItem;
import static org.hamcrest.Matchers.hasItem;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;

class ApiCatalogControllerTest {
    @Test
    void catalogExposesImplementedAndPlannedRoutesForSpringBootBackend() throws Exception {
        ApiCatalogService service = new ApiCatalogService();
        MockMvc mockMvc = org.springframework.test.web.servlet.setup.MockMvcBuilders
                .standaloneSetup(new ApiCatalogController(service))
                .build();

        mockMvc.perform(get("/api/v1/api-catalog"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[?(@.path == '/api/v1/api-catalog')].status", hasItem("IMPLEMENTED")))
                .andExpect(jsonPath("$[?(@.path == '/api/v1/users')].status", hasItem("IMPLEMENTED")))
                .andExpect(jsonPath("$[?(@.path == '/api/v1/clubs/{clubId}/applications')].status", hasItem("IMPLEMENTED")))
                .andExpect(jsonPath("$[?(@.path == '/api/v1/users/me/applications')].status", hasItem("IMPLEMENTED")))
                .andExpect(jsonPath("$[?(@.path == '/api/v1/users/me/memberships')].status", hasItem("IMPLEMENTED")))
                .andExpect(jsonPath("$[*].backend", everyItem(equalTo("backend/springboot"))));
    }

    @Test
    void packagedOpenApiContractIsDownloadable() throws Exception {
        MockMvc mockMvc = org.springframework.test.web.servlet.setup.MockMvcBuilders
                .standaloneSetup(new ApiDocsController()).build();
        mockMvc.perform(get("/api-docs/phase1.yaml"))
                .andExpect(status().isOk())
                .andExpect(content().contentTypeCompatibleWith("application/yaml"))
                .andExpect(content().string(org.hamcrest.Matchers.containsString("openapi: 3.1.0")));
    }
}
