package com.vju.club.rest;

import org.springframework.core.io.ClassPathResource;
import org.springframework.core.io.Resource;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class ApiDocsController {
    @GetMapping(value = "/api-docs/phase1.yaml", produces = "application/yaml")
    public ResponseEntity<Resource> phase1Contract() {
        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType("application/yaml"))
                .body(new ClassPathResource("api/phase1-openapi.yaml"));
    }
}
