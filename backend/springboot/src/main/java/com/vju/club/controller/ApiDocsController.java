package com.vju.club.controller;

import com.vju.club.annotation.PublicEndpoint;
import com.vju.club.common.ApiPaths;
import org.springframework.core.io.ClassPathResource;
import org.springframework.core.io.Resource;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class ApiDocsController {
    @PublicEndpoint(reason = "Published API contract")
    @GetMapping(value = ApiPaths.OPENAPI_PHASE1_YAML, produces = "application/yaml")
    public ResponseEntity<Resource> phase1Contract() {
        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType("application/yaml"))
                .body(new ClassPathResource("api/phase1-openapi.yaml"));
    }
}

