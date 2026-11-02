package com.vju.club.dto.record;

import com.vju.club.dto.response.AuthResponse;
import com.vju.club.security.ClubPrincipal;

public record SignedIn(ClubPrincipal principal, AuthResponse response) { }
