package com.vju.club.repository;

import com.vju.club.modules.club.entity.Club;
import com.vju.club.modules.club.entity.ClubStatus;
import com.vju.club.modules.club.specification.ClubSpecifications;
import jakarta.persistence.criteria.CriteriaBuilder;
import jakarta.persistence.criteria.CriteriaQuery;
import jakarta.persistence.criteria.Path;
import jakarta.persistence.criteria.Predicate;
import jakarta.persistence.criteria.Root;
import org.junit.jupiter.api.Test;
import org.springframework.data.jpa.domain.Specification;

import java.util.Collections;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class ClubSpecificationsTest {

    @SuppressWarnings("unchecked")
    private final Root<Club> root = mock(Root.class);
    private final CriteriaQuery<?> query = mock(CriteriaQuery.class);
    private final CriteriaBuilder cb = mock(CriteriaBuilder.class);

    @Test
    void categorySpecificationTreatsEmptyOrNullCategoryAsNoFilter() {
        Specification<Club> emptySpec = ClubSpecifications.hasCategory("");
        assertThat(emptySpec.toPredicate(root, query, cb)).isNull();

        Specification<Club> blankSpec = ClubSpecifications.hasCategory("   ");
        assertThat(blankSpec.toPredicate(root, query, cb)).isNull();

        Specification<Club> nullSpec = ClubSpecifications.hasCategory(null);
        assertThat(nullSpec.toPredicate(root, query, cb)).isNull();
    }

    @Test
    void categorySpecificationBuildsCaseInsensitiveEqual() {
        @SuppressWarnings("unchecked")
        Path<String> activityFieldPath = mock(Path.class);
        when(root.<String>get("activityField")).thenReturn(activityFieldPath);
        when(cb.lower(activityFieldPath)).thenReturn(activityFieldPath);
        Predicate predicate = mock(Predicate.class);
        when(cb.equal(activityFieldPath, "arts")).thenReturn(predicate);

        Specification<Club> spec = ClubSpecifications.hasCategory(" Arts ");
        Predicate result = spec.toPredicate(root, query, cb);

        assertThat(result).isSameAs(predicate);
    }

    @Test
    void isDiscoverableFiltersForActiveStatus() {
        @SuppressWarnings("unchecked")
        Path<ClubStatus> statusPath = mock(Path.class);
        when(root.<ClubStatus>get("status")).thenReturn(statusPath);
        Predicate predicate = mock(Predicate.class);
        when(cb.equal(statusPath, ClubStatus.ACTIVE)).thenReturn(predicate);

        Specification<Club> spec = ClubSpecifications.isDiscoverable();
        Predicate result = spec.toPredicate(root, query, cb);

        assertThat(result).isSameAs(predicate);
    }

    @Test
    void idInReturnsDisjunctionWhenIdsEmpty() {
        Predicate disjunction = mock(Predicate.class);
        when(cb.disjunction()).thenReturn(disjunction);

        Specification<Club> spec = ClubSpecifications.idIn(Collections.emptyList());
        Predicate result = spec.toPredicate(root, query, cb);

        assertThat(result).isSameAs(disjunction);
    }
}
