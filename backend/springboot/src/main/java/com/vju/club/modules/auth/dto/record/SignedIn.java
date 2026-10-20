package com.vju.club.modules.auth.dto.record;

import com.vju.club.modules.auth.dto.response.AuthResponse;
import com.vju.club.security.ClubPrincipal;

public record SignedIn(ClubPrincipal principal, AuthResponse response) { }
