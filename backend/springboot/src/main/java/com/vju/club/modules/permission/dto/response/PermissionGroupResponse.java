package com.vju.club.modules.permission.dto.response;

import java.util.List;

public record PermissionGroupResponse(String module, List<PermissionResponse> permissions) { }
