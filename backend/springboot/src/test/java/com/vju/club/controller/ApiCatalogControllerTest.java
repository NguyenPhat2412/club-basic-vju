package com.vju.club.controller;

import com.vju.club.common.ApiPaths;
import com.vju.club.service.ApiCatalogService;
import com.vju.club.service.impl.ApiCatalogServiceImpl;
import org.junit.jupiter.api.Test;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.equalTo;
import static org.hamcrest.Matchers.everyItem;
import static org.hamcrest.Matchers.hasItem;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class ApiCatalogControllerTest {
    @Test
    void catalogExposesImplementedAndPlannedRoutesForSpringBootBackend() throws Exception {
        ApiCatalogService service = new ApiCatalogServiceImpl();
        MockMvc mockMvc = MockMvcBuilders
                .standaloneSetup(new ApiCatalogController(service))
                .build();

        mockMvc.perform(get(ApiPaths.API_V1 + ApiPaths.API_CATALOG))
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
        MockMvc mockMvc = MockMvcBuilders
                .standaloneSetup(new ApiDocsController()).build();
        mockMvc.perform(get(ApiPaths.OPENAPI_PHASE1_YAML))
                .andExpect(status().isOk())
                .andExpect(content().contentTypeCompatibleWith("application/yaml"))
                .andExpect(content().string(containsString("openapi: 3.1.0")));
    }
}

