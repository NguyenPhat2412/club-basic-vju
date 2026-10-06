package com.vju.club.repository;

import org.junit.jupiter.api.Test;
import org.springframework.data.jpa.repository.Query;

import static org.assertj.core.api.Assertions.assertThat;

class ClubRepositoryQueryTest {

    @Test
    void discoverableCountTreatsEmptyCategoryAsNoFilter() throws NoSuchMethodException {
        Query query = ClubRepository.class
                .getMethod("countDiscoverable", String.class, String.class)
                .getAnnotation(Query.class);

        assertThat(query.value()).contains(":category = ''");
    }
}
