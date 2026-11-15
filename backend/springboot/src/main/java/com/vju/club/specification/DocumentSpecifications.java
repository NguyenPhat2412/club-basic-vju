package com.vju.club.specification;

import com.vju.club.entity.Document;
import com.vju.club.enums.DocumentScope;
import com.vju.club.enums.DocumentVisibility;
import jakarta.persistence.criteria.Predicate;
import org.springframework.data.jpa.domain.Specification;

import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.UUID;

public final class DocumentSpecifications {
    private DocumentSpecifications() {
    }

    public static Specification<Document> inSystem() {
        return (root, query, cb) -> cb.equal(root.get("scope"), DocumentScope.SYSTEM);
    }

    public static Specification<Document> inClub(UUID clubId) {
        return (root, query, cb) -> cb.equal(root.get("club").get("id"), clubId);
    }

    public static Specification<Document> inDepartment(UUID departmentId) {
        return (root, query, cb) -> departmentId == null ? null : cb.equal(root.get("department").get("id"), departmentId);
    }

    public static Specification<Document> withVisibility(DocumentVisibility visibility) {
        return (root, query, cb) -> visibility == null ? null : cb.equal(root.get("visibility"), visibility);
    }

    public static Specification<Document> visibleInSystem(boolean canSeeOfficerDocs) {
        return (root, query, cb) -> canSeeOfficerDocs
                ? null
                : cb.equal(root.get("visibility"), DocumentVisibility.PUBLIC_INTERNAL);
    }

    public static Specification<Document> visibleInClub(boolean isClubOfficer, Set<UUID> allowedDepartmentIds) {
        return (root, query, cb) -> {
            if (isClubOfficer) return null;
            List<Predicate> allowed = new ArrayList<>();
            allowed.add(cb.and(
                    cb.equal(root.get("scope"), DocumentScope.CLUB),
                    cb.equal(root.get("visibility"), DocumentVisibility.MEMBERS)
            ));
            if (allowedDepartmentIds != null && !allowedDepartmentIds.isEmpty()) {
                allowed.add(cb.and(
                        cb.equal(root.get("scope"), DocumentScope.DEPARTMENT),
                        root.get("department").get("id").in(allowedDepartmentIds)
                ));
            }
            return cb.or(allowed.toArray(Predicate[]::new));
        };
    }

    public static Specification<Document> deleted(boolean deleted) {
        return (root, query, cb) -> cb.equal(root.get("deleted"), deleted);
    }

    public static Specification<Document> nameContains(String text) {
        return (root, query, cb) -> {
            if (text == null || text.isBlank()) return null;
            String escaped = text.strip().toLowerCase(Locale.ROOT)
                    .replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_");
            return cb.like(cb.lower(root.get("name")), "%" + escaped + "%", '\\');
        };
    }

    public static Specification<Document> appDetailKey(String key) {
        return (root, query, cb) -> key == null ? null : cb.equal(root.get("appDetailKey"), key);
    }
}
