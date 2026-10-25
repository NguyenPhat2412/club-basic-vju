package com.vju.club.modules.clubapplication.specification;

import com.vju.club.modules.clubapplication.entity.ClubApplication;
import com.vju.club.modules.clubapplication.enums.ClubApplicationStatus;
import com.vju.club.modules.user.entity.User;
import jakarta.persistence.criteria.Join;
import jakarta.persistence.criteria.JoinType;
import org.springframework.data.jpa.domain.Specification;

import java.time.OffsetDateTime;
import java.util.Locale;
import java.util.UUID;

public final class ClubApplicationSpecifications {
    private ClubApplicationSpecifications() {}

    public static Specification<ClubApplication> forApplicant(UUID applicantId) {
        return (root, query, cb) -> applicantId == null ? null : cb.equal(root.get("applicant").get("id"), applicantId);
    }

    public static Specification<ClubApplication> forClub(UUID clubId) {
        return (root, query, cb) -> clubId == null ? null : cb.equal(root.get("club").get("id"), clubId);
    }

    public static Specification<ClubApplication> hasStatus(ClubApplicationStatus status) {
        return (root, query, cb) -> status == null ? null : cb.equal(root.get("status"), status);
    }

    public static Specification<ClubApplication> createdBetween(OffsetDateTime from, OffsetDateTime to) {
        return (root, query, cb) -> {
            if (from == null && to == null) {
                return null;
            }
            if (from != null && to != null) {
                return cb.and(
                        cb.greaterThanOrEqualTo(root.get("createdAt"), from),
                        cb.lessThan(root.get("createdAt"), to)
                );
            }
            if (from != null) {
                return cb.greaterThanOrEqualTo(root.get("createdAt"), from);
            }
            return cb.lessThan(root.get("createdAt"), to);
        };
    }

    public static Specification<ClubApplication> applicantKeyword(String search) {
        return (root, query, cb) -> {
            if (search == null || search.isBlank()) {
                return null;
            }
            String pattern = "%" + search.trim().toLowerCase(Locale.ROOT) + "%";
            Join<ClubApplication, User> applicantJoin = root.join("applicant", JoinType.INNER);
            return cb.or(
                    cb.like(cb.lower(applicantJoin.get("email")), pattern),
                    cb.like(cb.lower(applicantJoin.get("fullName")), pattern),
                    cb.like(cb.lower(cb.coalesce(applicantJoin.get("studentCode"), "")), pattern)
            );
        };
    }
}
