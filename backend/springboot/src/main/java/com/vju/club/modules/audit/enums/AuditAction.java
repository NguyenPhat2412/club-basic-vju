package com.vju.club.modules.audit.enums;

/** Every audited business action, with the kind of resource it applies to. */
public enum AuditAction {
    USER_REGISTERED(ResourceType.USER),
    USER_PROFILE_UPDATED(ResourceType.USER),
    USER_PASSWORD_CHANGED(ResourceType.USER),
    USER_LOCKED(ResourceType.USER),
    USER_UNLOCKED(ResourceType.USER),

    CLUB_CREATED(ResourceType.CLUB),
    CLUB_UPDATED(ResourceType.CLUB),
    CLUB_ACTIVATED(ResourceType.CLUB),
    CLUB_DEACTIVATED(ResourceType.CLUB),

    DEPARTMENT_CREATED(ResourceType.DEPARTMENT),
    DEPARTMENT_UPDATED(ResourceType.DEPARTMENT),
    DEPARTMENT_ACTIVATED(ResourceType.DEPARTMENT),
    DEPARTMENT_DEACTIVATED(ResourceType.DEPARTMENT),

    MEMBER_ADDED(ResourceType.MEMBERSHIP),
    MEMBER_STATUS_CHANGED(ResourceType.MEMBERSHIP),
    MEMBER_REMOVED(ResourceType.MEMBERSHIP),

    DEPARTMENT_MEMBER_ADDED(ResourceType.DEPARTMENT_MEMBER),
    DEPARTMENT_MEMBER_MOVED(ResourceType.DEPARTMENT_MEMBER),
    DEPARTMENT_MEMBER_REMOVED(ResourceType.DEPARTMENT_MEMBER),

    CLUB_APPLICATION_CREATED(ResourceType.APPLICATION),
    CLUB_APPLICATION_CANCELLED(ResourceType.APPLICATION),
    CLUB_APPLICATION_APPROVED(ResourceType.APPLICATION),
    CLUB_APPLICATION_REJECTED(ResourceType.APPLICATION),
    MEMBERSHIP_CREATED(ResourceType.MEMBERSHIP),

    PERMISSION_GRANTED(ResourceType.PERMISSION_GRANT),
    PERMISSION_REVOKED(ResourceType.PERMISSION_GRANT),

    ROLE_CREATED(ResourceType.ROLE),
    ROLE_UPDATED(ResourceType.ROLE),
    ROLE_ASSIGNED(ResourceType.ROLE_ASSIGNMENT),
    ROLE_REVOKED(ResourceType.ROLE_ASSIGNMENT);

    public enum ResourceType { USER, CLUB, DEPARTMENT, MEMBERSHIP, DEPARTMENT_MEMBER, PERMISSION_GRANT, ROLE, ROLE_ASSIGNMENT, APPLICATION }

    private final ResourceType resourceType;

    AuditAction(ResourceType resourceType) {
        this.resourceType = resourceType;
    }

    public ResourceType resourceType() {
        return resourceType;
    }
}
