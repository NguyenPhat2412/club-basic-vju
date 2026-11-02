package com.vju.club.controller;

import com.vju.club.annotation.PublicEndpoint;
import com.vju.club.common.ApiPaths;
import com.vju.club.dto.response.ApiCatalogEntry;
import com.vju.club.service.ApiCatalogService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping(ApiPaths.API_V1)
@RequiredArgsConstructor
public class ApiCatalogController {
    private final ApiCatalogService catalogService;

    @PublicEndpoint(reason = "API inventory")
    @GetMapping(ApiPaths.API_CATALOG)
    public List<ApiCatalogEntry> getCatalog() {
        return catalogService.entries();
    }
}

