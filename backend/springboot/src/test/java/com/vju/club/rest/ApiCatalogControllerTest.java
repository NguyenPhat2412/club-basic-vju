package com.vju.club.rest;

import org.junit.jupiter.api.Test;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;
import static org.hamcrest.Matchers.equalTo;
import static org.hamcrest.Matchers.everyItem;
import static org.hamcrest.Matchers.hasItem;

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
                .andExpect(jsonPath("$[?(@.path == '/api/v1/auth/register')].status", hasItem("PLANNED")))
                .andExpect(jsonPath("$[*].backend", everyItem(equalTo("backend/springboot"))));
    }
}
