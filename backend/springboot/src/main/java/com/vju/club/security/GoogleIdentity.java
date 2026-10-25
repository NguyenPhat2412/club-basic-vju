package com.vju.club.security;

public record GoogleIdentity(String subject, String email, boolean emailVerified, String hostedDomain) { }
