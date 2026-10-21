package com.vju.club.modules.chat.dto.record;

import java.util.List;

public record ExtractedDigest(
        String summary,
        List<String> decisions,
        List<String> suggestedTasks,
        List<String> suggestedEvents,
        String model
) {
}
