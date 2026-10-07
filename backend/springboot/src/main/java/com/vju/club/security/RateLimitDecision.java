package com.vju.club.security;

public record RateLimitDecision(boolean allowed, long remaining, long retryAfterSeconds) {
}
