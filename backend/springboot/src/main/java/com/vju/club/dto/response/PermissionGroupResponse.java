package com.vju.club.dto.response;

import java.util.List;

public record PermissionGroupResponse(String module, List<PermissionResponse> permissions) { }
