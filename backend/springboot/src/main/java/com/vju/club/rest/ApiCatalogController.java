package com.vju.club.rest;

import com.vju.club.modules.auth.annotation.PublicEndpoint;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/v1/api-catalog")
@RequiredArgsConstructor
public class ApiCatalogController {
    private final ApiCatalogService catalogService;

    @PublicEndpoint(reason = "API inventory")
    @GetMapping
    public List<ApiCatalogEntry> getCatalog() {
        return catalogService.entries();
    }
}
