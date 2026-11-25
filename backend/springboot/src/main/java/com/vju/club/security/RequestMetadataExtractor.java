package com.vju.club.security;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.web.context.request.RequestAttributes;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

public final class RequestMetadataExtractor {
    private static final int MAX_IP_LENGTH = 64;
    private static final int MAX_USER_AGENT_LENGTH = 512;

    public record Metadata(String ipAddress, String userAgent) {
    }

    private RequestMetadataExtractor() {
    }

    public static Metadata extractCurrent() {
        RequestAttributes attributes = RequestContextHolder.getRequestAttributes();
        if (attributes instanceof ServletRequestAttributes servletAttributes) {
            return extract(servletAttributes.getRequest());
        }
        return new Metadata(null, null);
    }

    public static Metadata extract(HttpServletRequest request) {
        if (request == null) {
            return new Metadata(null, null);
        }
        String ipAddress = extractIpAddress(request);
        String userAgent = sanitizeAndTruncate(request.getHeader("User-Agent"), MAX_USER_AGENT_LENGTH);
        return new Metadata(ipAddress, userAgent);
    }

    private static String extractIpAddress(HttpServletRequest request) {
        String forwarded = request.getHeader("X-Forwarded-For");
        if (forwarded != null && !forwarded.isBlank()) {
            for (String hop : forwarded.split(",")) {
                String sanitizedHop = sanitizeAndTruncate(hop, MAX_IP_LENGTH);
                if (sanitizedHop != null && !"unknown".equalsIgnoreCase(sanitizedHop)) {
                    return sanitizedHop;
                }
            }
        }
        return sanitizeAndTruncate(request.getRemoteAddr(), MAX_IP_LENGTH);
    }

    private static String sanitizeAndTruncate(String value, int maxLength) {
        if (value == null) {
            return null;
        }
        String cleaned = value.replace("\r", "").replace("\n", "").trim();
        if (cleaned.isEmpty()) {
            return null;
        }
        return cleaned.length() <= maxLength ? cleaned : cleaned.substring(0, maxLength);
    }
}
