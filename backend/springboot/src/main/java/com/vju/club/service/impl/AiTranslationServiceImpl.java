package com.vju.club.service.impl;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.vju.club.config.AiProperties;
import com.vju.club.dto.response.TranslateBatchResponse;
import com.vju.club.entity.I18nTranslation;
import com.vju.club.repository.I18nTranslationRepository;
import com.vju.club.service.AiTranslationService;
import jakarta.annotation.PreDestroy;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Duration;
import java.util.ArrayList;
import java.util.Collection;
import java.util.Collections;
import java.util.HexFormat;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

@Service
@Slf4j
public class AiTranslationServiceImpl implements AiTranslationService {
    private static final ObjectMapper JSON = new ObjectMapper();
    private static final Set<String> SUPPORTED_TARGETS = Set.of("en", "ja");
    private static final int MAX_TEXT_LENGTH = 2000;
    private static final int MAX_BATCH_SIZE = 30;

    private final I18nTranslationRepository repository;
    private final AiProperties aiProperties;
    private final HttpClient httpClient;
    private final ExecutorService backgroundExecutor;

    private final Map<String, Map<String, String>> memoryCatalog = new ConcurrentHashMap<>();
    private final Set<String> hydratedLocales = ConcurrentHashMap.newKeySet();

    public AiTranslationServiceImpl(I18nTranslationRepository repository, AiProperties aiProperties) {
        this.repository = repository;
        this.aiProperties = aiProperties;
        this.httpClient = HttpClient.newBuilder()
                .connectTimeout(Duration.ofSeconds(8))
                .build();
        this.backgroundExecutor = Executors.newSingleThreadExecutor(r -> {
            Thread t = new Thread(r, "9router-i18n-warmer");
            t.setDaemon(true);
            return t;
        });
    }

    @PreDestroy
    public void shutdown() {
        backgroundExecutor.shutdownNow();
    }

    @Override
    public Map<String, String> getCatalog(String localeInput) {
        String locale = normalizeLocale(localeInput);
        if (!SUPPORTED_TARGETS.contains(locale)) {
            return Collections.emptyMap();
        }
        ensureHydrated(locale);
        return Collections.unmodifiableMap(new LinkedHashMap<>(
                memoryCatalog.getOrDefault(locale, Collections.emptyMap())));
    }

    @Override
    public TranslateBatchResponse translateBatch(String localeInput, List<String> rawTexts) {
        String locale = normalizeLocale(localeInput);
        if (!SUPPORTED_TARGETS.contains(locale) || rawTexts == null || rawTexts.isEmpty()) {
            return new TranslateBatchResponse(locale, Collections.emptyMap(), "none");
        }

        ensureHydrated(locale);
        Map<String, String> localeCache = memoryCatalog.computeIfAbsent(locale, k -> new ConcurrentHashMap<>());

        List<String> normalizedUnique = new ArrayList<>();
        Set<String> seen = new LinkedHashSet<>();
        for (String raw : rawTexts) {
            String norm = normalizeText(raw);
            if (!norm.isEmpty() && norm.length() <= MAX_TEXT_LENGTH && seen.add(norm)) {
                normalizedUnique.add(norm);
                if (normalizedUnique.size() >= MAX_BATCH_SIZE) break;
            }
        }

        Map<String, String> result = new LinkedHashMap<>();
        List<String> missing = new ArrayList<>();

        for (String text : normalizedUnique) {
            String cached = localeCache.get(text);
            if (cached != null && !cached.isBlank()) {
                result.put(text, cached);
            } else {
                missing.add(text);
            }
        }

        if (missing.isEmpty()) {
            return new TranslateBatchResponse(locale, result, "db-cache");
        }

        // Check database in case another instance/thread stored any of the missing hashes
        Map<String, String> hashToSource = new LinkedHashMap<>();
        for (String m : missing) {
            hashToSource.put(sha256Hex(m), m);
        }
        List<I18nTranslation> dbHits = repository.findByTargetLocaleAndSourceHashIn(locale, hashToSource.keySet());
        for (I18nTranslation hit : dbHits) {
            localeCache.put(hit.getSourceText(), hit.getTranslatedText());
            result.put(hit.getSourceText(), hit.getTranslatedText());
            missing.remove(hit.getSourceText());
        }

        if (missing.isEmpty()) {
            return new TranslateBatchResponse(locale, result, "db-cache");
        }

        String providerUsed = "9router";
        Map<String, String> newlyTranslated = new LinkedHashMap<>();
        String modelLabel = aiProperties.getModel() != null ? aiProperties.getModel() : "9router";

        if (is9RouterConfigured()) {
            try {
                List<String> aiOutputs = call9RouterBatch(locale, missing);
                if (aiOutputs != null && aiOutputs.size() == missing.size()) {
                    for (int i = 0; i < missing.size(); i++) {
                        String src = missing.get(i);
                        String dst = normalizeText(aiOutputs.get(i));
                        if (!dst.isEmpty() && !dst.equals(src)) {
                            newlyTranslated.put(src, dst);
                        }
                    }
                }
            } catch (Exception ex) {
                log.warn("9router batch translation failed for locale {}, falling back: {}", locale, ex.getMessage());
            }
        }

        // Fallback for any item not resolved by 9router
        for (String src : missing) {
            if (!newlyTranslated.containsKey(src)) {
                String fallback = callFallbackGtx(locale, src);
                if (fallback != null && !fallback.isBlank() && !fallback.equals(src)) {
                    newlyTranslated.put(src, fallback);
                    if (providerUsed.equals("9router") && newlyTranslated.size() == 1) {
                        providerUsed = "gtx-fallback";
                        modelLabel = "gtx-fallback";
                    }
                }
            }
        }

        for (Map.Entry<String, String> entry : newlyTranslated.entrySet()) {
            String src = entry.getKey();
            String dst = entry.getValue();
            persistTranslation(locale, src, dst, modelLabel);
            localeCache.put(src, dst);
            result.put(src, dst);
        }

        return new TranslateBatchResponse(locale, result, providerUsed);
    }

