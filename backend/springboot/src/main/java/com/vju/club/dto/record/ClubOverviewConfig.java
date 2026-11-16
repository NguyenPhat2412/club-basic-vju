package com.vju.club.dto.record;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.DeserializationFeature;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Size;

import java.io.IOException;
import java.io.Serializable;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;

public record ClubOverviewConfig(
        @Size(max = 32) String preset,
        @Size(max = 500) String slogan,
        @Size(max = 300) String campusLocation,
        @Size(max = 300) String operatingSchedule,
        @Size(max = 10) List<@Size(max = 40) String> enabledBlocks,
        @Size(max = 10) List<@Valid CustomMetric> customMetrics,
        @Size(max = 10) List<@Valid HighlightItem> highlights
) implements Serializable {

    private static final ObjectMapper JSON = new ObjectMapper()
            .configure(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES, false);

    private static final Set<String> VALID_PRESETS = Set.of(
            "SPORTS", "ACADEMIC_TECH", "CULTURE_ARTS", "VOLUNTEER", "MEDIA_LIFESTYLE"
    );

    private static final Set<String> VALID_BLOCKS = Set.of(
            "metrics", "highlights", "schedule", "departments", "gallery"
    );

    private static final List<String> DEFAULT_BLOCKS = List.of(
            "metrics", "highlights", "schedule", "departments", "gallery"
    );

    public record CustomMetric(
            @Size(max = 160) String label,
            @Size(max = 80) String value,
            @Size(max = 300) String sub
    ) implements Serializable {
    }

    public record HighlightItem(
            @Size(max = 240) String title,
            @Size(max = 100) String tag,
            @Size(max = 800) String description
    ) implements Serializable {
    }

    public static ClubOverviewConfig empty() {
        return new ClubOverviewConfig(null, null, null, null, DEFAULT_BLOCKS, List.of(), List.of());
    }

    public static ClubOverviewConfig normalize(ClubOverviewConfig raw) {
        if (raw == null) {
            return empty();
        }
        String normPreset = trimMax(raw.preset(), 32);
        if (normPreset != null) {
            normPreset = normPreset.toUpperCase(Locale.ROOT);
            if (!VALID_PRESETS.contains(normPreset)) {
                normPreset = null;
            }
        }

        List<String> blocks;
        if (raw.enabledBlocks() == null) {
            blocks = DEFAULT_BLOCKS;
        } else {
            Set<String> dedup = new LinkedHashSet<>();
            for (String b : raw.enabledBlocks()) {
                if (b != null) {
                    String key = b.trim().toLowerCase(Locale.ROOT);
                    if (VALID_BLOCKS.contains(key)) {
                        dedup.add(key);
                    }
                }
            }
            blocks = List.copyOf(dedup);
        }

        List<CustomMetric> metrics = new ArrayList<>();
        if (raw.customMetrics() != null) {
            for (CustomMetric item : raw.customMetrics()) {
                if (item == null) continue;
                String label = trimMax(item.label(), 80);
                String value = trimMax(item.value(), 40);
                String sub = trimMax(item.sub(), 140);
                if (label != null && value != null) {
                    metrics.add(new CustomMetric(label, value, sub));
                    if (metrics.size() >= 4) break;
                }
            }
        }

        List<HighlightItem> highlights = new ArrayList<>();
        if (raw.highlights() != null) {
            for (HighlightItem item : raw.highlights()) {
                if (item == null) continue;
                String title = trimMax(item.title(), 120);
                String tag = trimMax(item.tag(), 50);
                String description = trimMax(item.description(), 360);
                if (title != null) {
                    highlights.add(new HighlightItem(title, tag, description));
                    if (highlights.size() >= 4) break;
                }
            }
        }

        return new ClubOverviewConfig(
                normPreset,
                trimMax(raw.slogan(), 240),
                trimMax(raw.campusLocation(), 200),
                trimMax(raw.operatingSchedule(), 200),
                blocks,
                List.copyOf(metrics),
                List.copyOf(highlights)
        );
    }

    public static ClubOverviewConfig fromJson(String json) {
        if (json == null || json.isBlank() || "{}".equals(json.trim())) {
            return empty();
        }
        try {
            return normalize(JSON.readValue(json, ClubOverviewConfig.class));
        } catch (IOException ignored) {
            return empty();
        }
    }

    public static String toJson(ClubOverviewConfig config) {
        ClubOverviewConfig normalized = normalize(config);
        try {
            return JSON.writeValueAsString(normalized);
        } catch (JsonProcessingException ignored) {
            return "{}";
        }
    }

    public static String defaultSeedJson(String code, String activityField) {
        String field = activityField != null ? activityField.toLowerCase(Locale.ROOT) : "";
        String preset = field.contains("thể thao") ? "SPORTS"
                : (field.contains("học thuật") || field.contains("công nghệ")) ? "ACADEMIC_TECH"
                : field.contains("tình nguyện") ? "VOLUNTEER"
                : (field.contains("nghệ thuật") || field.contains("văn hoá") || field.contains("mỹ thuật")) ? "CULTURE_ARTS"
                : "MEDIA_LIFESTYLE";
        return toJson(new ClubOverviewConfig(
                preset,
                "Không gian rèn luyện kỹ năng, gắn kết sinh viên VJU tại hai cơ sở Hòa Lạc & Mỹ Đình",
                "Cơ sở Hòa Lạc & Cơ sở Mỹ Đình",
                "Sinh hoạt định kỳ hàng tuần theo lịch Ban chuyên môn",
                DEFAULT_BLOCKS,
                List.of(
                        new CustomMetric("Cơ sở hoạt động", "02 cơ sở", "Hòa Lạc & Mỹ Đình"),
                        new CustomMetric("Đợt tuyển quân", "02 kỳ/năm", "Mùa Thu & Mùa Xuân")
                ),
                List.of(
                        new HighlightItem("Hoạt động thường niên " + code, "Tiêu biểu",
                                "Chương trình trọng điểm kết nối thành viên và cộng tác viên toàn trường.")
                )
        ));
    }

    public List<String> translatableTexts() {
        List<String> out = new ArrayList<>();
        addIfPresent(out, slogan);
        addIfPresent(out, campusLocation);
        addIfPresent(out, operatingSchedule);
        if (customMetrics != null) {
            for (CustomMetric m : customMetrics) {
                addIfPresent(out, m.label());
                addIfPresent(out, m.value());
                addIfPresent(out, m.sub());
            }
        }
        if (highlights != null) {
            for (HighlightItem h : highlights) {
                addIfPresent(out, h.title());
                addIfPresent(out, h.tag());
                addIfPresent(out, h.description());
            }
        }
        return out;
    }

    private static void addIfPresent(List<String> list, String value) {
        if (value != null && !value.isBlank()) {
            list.add(value);
        }
    }

    private static String trimMax(String input, int maxLen) {
        if (input == null) return null;
        String trimmed = input.trim();
        if (trimmed.isEmpty()) return null;
        return trimmed.length() <= maxLen ? trimmed : trimmed.substring(0, maxLen).trim();
    }
}
