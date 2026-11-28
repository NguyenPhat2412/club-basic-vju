package com.vju.club.security;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.HttpHeaders;
import org.springframework.http.server.ServerHttpRequest;
import org.springframework.web.context.request.RequestAttributes;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

import java.net.InetSocketAddress;

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

    public static Metadata extract(ServerHttpRequest request) {
        if (request == null) {
            return new Metadata(null, null);
        }
        HttpHeaders headers = request.getHeaders();
        String ip = firstValidHeaderIp(
                headers.getFirst("CF-Connecting-IP"),
                headers.getFirst("X-Real-IP"),
                headers.getFirst("X-Forwarded-For"));
        if (ip == null) {
            InetSocketAddress remote = request.getRemoteAddress();
            if (remote != null && remote.getAddress() != null) {
                ip = sanitizeAndTruncate(remote.getAddress().getHostAddress(), MAX_IP_LENGTH);
            } else if (remote != null) {
                ip = sanitizeAndTruncate(remote.getHostString(), MAX_IP_LENGTH);
            }
        }
        String userAgent = sanitizeAndTruncate(headers.getFirst("User-Agent"), MAX_USER_AGENT_LENGTH);
        return new Metadata(ip, userAgent);
    }

    private static String extractIpAddress(HttpServletRequest request) {
        String ip = firstValidHeaderIp(
                request.getHeader("CF-Connecting-IP"),
                request.getHeader("X-Real-IP"),
                request.getHeader("X-Forwarded-For"));
        if (ip != null) {
            return ip;
        }
        return sanitizeAndTruncate(request.getRemoteAddr(), MAX_IP_LENGTH);
    }

    private static String firstValidHeaderIp(String cfConnectingIp, String realIp, String forwardedFor) {
        String cf = sanitizeIp(cfConnectingIp);
        if (cf != null) return cf;
        String real = sanitizeIp(realIp);
        if (real != null) return real;
        if (forwardedFor != null && !forwardedFor.isBlank()) {
            for (String hop : forwardedFor.split(",")) {
                String candidate = sanitizeIp(hop);
                if (candidate != null) {
                    return candidate;
                }
            }
        }
        return null;
    }

    private static String sanitizeIp(String raw) {
        String sanitized = sanitizeAndTruncate(raw, MAX_IP_LENGTH);
        if (sanitized == null || "unknown".equalsIgnoreCase(sanitized)) {
            return null;
        }
        return sanitized;
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
