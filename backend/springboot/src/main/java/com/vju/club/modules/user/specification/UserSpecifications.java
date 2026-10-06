package com.vju.club.modules.user.specification;

import com.vju.club.modules.user.entity.User;
import org.springframework.data.jpa.domain.Specification;

import java.util.Locale;

public final class UserSpecifications {

    private UserSpecifications() {}

    public static Specification<User> hasKeyword(String query) {
        return (root, criteriaQuery, cb) -> {
            if (query == null || query.isBlank()) {
                return null;
            }
            String pattern = "%" + query.trim().toLowerCase(Locale.ROOT) + "%";
            return cb.or(
                    cb.like(cb.lower(root.get("email")), pattern),
                    cb.like(cb.lower(root.get("fullName")), pattern),
                    cb.like(cb.lower(cb.coalesce(root.get("studentCode"), "")), pattern)
            );
        };
    }
}
