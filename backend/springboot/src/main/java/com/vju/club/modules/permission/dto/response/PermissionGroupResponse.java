package com.vju.club.modules.permission.dto.response;

import java.util.List;

/** Permissions of one module, e.g. for rendering a checkbox group. */
public record PermissionGroupResponse(String module, List<PermissionResponse> permissions) { }