    @Override
    public void warmTranslateAsync(Collection<String> texts) {
        if (texts == null || texts.isEmpty()) return;
        List<String> snapshot = texts.stream()
                .map(AiTranslationServiceImpl::normalizeText)
                .filter(s -> !s.isEmpty() && s.length() <= MAX_TEXT_LENGTH)
                .distinct()
                .toList();
        if (snapshot.isEmpty()) return;

        backgroundExecutor.submit(() -> {
            for (String locale : List.of("en", "ja")) {
                try {
                    translateBatch(locale, snapshot);
                } catch (Exception ex) {
                    log.debug("Background warm translation skipped for {}: {}", locale, ex.getMessage());
                }
            }
        });
    }

    private void ensureHydrated(String locale) {
        if (hydratedLocales.contains(locale)) return;
        Map<String, String> map = memoryCatalog.computeIfAbsent(locale, k -> new ConcurrentHashMap<>());
        try {
            List<I18nTranslation> existing = repository.findByTargetLocale(locale);
            for (I18nTranslation row : existing) {
                map.put(row.getSourceText(), row.getTranslatedText());
            }
            hydratedLocales.add(locale);
        } catch (Exception ex) {
            log.warn("Could not hydrate i18n catalog for locale {}: {}", locale, ex.getMessage());
        }
    }

    private void persistTranslation(String locale, String sourceText, String translatedText, String modelUsed) {
        String hash = sha256Hex(sourceText);
        try {
            I18nTranslation entity = repository.findBySourceHashAndTargetLocale(hash, locale)
                    .orElseGet(I18nTranslation::new);
            entity.setSourceHash(hash);
            entity.setTargetLocale(locale);
            entity.setSourceText(sourceText);
            entity.setTranslatedText(translatedText);
            entity.setModelUsed(modelUsed);
            repository.save(entity);
        } catch (Exception ex) {
            log.debug("Could not persist translation for hash {}: {}", hash, ex.getMessage());
        }
    }

    private boolean is9RouterConfigured() {
        return aiProperties != null
                && aiProperties.getBaseUrl() != null && !aiProperties.getBaseUrl().isBlank()
                && aiProperties.getApiKey() != null && !aiProperties.getApiKey().isBlank();
    }

