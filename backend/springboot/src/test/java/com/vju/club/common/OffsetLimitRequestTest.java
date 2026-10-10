package com.vju.club.common;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class OffsetLimitRequestTest {
    @Test
    void keepsArbitraryOffsetsThatAreNotPageAligned() {
        OffsetLimitRequest request = new OffsetLimitRequest(3, 2);
        assertThat(request.getOffset()).isEqualTo(3);
        assertThat(request.getPageSize()).isEqualTo(2);
        assertThat(request.getPageNumber()).isEqualTo(1);
        assertThat(request.getSort().isUnsorted()).isTrue();
    }

    @Test
    void navigatesByLimitAndNeverBeforeZero() {
        OffsetLimitRequest request = new OffsetLimitRequest(3, 2);
        assertThat(request.next().getOffset()).isEqualTo(5);
        assertThat(request.previousOrFirst().getOffset()).isEqualTo(1);
        assertThat(new OffsetLimitRequest(1, 5).previousOrFirst().getOffset()).isZero();
        assertThat(request.first().getOffset()).isZero();
        assertThat(request.withPage(4).getOffset()).isEqualTo(8);
        assertThat(request.hasPrevious()).isTrue();
        assertThat(new OffsetLimitRequest(0, 5).hasPrevious()).isFalse();
    }

    @Test
    void rejectsInvalidBounds() {
        assertThatThrownBy(() -> new OffsetLimitRequest(-1, 5)).isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> new OffsetLimitRequest(0, 0)).isInstanceOf(IllegalArgumentException.class);
    }
}
