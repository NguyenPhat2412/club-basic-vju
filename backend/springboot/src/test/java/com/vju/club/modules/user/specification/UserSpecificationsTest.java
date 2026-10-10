package com.vju.club.modules.user.specification;

import com.vju.club.modules.user.entity.User;
import jakarta.persistence.criteria.CriteriaBuilder;
import jakarta.persistence.criteria.CriteriaQuery;
import jakarta.persistence.criteria.Path;
import jakarta.persistence.criteria.Predicate;
import jakarta.persistence.criteria.Root;
import org.junit.jupiter.api.Test;
import org.springframework.data.jpa.domain.Specification;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class UserSpecificationsTest {
    @SuppressWarnings("unchecked")
    private final Root<User> root = mock(Root.class);
    private final CriteriaQuery<?> query = mock(CriteriaQuery.class);
    private final CriteriaBuilder cb = mock(CriteriaBuilder.class);

    @Test
    void emptyOrNullKeywordProducesNoPredicate() {
        Specification<User> emptySpec = UserSpecifications.hasKeyword("");
        assertThat(emptySpec.toPredicate(root, query, cb)).isNull();

        Specification<User> blankSpec = UserSpecifications.hasKeyword("   ");
        assertThat(blankSpec.toPredicate(root, query, cb)).isNull();

        Specification<User> nullSpec = UserSpecifications.hasKeyword(null);
        assertThat(nullSpec.toPredicate(root, query, cb)).isNull();
    }

    @Test
    void keywordProducesOrPredicateAcrossFields() {
        @SuppressWarnings("unchecked")
        Path<String> emailPath = mock(Path.class);
        @SuppressWarnings("unchecked")
        Path<String> fullNamePath = mock(Path.class);
        @SuppressWarnings("unchecked")
        Path<String> studentCodePath = mock(Path.class);

        when(root.<String>get("email")).thenReturn(emailPath);
        when(root.<String>get("fullName")).thenReturn(fullNamePath);
        when(root.<String>get("studentCode")).thenReturn(studentCodePath);

        when(cb.lower(emailPath)).thenReturn(emailPath);
        when(cb.lower(fullNamePath)).thenReturn(fullNamePath);
        when(cb.coalesce(studentCodePath, "")).thenReturn(studentCodePath);
        when(cb.lower(studentCodePath)).thenReturn(studentCodePath);

        Predicate p1 = mock(Predicate.class);
        Predicate p2 = mock(Predicate.class);
        Predicate p3 = mock(Predicate.class);
        Predicate orPredicate = mock(Predicate.class);

        when(cb.like(emailPath, "%john%")).thenReturn(p1);
        when(cb.like(fullNamePath, "%john%")).thenReturn(p2);
        when(cb.like(studentCodePath, "%john%")).thenReturn(p3);
        when(cb.or(p1, p2, p3)).thenReturn(orPredicate);

        Specification<User> spec = UserSpecifications.hasKeyword("john");
        Predicate result = spec.toPredicate(root, query, cb);

        assertThat(result).isSameAs(orPredicate);
    }
}