    private List<String> call9RouterBatch(String targetLocale, List<String> sources) throws Exception {
        String targetLanguageName = "ja".equals(targetLocale)
                ? "Japanese (natural academic/university style for Vietnam Japan University - 日越大学)"
                : "English (natural academic/university style for Vietnam Japan University - VJU)";

        String systemPrompt = "You are the official academic translator for Vietnam Japan University (VJU - VNU Hanoi) Student Club Portal. "
                + "Translate the given JSON array of Vietnamese strings into " + targetLanguageName + ". "
                + "Rules:\n"
                + "1. Preserve proper club names and acronyms (Sun Pinkey, BigHeart, Monozukuri, NEB, Nichi-Etsu Bunka, VJUA, VJUB, VJUP, VJUS, ARC, VAC, Hasuko, OuveVJU, VJU, ĐHQGHN/VNU).\n"
                + "2. Return ONLY a valid JSON array of translated strings with the exact same number of elements and in the exact same order as the input array. Do not include markdown fences or explanations.";

        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("model", aiProperties.getModel());
        payload.put("stream", false);
        payload.put("messages", List.of(
                Map.of("role", "system", "content", systemPrompt),
                Map.of("role", "user", "content", JSON.writeValueAsString(sources))
        ));

        String endpoint = aiProperties.getBaseUrl().replaceAll("/+$", "") + "/chat/completions";
        HttpRequest req = HttpRequest.newBuilder()
                .uri(URI.create(endpoint))
                .timeout(Duration.ofSeconds(30))
                .header("Content-Type", "application/json")
                .header("Authorization", "Bearer " + aiProperties.getApiKey().strip())
                .POST(HttpRequest.BodyPublishers.ofString(JSON.writeValueAsString(payload)))
                .build();

        HttpResponse<String> res = httpClient.send(req, HttpResponse.BodyHandlers.ofString());
        if (res.statusCode() < 200 || res.statusCode() >= 300) {
            throw new IllegalStateException("9router HTTP " + res.statusCode());
        }

        String rawBody = res.body().strip();
        String content;
        if (rawBody.startsWith("data:")) {
            StringBuilder streamContent = new StringBuilder();
            for (String line : rawBody.split("\\R")) {
                String trimmed = line.strip();
                if (!trimmed.startsWith("data:")) continue;
                String jsonChunk = trimmed.substring(5).strip();
                if (jsonChunk.isEmpty() || "[DONE]".equals(jsonChunk)) continue;
                JsonNode chunkNode = JSON.readTree(jsonChunk);
                streamContent.append(chunkNode.at("/choices/0/delta/content").asText(""));
            }
            content = streamContent.toString().strip();
        } else {
            JsonNode root = JSON.readTree(rawBody);
            content = root.at("/choices/0/message/content").asText("").strip();
        }

        if (content.startsWith("```")) {
            content = content.replaceAll("^```(?:json)?\\s*", "").replaceAll("\\s*```$", "");
        }
        int firstBracket = content.indexOf('[');
        int lastBracket = content.lastIndexOf(']');
        if (firstBracket >= 0 && lastBracket > firstBracket) {
            content = content.substring(firstBracket, lastBracket + 1);
        }

        JsonNode arrayNode = JSON.readTree(content);
        if (!arrayNode.isArray()) return null;
        List<String> outputs = new ArrayList<>(arrayNode.size());
        for (JsonNode item : arrayNode) {
            outputs.add(item.asText("").strip());
        }
        return outputs;
    }

    private String callFallbackGtx(String targetLocale, String text) {
        try {
            String url = "https://translate.googleapis.com/translate_a/single?client=gtx&sl=vi&tl="
                    + URLEncoder.encode(targetLocale, StandardCharsets.UTF_8)
                    + "&dt=t&q=" + URLEncoder.encode(text, StandardCharsets.UTF_8);
            HttpRequest req = HttpRequest.newBuilder()
                    .uri(URI.create(url))
                    .timeout(Duration.ofSeconds(6))
                    .GET()
                    .build();
            HttpResponse<String> res = httpClient.send(req, HttpResponse.BodyHandlers.ofString());
            if (res.statusCode() != 200) return null;
            JsonNode root = JSON.readTree(res.body());
            JsonNode sentences = root.path(0);
            if (!sentences.isArray()) return null;
            StringBuilder sb = new StringBuilder();
            for (JsonNode seg : sentences) {
                if (seg.isArray() && seg.size() > 0) {
                    sb.append(seg.path(0).asText(""));
                }
            }
            return sb.toString().strip();
        } catch (Exception ex) {
            return null;
        }
    }

    private static String normalizeLocale(String localeInput) {
        if (localeInput == null) return "vi";
        String lower = localeInput.trim().toLowerCase(Locale.ROOT);
        if (lower.startsWith("en")) return "en";
        if (lower.startsWith("ja") || lower.startsWith("jp")) return "ja";
        return "vi";
    }

    private static String normalizeText(String raw) {
        if (raw == null) return "";
        return raw.replace('\u00a0', ' ').replaceAll("\\s+", " ").strip();
    }

    private static String sha256Hex(String input) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(input.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(hash);
        } catch (Exception ex) {
            throw new IllegalStateException("SHA-256 unavailable", ex);
        }
    }
}
