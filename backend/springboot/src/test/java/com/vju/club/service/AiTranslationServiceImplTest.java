package com.vju.club.service;

import com.vju.club.config.AiProperties;
import com.vju.club.dto.response.TranslateBatchResponse;
import com.vju.club.entity.I18nTranslation;
import com.vju.club.repository.I18nTranslationRepository;
import com.vju.club.service.impl.AiTranslationServiceImpl;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AiTranslationServiceImplTest {

    @Mock
    private I18nTranslationRepository repository;

    private static I18nTranslation entry(String locale, String sourceText, String translatedText) {
        I18nTranslation item = new I18nTranslation();
        item.setTargetLocale(locale);
        item.setSourceText(sourceText);
        item.setTranslatedText(translatedText);
        return item;
    }

    @Test
    void getCatalogFiltersOutDisallowedPbTagsWhileAllowingOfficialTelegramLabels() {
        when(repository.findByTargetLocale("en")).thenReturn(List.of(
                entry("en", "THÀNH VIÊN VJU", "VJU MEMBER"),
                entry("en", "THÀNH VIÊN VJU (PB-03)", "VJU MEMBER (PB-03)"),
                entry("en", "Thông báo Telegram", "Telegram notification")
        ));

        AiTranslationServiceImpl service = new AiTranslationServiceImpl(repository, new AiProperties());
        Map<String, String> catalog = service.getCatalog("en");

        assertThat(catalog)
                .containsEntry("THÀNH VIÊN VJU", "VJU MEMBER")
                .containsEntry("Thông báo Telegram", "Telegram notification")
                .doesNotContainKey("THÀNH VIÊN VJU (PB-03)");
    }

    @Test
    void translateBatchSkipsDisallowedFullWidthPbTagsFromDbAndInput() {
        when(repository.findByTargetLocale("ja")).thenReturn(List.of(
                entry("ja", "Cài đặt", "設定"),
                entry("ja", "Nhãn cũ", "古いラベル（PB-03）")
        ));
        when(repository.findByTargetLocaleAndSourceHashIn(eq("ja"), any())).thenReturn(List.of(
                entry("ja", "Kênh cũ", "古いチャンネル（PB-99）")
        ));

        AiTranslationServiceImpl service = new AiTranslationServiceImpl(repository, new AiProperties());
        TranslateBatchResponse response = service.translateBatch("ja", List.of(
                "Cài đặt",
                "THÀNH VIÊN VJU (PB-03)",
                "Kênh cũ"
        ));

        assertThat(response.translations())
                .containsEntry("Cài đặt", "設定")
                .doesNotContainKey("THÀNH VIÊN VJU (PB-03)")
                .doesNotContainKey("Kênh cũ");
        assertThat(service.getCatalog("ja")).doesNotContainKey("Nhãn cũ");
        verify(repository, never()).save(any());
    }
}
