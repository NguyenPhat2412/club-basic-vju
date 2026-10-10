package com.vju.club.modules.auth.common;

public final class AuthConstants {
    private AuthConstants() {
    }

    public static final String TOKEN_PREFIX = "Bearer ";
    public static final String HEADER_AUTHORIZATION = "Authorization";
    public static final String COOKIE_ACCESS_TOKEN = "access_token";
    public static final String COOKIE_REFRESH_TOKEN = "refresh_token";

    public static final long DEFAULT_ACCESS_TOKEN_MINUTES = 60;
    public static final long DEFAULT_REFRESH_TOKEN_DAYS = 30;
}
