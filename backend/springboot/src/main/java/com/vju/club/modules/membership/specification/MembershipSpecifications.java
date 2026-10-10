package com.vju.club.modules.membership.specification;

import com.vju.club.modules.departmentmember.entity.DepartmentMember;
import com.vju.club.modules.membership.entity.Membership;
import com.vju.club.modules.membership.enums.MembershipStatus;
import com.vju.club.modules.user.entity.User;
import jakarta.persistence.criteria.Join;
import jakarta.persistence.criteria.JoinType;
import jakarta.persistence.criteria.Root;
import jakarta.persistence.criteria.Subquery;
import org.springframework.data.jpa.domain.Specification;

import java.util.Locale;
import java.util.UUID;

public final class MembershipSpecifications {
    private MembershipSpecifications() {}

    public static Specification<Membership> hasClubId(UUID clubId) {
        return (root, query, cb) -> clubId == null ? null : cb.equal(root.get("club").get("id"), clubId);
    }

    public static Specification<Membership> hasUserId(UUID userId) {
        return (root, query, cb) -> userId == null ? null : cb.equal(root.get("user").get("id"), userId);
    }

    public static Specification<Membership> hasStatus(MembershipStatus status) {
        return (root, query, cb) -> status == null ? null : cb.equal(root.get("status"), status);
    }

    public static Specification<Membership> inDepartment(UUID departmentId) {
        return (root, query, cb) -> {
            if (departmentId == null) {
                return null;
            }
            Subquery<UUID> subquery = query.subquery(UUID.class);
            Root<DepartmentMember> dm = subquery.from(DepartmentMember.class);
            subquery.select(dm.get("membership").get("id"))
                    .where(cb.equal(dm.get("department").get("id"), departmentId));
            return root.get("id").in(subquery);
        };
    }

    public static Specification<Membership> userKeyword(String search) {
        return (root, query, cb) -> {
            if (search == null || search.isBlank()) {
                return null;
            }
            String pattern = "%" + search.trim().toLowerCase(Locale.ROOT) + "%";
            Join<Membership, User> userJoin = root.join("user", JoinType.INNER);
            return cb.or(
                    cb.like(cb.lower(userJoin.get("email")), pattern),
                    cb.like(cb.lower(userJoin.get("fullName")), pattern),
                    cb.like(cb.lower(cb.coalesce(userJoin.get("studentCode"), "")), pattern)
            );
        };
    }
}
