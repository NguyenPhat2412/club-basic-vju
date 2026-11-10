package com.vju.club.controller;

import com.vju.club.annotation.PublicEndpoint;
import com.vju.club.common.ApiPaths;
import com.vju.club.dto.request.TranslateBatchRequest;
import com.vju.club.dto.response.TranslateBatchResponse;
import com.vju.club.service.AiTranslationService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping(ApiPaths.API_V1)
@RequiredArgsConstructor
@Tag(name = "Public i18n Translations", description = "9router AI translation & PostgreSQL cache for dynamic content")
public class PublicI18nController {
    private final AiTranslationService aiTranslationService;

    @PublicEndpoint
    @GetMapping(ApiPaths.PUBLIC_I18N_TRANSLATIONS)
    @Operation(summary = "Get cached dynamic translations for a target locale (en or ja)")
    public Map<String, String> getTranslations(@RequestParam(defaultValue = "en") String locale) {
        return aiTranslationService.getCatalog(locale);
    }

    @PublicEndpoint
    @PostMapping(ApiPaths.PUBLIC_I18N_TRANSLATE_BATCH)
    @Operation(summary = "Translate a batch of Vietnamese strings via 9router AI and store in PostgreSQL")
    public TranslateBatchResponse translateBatch(@Valid @RequestBody TranslateBatchRequest request) {
        return aiTranslationService.translateBatch(request.locale(), request.texts());
    }
}
