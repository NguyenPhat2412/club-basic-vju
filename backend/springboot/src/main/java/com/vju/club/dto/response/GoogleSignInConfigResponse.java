package com.vju.club.dto.response;

import java.util.List;

public record GoogleSignInConfigResponse(boolean enabled, String clientId, List<String> allowedDomains) { }
