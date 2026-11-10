package com.vju.club.service;

import com.vju.club.dto.response.TranslateBatchResponse;

import java.util.Collection;
import java.util.List;
import java.util.Map;

public interface AiTranslationService {
    Map<String, String> getCatalog(String locale);

    TranslateBatchResponse translateBatch(String locale, List<String> texts);

    void warmTranslateAsync(Collection<String> texts);
}
