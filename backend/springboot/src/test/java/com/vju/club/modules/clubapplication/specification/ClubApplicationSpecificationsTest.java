package com.vju.club.modules.clubapplication.specification;

import com.vju.club.modules.clubapplication.entity.ClubApplication;
import com.vju.club.modules.clubapplication.entity.ClubApplicationStatus;
import jakarta.persistence.criteria.CriteriaBuilder;
import jakarta.persistence.criteria.CriteriaQuery;
import jakarta.persistence.criteria.Path;
import jakarta.persistence.criteria.Predicate;
import jakarta.persistence.criteria.Root;
import org.junit.jupiter.api.Test;
import org.springframework.data.jpa.domain.Specification;

import java.time.OffsetDateTime;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class ClubApplicationSpecificationsTest {

    @SuppressWarnings("unchecked")
    private final Root<ClubApplication> root = mock(Root.class);
    private final CriteriaQuery<?> query = mock(CriteriaQuery.class);
    private final CriteriaBuilder cb = mock(CriteriaBuilder.class);

    @Test
    void nullFiltersProduceNoPredicate() {
        assertThat(ClubApplicationSpecifications.forApplicant(null).toPredicate(root, query, cb)).isNull();
        assertThat(ClubApplicationSpecifications.forClub(null).toPredicate(root, query, cb)).isNull();
        assertThat(ClubApplicationSpecifications.hasStatus(null).toPredicate(root, query, cb)).isNull();
        assertThat(ClubApplicationSpecifications.createdBetween(null, null).toPredicate(root, query, cb)).isNull();
        assertThat(ClubApplicationSpecifications.applicantKeyword(null).toPredicate(root, query, cb)).isNull();
        assertThat(ClubApplicationSpecifications.applicantKeyword("   ").toPredicate(root, query, cb)).isNull();
    }

    @Test
    void hasStatusBuildsEqualPredicate() {
        @SuppressWarnings("unchecked")
        Path<ClubApplicationStatus> statusPath = mock(Path.class);
        when(root.<ClubApplicationStatus>get("status")).thenReturn(statusPath);
        Predicate predicate = mock(Predicate.class);
        when(cb.equal(statusPath, ClubApplicationStatus.APPROVED)).thenReturn(predicate);

        Specification<ClubApplication> spec = ClubApplicationSpecifications.hasStatus(ClubApplicationStatus.APPROVED);
        Predicate result = spec.toPredicate(root, query, cb);

        assertThat(result).isSameAs(predicate);
    }
}
