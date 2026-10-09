package com.vju.club.modules.membership.specification;

import com.vju.club.modules.membership.entity.Membership;
import com.vju.club.modules.membership.enums.MembershipStatus;
import jakarta.persistence.criteria.CriteriaBuilder;
import jakarta.persistence.criteria.CriteriaQuery;
import jakarta.persistence.criteria.Path;
import jakarta.persistence.criteria.Predicate;
import jakarta.persistence.criteria.Root;
import org.junit.jupiter.api.Test;
import org.springframework.data.jpa.domain.Specification;

import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class MembershipSpecificationsTest {

    @SuppressWarnings("unchecked")
    private final Root<Membership> root = mock(Root.class);
    private final CriteriaQuery<?> query = mock(CriteriaQuery.class);
    private final CriteriaBuilder cb = mock(CriteriaBuilder.class);

    @Test
    void nullFiltersProduceNoPredicate() {
        assertThat(MembershipSpecifications.hasClubId(null).toPredicate(root, query, cb)).isNull();
        assertThat(MembershipSpecifications.hasUserId(null).toPredicate(root, query, cb)).isNull();
        assertThat(MembershipSpecifications.hasStatus(null).toPredicate(root, query, cb)).isNull();
        assertThat(MembershipSpecifications.inDepartment(null).toPredicate(root, query, cb)).isNull();
        assertThat(MembershipSpecifications.userKeyword(null).toPredicate(root, query, cb)).isNull();
        assertThat(MembershipSpecifications.userKeyword("   ").toPredicate(root, query, cb)).isNull();
    }

    @Test
    void hasStatusBuildsEqualPredicate() {
        @SuppressWarnings("unchecked")
        Path<MembershipStatus> statusPath = mock(Path.class);
        when(root.<MembershipStatus>get("status")).thenReturn(statusPath);
        Predicate predicate = mock(Predicate.class);
        when(cb.equal(statusPath, MembershipStatus.ACTIVE)).thenReturn(predicate);

        Specification<Membership> spec = MembershipSpecifications.hasStatus(MembershipStatus.ACTIVE);
        Predicate result = spec.toPredicate(root, query, cb);

        assertThat(result).isSameAs(predicate);
    }
}
