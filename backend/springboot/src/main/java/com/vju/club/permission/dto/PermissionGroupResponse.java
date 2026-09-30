package com.vju.club.permission.dto;

import java.util.List;

/** Permissions of one module, e.g. for rendering a checkbox group. */
public record PermissionGroupResponse(String module, List<PermissionResponse> permissions) { }
