package com.vju.club.common;

import com.vju.club.error.ApiException;
import org.springframework.http.HttpStatus;

import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.util.regex.Pattern;

public final class AcademicTermUtil {
    public static final ZoneId VJU_ZONE = ZoneId.of("Asia/Ho_Chi_Minh");
    private static final Pattern TERM_PATTERN = Pattern.compile("^\\d{4}-[123]$");

    private AcademicTermUtil() {
    }

    public static String deriveFromStartTime(OffsetDateTime startTime) {
        if (startTime == null) {
            return null;
        }
        ZonedDateTime vnTime = startTime.atZoneSameInstant(VJU_ZONE);
        int year = vnTime.getYear();
        int month = vnTime.getMonthValue();
        if (month >= 9) {
            return year + "-1";
        }
        if (month <= 5) {
            return (year - 1) + "-2";
        }
        return (year - 1) + "-3";
    }

    public static String normalizeAndValidate(String academicTerm) {
        if (academicTerm == null || academicTerm.isBlank()) {
            return null;
        }
        String stripped = academicTerm.strip();
        if (!TERM_PATTERN.matcher(stripped).matches()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "INVALID_ACADEMIC_TERM",
                    "Học kỳ phải theo định dạng YYYY-1, YYYY-2 hoặc YYYY-3 (ví dụ: 2026-1)");
        }
        return stripped;
    }

    public static String resolveOrDerive(String requestedTerm, OffsetDateTime startTime) {
        String normalized = normalizeAndValidate(requestedTerm);
        return normalized != null ? normalized : deriveFromStartTime(startTime);
    }
}
