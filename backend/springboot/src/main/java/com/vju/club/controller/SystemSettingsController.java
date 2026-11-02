package com.vju.club.controller;

import com.vju.club.common.ApiPaths;
import com.vju.club.security.Actor;
import com.vju.club.dto.response.SystemSettingsResponse;
import com.vju.club.dto.request.UpdateSystemSettingsRequest;
import com.vju.club.service.SystemSettingsService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping(ApiPaths.API_V1)
@RequiredArgsConstructor
public class SystemSettingsController {
    private final SystemSettingsService service;

    @GetMapping(ApiPaths.SYSTEM_SETTINGS)
    public SystemSettingsResponse get(Actor actor) {
        return service.get(actor);
    }

    @PutMapping(ApiPaths.SYSTEM_SETTINGS)
    public SystemSettingsResponse update(Actor actor, @Valid @RequestBody UpdateSystemSettingsRequest request) {
        return service.update(actor, request);
    }
}
