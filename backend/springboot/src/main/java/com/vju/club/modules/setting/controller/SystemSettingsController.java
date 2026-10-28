package com.vju.club.modules.setting.controller;

import com.vju.club.security.Actor;
import com.vju.club.modules.setting.dto.SystemSettingsResponse;
import com.vju.club.modules.setting.dto.UpdateSystemSettingsRequest;
import com.vju.club.modules.setting.service.SystemSettingsService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/system-settings")
@RequiredArgsConstructor
public class SystemSettingsController {
    private final SystemSettingsService service;

    @GetMapping
    public SystemSettingsResponse get(Actor actor) {
        return service.get(actor);
    }

    @PutMapping
    public SystemSettingsResponse update(Actor actor, @Valid @RequestBody UpdateSystemSettingsRequest request) {
        return service.update(actor, request);
    }
}
