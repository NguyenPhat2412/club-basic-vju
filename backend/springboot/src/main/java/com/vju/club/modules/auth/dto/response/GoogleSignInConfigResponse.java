package com.vju.club.modules.auth.dto.response;

import java.util.List;

public record GoogleSignInConfigResponse(boolean enabled, String clientId, List<String> allowedDomains) { }
