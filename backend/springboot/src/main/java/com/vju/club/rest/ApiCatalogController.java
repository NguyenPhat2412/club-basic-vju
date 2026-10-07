package com.vju.club.rest;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/v1/api-catalog")
public class ApiCatalogController {

    private final ApiCatalogService catalogService;

    public ApiCatalogController(ApiCatalogService catalogService) {
        this.catalogService = catalogService;
    }

    @GetMapping
    public List<ApiCatalogEntry> getCatalog() {
        return catalogService.entries();
    }
}
