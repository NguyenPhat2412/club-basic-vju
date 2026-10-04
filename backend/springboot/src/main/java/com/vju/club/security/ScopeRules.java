package com.vju.club.security;

import com.vju.club.entity.PermissionScope;

import java.util.UUID;

/** Scope rules shared by permission grants and role assignments. */
public final class ScopeRules {

    private ScopeRules() { }

    /** DEPARTMENT (0) < CLUB (1) < GLOBAL (2); mirrors {@code scope_rank()} in the database. */
    public static int breadth(PermissionScope scope) {
        return switch (scope) {
            case DEPARTMENT -> 0;
            case CLUB -> 1;
            case GLOBAL -> 2;
        };
    }

    /** Something defined at {@code itemScope} may be granted at that scope or any broader one. */
    public static boolean canGrantAt(PermissionScope itemScope, PermissionScope grantScope) {
        return breadth(grantScope) >= breadth(itemScope);
    }

    /** GLOBAL has no target, CLUB needs exactly a club, DEPARTMENT exactly a department. */
    public static boolean targetMatches(PermissionScope scope, UUID clubId, UUID departmentId) {
        return switch (scope) {
            case GLOBAL -> clubId == null && departmentId == null;
            case CLUB -> clubId != null && departmentId == null;
            case DEPARTMENT -> clubId == null && departmentId != null;
        };
    }
}
