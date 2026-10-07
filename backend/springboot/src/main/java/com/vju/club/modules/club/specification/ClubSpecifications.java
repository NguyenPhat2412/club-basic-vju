package com.vju.club.modules.club.specification;

import com.vju.club.modules.club.entity.Club;
import com.vju.club.modules.club.entity.ClubStatus;
import org.springframework.data.jpa.domain.Specification;

import java.util.Collection;
import java.util.Locale;
import java.util.UUID;

public final class ClubSpecifications {

    private ClubSpecifications() {}

    public static Specification<Club> hasKeyword(String keyword) {
        return (root, query, cb) -> {
            if (keyword == null || keyword.isBlank()) {
                return null;
            }
            String pattern = "%" + keyword.trim().toLowerCase(Locale.ROOT) + "%";
            return cb.or(
                    cb.like(cb.lower(root.get("name")), pattern),
                    cb.like(cb.lower(root.get("code")), pattern)
            );
        };
    }

    public static Specification<Club> hasCategory(String category) {
        return (root, query, cb) -> {
            if (category == null || category.isBlank()) {
                return null;
            }
            return cb.equal(cb.lower(root.get("activityField")), category.trim().toLowerCase(Locale.ROOT));
        };
    }

    public static Specification<Club> hasStatus(ClubStatus status) {
        return (root, query, cb) -> {
            if (status == null) {
                return null;
            }
            return cb.equal(root.get("status"), status);
        };
    }

    public static Specification<Club> isDiscoverable() {
        return hasStatus(ClubStatus.ACTIVE);
    }

    public static Specification<Club> idIn(Collection<UUID> ids) {
        return (root, query, cb) -> {
            if (ids == null || ids.isEmpty()) {
                return cb.disjunction();
            }
            return root.get("id").in(ids);
        };
    }
}
