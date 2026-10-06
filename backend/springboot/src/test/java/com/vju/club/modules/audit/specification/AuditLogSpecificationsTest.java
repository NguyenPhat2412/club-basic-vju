package com.vju.club.modules.audit.specification;

import com.vju.club.modules.audit.entity.AuditLog;
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

class AuditLogSpecificationsTest {

    @SuppressWarnings("unchecked")
    private final Root<AuditLog> root = mock(Root.class);
    private final CriteriaQuery<?> query = mock(CriteriaQuery.class);
    private final CriteriaBuilder cb = mock(CriteriaBuilder.class);

    @Test
    void nullFiltersProduceNoPredicate() {
        assertThat(AuditLogSpecifications.hasResourceType(null).toPredicate(root, query, cb)).isNull();
        assertThat(AuditLogSpecifications.hasResourceId(null).toPredicate(root, query, cb)).isNull();
        assertThat(AuditLogSpecifications.hasActorUserId(null).toPredicate(root, query, cb)).isNull();
        assertThat(AuditLogSpecifications.hasClubId(null).toPredicate(root, query, cb)).isNull();
        assertThat(AuditLogSpecifications.hasAction(null).toPredicate(root, query, cb)).isNull();
    }

    @Test
    void hasActionBuildsEqualPredicate() {
        @SuppressWarnings("unchecked")
        Path<String> actionPath = mock(Path.class);
        when(root.<String>get("action")).thenReturn(actionPath);
        Predicate predicate = mock(Predicate.class);
        when(cb.equal(actionPath, "CLUB_CREATED")).thenReturn(predicate);

        Specification<AuditLog> spec = AuditLogSpecifications.hasAction("CLUB_CREATED");
        Predicate result = spec.toPredicate(root, query, cb);

        assertThat(result).isSameAs(predicate);
    }
}
