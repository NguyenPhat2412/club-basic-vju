package com.vju.club.modules.audit.specification;

import com.vju.club.modules.audit.entity.AuditLog;
import org.springframework.data.jpa.domain.Specification;

import java.util.UUID;

public final class AuditLogSpecifications {

    private AuditLogSpecifications() {}

    public static Specification<AuditLog> hasResourceType(String resourceType) {
        return (root, query, cb) -> resourceType == null ? null : cb.equal(root.get("resourceType"), resourceType);
    }

    public static Specification<AuditLog> hasResourceId(UUID resourceId) {
        return (root, query, cb) -> resourceId == null ? null : cb.equal(root.get("resourceId"), resourceId);
    }

    public static Specification<AuditLog> hasActorUserId(UUID actorUserId) {
        return (root, query, cb) -> actorUserId == null ? null : cb.equal(root.get("actorUserId"), actorUserId);
    }

    public static Specification<AuditLog> hasClubId(UUID clubId) {
        return (root, query, cb) -> clubId == null ? null : cb.equal(root.get("clubId"), clubId);
    }

    public static Specification<AuditLog> hasAction(String action) {
        return (root, query, cb) -> action == null ? null : cb.equal(root.get("action"), action);
    }
}
