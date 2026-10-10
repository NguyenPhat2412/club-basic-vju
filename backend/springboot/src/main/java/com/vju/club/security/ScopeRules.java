package com.vju.club.security;

import com.vju.club.modules.permission.enums.PermissionScope;

import java.util.UUID;

public final class ScopeRules {
    private ScopeRules() { }

    public static int breadth(PermissionScope scope) {
        return switch (scope) {
            case DEPARTMENT -> 0;
            case CLUB -> 1;
            case GLOBAL -> 2;
        };
    }

    public static boolean canGrantAt(PermissionScope itemScope, PermissionScope grantScope) {
        return breadth(grantScope) >= breadth(itemScope);
    }

    public static boolean targetMatches(PermissionScope scope, UUID clubId, UUID departmentId) {
        return switch (scope) {
            case GLOBAL -> clubId == null && departmentId == null;
            case CLUB -> clubId != null && departmentId == null;
            case DEPARTMENT -> clubId == null && departmentId != null;
        };
    }
}
