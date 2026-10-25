package com.vju.club.error;

import org.junit.jupiter.api.Test;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.ProblemDetail;

import static org.assertj.core.api.Assertions.assertThat;

class GlobalExceptionHandlerTest {
    @Test
    void pendingApplicationUniqueConstraintMapsToPendingConflict() {
        GlobalExceptionHandler handler = new GlobalExceptionHandler();
        DataIntegrityViolationException exception = new DataIntegrityViolationException(
                "duplicate key value violates unique constraint uq_club_applications_pending");

        var response = handler.handleDataIntegrity(exception);

        ProblemDetail body = response.getBody();
        assertThat(response.getStatusCode().value()).isEqualTo(409);
        assertThat(body).isNotNull();
        assertThat(body.getProperties()).containsEntry("code", "APPLICATION_ALREADY_PENDING");
    }
}
